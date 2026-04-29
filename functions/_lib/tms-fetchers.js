import {
  DEFAULT_NEWS_LIMIT,
  DEFAULT_STUDY_LIMIT,
  NEWS_SEARCH_TERMS,
  STUDY_SEARCH_TERMS,
} from "./tms-config.js";
import {
  buildSourceUrl,
  dedupeByKeys,
  inferConditionCategory,
  inferTags,
  isoNow,
  normalizeWhitespace,
  slugKey,
} from "./tms-utils.js";

const PUBMED_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
const EUROPE_PMC_BASE = "https://www.ebi.ac.uk/europepmc/webservices/rest/search";

export async function fetchStudyCandidates(env) {
  // We aggregate from both PubMed and Europe PMC, then dedupe aggressively so the hub
  // can show the broadest set of recent TMS studies without double-counting records.
  const [pubmedRecords, europePmcRecords] = await Promise.all([
    fetchPubMedStudies(env),
    fetchEuropePmcStudies(),
  ]);

  return dedupeStudies([...pubmedRecords, ...europePmcRecords]).slice(0, DEFAULT_STUDY_LIMIT);
}

export async function fetchNewsCandidates(env) {
  const providers = [];

  if (env.NEWS_API_KEY) {
    providers.push(fetchNewsApiStories(env.NEWS_API_KEY));
  }

  providers.push(fetchGoogleNewsRssStories());

  const settled = await Promise.allSettled(providers);
  const items = settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));

  return dedupeNews(items).slice(0, DEFAULT_NEWS_LIMIT);
}

async function fetchPubMedStudies(env) {
  const ids = new Set();

  await Promise.all(
    STUDY_SEARCH_TERMS.map(async (term) => {
      const searchUrl = new URL(`${PUBMED_BASE}/esearch.fcgi`);
      searchUrl.searchParams.set("db", "pubmed");
      searchUrl.searchParams.set("retmode", "json");
      searchUrl.searchParams.set("retmax", "8");
      searchUrl.searchParams.set("sort", "pub date");
      searchUrl.searchParams.set("term", term);
      if (env.NCBI_API_KEY) {
        searchUrl.searchParams.set("api_key", env.NCBI_API_KEY);
      }

      const response = await fetch(searchUrl.toString());
      const payload = await response.json();
      const idList = payload?.esearchresult?.idlist || [];
      idList.forEach((id) => ids.add(id));
    })
  );

  if (!ids.size) {
    return [];
  }

  const summaryUrl = new URL(`${PUBMED_BASE}/esummary.fcgi`);
  summaryUrl.searchParams.set("db", "pubmed");
  summaryUrl.searchParams.set("retmode", "json");
  summaryUrl.searchParams.set("id", Array.from(ids).join(","));
  if (env.NCBI_API_KEY) {
    summaryUrl.searchParams.set("api_key", env.NCBI_API_KEY);
  }

  const response = await fetch(summaryUrl.toString());
  const payload = await response.json();
  const records = payload?.result || {};
  const now = isoNow();

  return Object.keys(records)
    .filter((key) => key !== "uids")
    .map((key) => {
      const item = records[key];
      const title = normalizeWhitespace(item.title);
      const abstract = normalizeWhitespace(item.elocationid || "");
      const authors = (item.authors || []).map((author) => author.name).filter(Boolean);
      const doiCandidate = (item.articleids || []).find((articleId) => articleId.idtype === "doi");
      const pmcidCandidate = (item.articleids || []).find((articleId) => articleId.idtype === "pmc");
      const tags = inferTags({ title, abstract, source: "PubMed", journal: item.fulljournalname });

      return {
        title,
        authors,
        abstract: abstract || "PubMed summary available via source link.",
        journal: normalizeWhitespace(item.fulljournalname || item.source || "PubMed"),
        publication_date: normalizeWhitespace(item.pubdate || ""),
        doi: doiCandidate?.value || "",
        pmid: item.uid || "",
        pmcid: pmcidCandidate?.value || "",
        source: "PubMed",
        source_url: buildSourceUrl({
          doi: doiCandidate?.value || "",
          pmid: item.uid || "",
          pmcid: pmcidCandidate?.value || "",
        }),
        tags,
        condition_category: inferConditionCategory(tags),
        date_added: now,
        last_refreshed: now,
      };
    });
}

