import { parseJsonArray, slugKey } from "./tms-utils.js";

export async function ensureTmsSchema(env) {
  const statements = [
    `CREATE TABLE IF NOT EXISTS tms_studies (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      authors TEXT,
      abstract TEXT,
      journal TEXT,
      publication_date TEXT,
      doi TEXT,
      pmid TEXT,
      pmcid TEXT,
      source TEXT,
      source_url TEXT,
      tags TEXT,
      condition_category TEXT,
      date_added TEXT NOT NULL,
      last_refreshed TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS tms_news_articles (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      source TEXT,
      author TEXT,
      summary TEXT,
      published_date TEXT,
      url TEXT,
      image_url TEXT,
      tags TEXT,
      condition_category TEXT,
      date_added TEXT NOT NULL,
      last_refreshed TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS tms_refresh_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      status TEXT NOT NULL,
      message TEXT,
      studies_added INTEGER DEFAULT 0,
      studies_updated INTEGER DEFAULT 0,
      news_added INTEGER DEFAULT 0,
      news_updated INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_tms_studies_pubdate ON tms_studies(publication_date)`,
    `CREATE INDEX IF NOT EXISTS idx_tms_news_pubdate ON tms_news_articles(published_date)`,
  ];

  for (const sql of statements) {
    await env.TMS_DB.prepare(sql).run();
  }
}