async function fetchEuropePmcStudies() {
  const queries = STUDY_SEARCH_TERMS.map((term) => `"${term}"`).join(" OR ");
  const searchUrl = new URL(EUROPE_PMC_BASE);
  searchUrl.searchParams.set("query", queries);
  searchUrl.searchParams.set("format", "json");
  searchUrl.searchParams.set("resultType", "core");
  searchUrl.searchParams.set("pageSize", "60");
  searchUrl.searchParams.set("sort", "FIRST_PDATE_D desc");

  const response = await fetch(searchUrl.toString());
  const payload = await response.json();
  const results = payload?.resultList?.result || [];
  const now = isoNow();

  return results.map((item) => {
    const title = normalizeWhitespace(item.title);
    const abstract = normalizeWhitespace(item.abstractText || item.snippet || "");
    const authors = normalizeWhitespace(item.authorString || "")
      .split(",")
      .map((name) => normalizeWhitespace(name))
      .filter(Boolean);
    const tags = inferTags({ title, abstract, source: "Europe PMC", journal: item.journalTitle });

    return {
      title,
      authors,
      abstract: abstract || "Abstract available through the source link when provided.",
      journal: normalizeWhitespace(item.journalTitle || item.journalInfo?.journal?.title || "Europe PMC"),
      publication_date: normalizeWhitespace(item.firstPublicationDate || item.pubYear || ""),
      doi: normalizeWhitespace(item.doi || ""),
      pmid: normalizeWhitespace(item.pmid || ""),
      pmcid: normalizeWhitespace(item.pmcid || ""),
      source: "Europe PMC",
      source_url: buildSourceUrl({
        doi: item.doi || "",
        pmid: item.pmid || "",
        pmcid: item.pmcid || "",
        url: item.fullTextUrlList?.fullTextUrl?.[0]?.url || "",
      }),
      tags,
      condition_category: inferConditionCategory(tags),
      date_added: now,
      last_refreshed: now,
    };
  });
}

async function fetchNewsApiStories(apiKey) {
  const now = isoNow();
  const articles = [];
  const selectedTerms = NEWS_SEARCH_TERMS.slice(0, 5);

  await Promise.all(
    selectedTerms.map(async (term) => {
      const url = new URL("https://newsapi.org/v2/everything");
      url.searchParams.set("q", term);
      url.searchParams.set("language", "en");
      url.searchParams.set("sortBy", "publishedAt");
      url.searchParams.set("pageSize", "12");

      const response = await fetch(url.toString(), {
        headers: { "X-Api-Key": apiKey },
      });
      const payload = await response.json();
      const items = payload?.articles || [];

      items.forEach((article) => {
        const summary = normalizeWhitespace(article.description || article.content || "");
        const tags = inferTags({
          title: article.title,
          summary,
          source: article.source?.name,
        });

        articles.push({
          title: normalizeWhitespace(article.title),
          source: normalizeWhitespace(article.source?.name || "NewsAPI"),
          author: normalizeWhitespace(article.author || ""),
          summary: summary || "Summary available through the linked source.",
          published_date: normalizeWhitespace(article.publishedAt || ""),
          url: article.url || "",
          image_url: article.urlToImage || "",
          tags,
          condition_category: inferConditionCategory(tags),
          date_added: now,
          last_refreshed: now,
        });
      });
    })
  );

  return articles;
}

async function fetchGoogleNewsRssStories() {
  const now = isoNow();
  const articles = [];

  await Promise.all(
    NEWS_SEARCH_TERMS.slice(0, 4).map(async (term) => {
      // RSS provides a no-key fallback when a commercial news API is unavailable.
      const url = new URL("https://news.google.com/rss/search");
      url.searchParams.set("q", `"${term}"`);
      url.searchParams.set("hl", "en-US");
      url.searchParams.set("gl", "US");
      url.searchParams.set("ceid", "US:en");

      const response = await fetch(url.toString());
      const xml = await response.text();
      const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];

      items.slice(0, 10).forEach((itemXml) => {
        const title = decodeXml(extractXmlValue(itemXml, "title"));
        const link = decodeXml(extractXmlValue(itemXml, "link"));
        const pubDate = decodeXml(extractXmlValue(itemXml, "pubDate"));
        const description = stripHtml(decodeXml(extractXmlValue(itemXml, "description")));
        const source = decodeXml(extractXmlValue(itemXml, "source")) || "Google News RSS";
        const tags = inferTags({ title, summary: description, source });

        articles.push({
          title: normalizeWhitespace(title),
          source: normalizeWhitespace(source),
          author: "",
          summary: normalizeWhitespace(description) || "Open the source for the full story.",
          published_date: normalizeWhitespace(pubDate),
          url: link,
          image_url: "",
          tags,
          condition_category: inferConditionCategory(tags),
          date_added: now,
          last_refreshed: now,
        });
      });
    })
  );

  return articles;
}

function dedupeStudies(records) {
  return dedupeByKeys(records, (record) => [
    record.doi ? `doi:${record.doi.toLowerCase()}` : "",
    record.pmid ? `pmid:${record.pmid}` : "",
    record.pmcid ? `pmcid:${record.pmcid}` : "",
    record.title ? `title:${slugKey(record.title)}` : "",
    record.source_url ? `url:${slugKey(record.source_url)}` : "",
  ]);
}

function dedupeNews(records) {
  return dedupeByKeys(records, (record) => [
    record.url ? `url:${slugKey(record.url)}` : "",
    record.title ? `title:${slugKey(record.title)}` : "",
  ]);
}

function extractXmlValue(xml, tagName) {
  const match = xml.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match ? match[1] : "";
}

function stripHtml(value) {
  return normalizeWhitespace(value.replace(/<[^>]*>/g, " "));
}

function decodeXml(value) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}