export async function upsertStudies(env, studies) {
  let added = 0;
  let updated = 0;

  for (const study of studies) {
    // We check DOI, PMID, title, and source URL so refreshes update existing rows
    // instead of growing duplicates whenever the same paper appears from both APIs.
    const id = study.id || buildStudyId(study);
    const existing = await findExistingStudy(env, study);

    if (existing) {
      await env.TMS_DB.prepare(
        `UPDATE tms_studies
         SET id = ?, title = ?, authors = ?, abstract = ?, journal = ?, publication_date = ?,
             doi = ?, pmid = ?, pmcid = ?, source = ?, source_url = ?, tags = ?,
             condition_category = ?, last_refreshed = ?
         WHERE id = ?`
      )
        .bind(
          existing.id,
          study.title,
          JSON.stringify(study.authors || []),
          study.abstract || "",
          study.journal || "",
          study.publication_date || "",
          study.doi || "",
          study.pmid || "",
          study.pmcid || "",
          study.source || "",
          study.source_url || "",
          JSON.stringify(study.tags || []),
          study.condition_category || "",
          study.last_refreshed,
          existing.id
        )
        .run();
      updated += 1;
      continue;
    }

    await env.TMS_DB.prepare(
      `INSERT INTO tms_studies
       (id, title, authors, abstract, journal, publication_date, doi, pmid, pmcid, source, source_url, tags, condition_category, date_added, last_refreshed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        study.title,
        JSON.stringify(study.authors || []),
        study.abstract || "",
        study.journal || "",
        study.publication_date || "",
        study.doi || "",
        study.pmid || "",
        study.pmcid || "",
        study.source || "",
        study.source_url || "",
        JSON.stringify(study.tags || []),
        study.condition_category || "",
        study.date_added,
        study.last_refreshed
      )
      .run();
    added += 1;
  }

  return { added, updated };
}

export async function upsertNews(env, articles) {
  let added = 0;
  let updated = 0;

  for (const article of articles) {
    const id = article.id || buildNewsId(article);
    const existing = await findExistingNews(env, article);

    if (existing) {
      await env.TMS_DB.prepare(
        `UPDATE tms_news_articles
         SET title = ?, source = ?, author = ?, summary = ?, published_date = ?, url = ?,
             image_url = ?, tags = ?, condition_category = ?, last_refreshed = ?
         WHERE id = ?`
      )
        .bind(
          article.title,
          article.source || "",
          article.author || "",
          article.summary || "",
          article.published_date || "",
          article.url || "",
          article.image_url || "",
          JSON.stringify(article.tags || []),
          article.condition_category || "",
          article.last_refreshed,
          existing.id
        )
        .run();
      updated += 1;
      continue;
    }

    await env.TMS_DB.prepare(
      `INSERT INTO tms_news_articles
       (id, title, source, author, summary, published_date, url, image_url, tags, condition_category, date_added, last_refreshed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        article.title,
        article.source || "",
        article.author || "",
        article.summary || "",
        article.published_date || "",
        article.url || "",
        article.image_url || "",
        JSON.stringify(article.tags || []),
        article.condition_category || "",
        article.date_added,
        article.last_refreshed
      )
      .run();
    added += 1;
  }

  return { added, updated };
}

export async function getHubData(env) {
  const [studiesRaw, newsRaw] = await Promise.all([
    env.TMS_DB.prepare(
      `SELECT * FROM tms_studies ORDER BY COALESCE(publication_date, date_added) DESC, date_added DESC`
    ).all(),
    env.TMS_DB.prepare(
      `SELECT * FROM tms_news_articles ORDER BY COALESCE(published_date, date_added) DESC, date_added DESC`
    ).all(),
  ]);

  const studies = (studiesRaw.results || []).map((row) => ({
    ...row,
    authors: parseJsonArray(row.authors),
    tags: parseJsonArray(row.tags),
  }));

  const news = (newsRaw.results || []).map((row) => ({
    ...row,
    tags: parseJsonArray(row.tags),
  }));

  return { studies, news };
}

export async function getLastRefreshInfo(env) {
  const log = await env.TMS_DB.prepare(
    `SELECT created_at, status, message FROM tms_refresh_logs ORDER BY created_at DESC LIMIT 1`
  ).first();

  return log || null;
}

export async function logRefresh(env, payload) {
  await env.TMS_DB.prepare(
    `INSERT INTO tms_refresh_logs
     (status, message, studies_added, studies_updated, news_added, news_updated, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      payload.status,
      payload.message || "",
      payload.studiesAdded || 0,
      payload.studiesUpdated || 0,
      payload.newsAdded || 0,
      payload.newsUpdated || 0,
      payload.createdAt
    )
    .run();
}

async function findExistingStudy(env, study) {
  const checks = [
    study.doi
      ? env.TMS_DB.prepare(`SELECT id FROM tms_studies WHERE lower(doi) = lower(?) LIMIT 1`).bind(study.doi)
      : null,
    study.pmid
      ? env.TMS_DB.prepare(`SELECT id FROM tms_studies WHERE pmid = ? LIMIT 1`).bind(study.pmid)
      : null,
    study.title
      ? env.TMS_DB.prepare(`SELECT id FROM tms_studies WHERE lower(title) = lower(?) LIMIT 1`).bind(study.title)
      : null,
    study.source_url
      ? env.TMS_DB.prepare(`SELECT id FROM tms_studies WHERE source_url = ? LIMIT 1`).bind(study.source_url)
      : null,
  ].filter(Boolean);

  for (const statement of checks) {
    const record = await statement.first();
    if (record) {
      return record;
    }
  }

  return null;
}

async function findExistingNews(env, article) {
  const checks = [
    article.url
      ? env.TMS_DB.prepare(`SELECT id FROM tms_news_articles WHERE url = ? LIMIT 1`).bind(article.url)
      : null,
    article.title
      ? env.TMS_DB.prepare(`SELECT id FROM tms_news_articles WHERE lower(title) = lower(?) LIMIT 1`).bind(article.title)
      : null,
  ].filter(Boolean);

  for (const statement of checks) {
    const record = await statement.first();
    if (record) {
      return record;
    }
  }

  return null;
}

export function buildStudyId(study) {
  if (study.pmid) {
    return `study-pmid-${study.pmid}`;
  }
  if (study.doi) {
    return `study-doi-${slugKey(study.doi)}`;
  }
  return `study-${slugKey(study.title)}`;
}

export function buildNewsId(article) {
  if (article.url) {
    return `news-${slugKey(article.url)}`;
  }
  return `news-${slugKey(article.title)}`;
}
