import { TAG_RULES } from "./tms-config.js";

export function normalizeWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function slugKey(value) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function dedupeByKeys(items, keyFactory) {
  const seen = new Set();
  const results = [];

  for (const item of items) {
    const keys = keyFactory(item).filter(Boolean);
    const match = keys.find((key) => seen.has(key));
    if (match) {
      continue;
    }

    keys.forEach((key) => seen.add(key));
    results.push(item);
  }

  return results;
}

export function inferTags(record) {
  const text = [
    record.title,
    record.abstract,
    record.summary,
    record.journal,
    record.source,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const tags = [];
  for (const rule of TAG_RULES) {
    if (rule.patterns.some((pattern) => text.includes(pattern.toLowerCase()))) {
      tags.push(rule.tag);
    }
  }

  if (text.includes("theta burst")) {
    tags.push("Theta burst stimulation");
  }

  if (text.includes("deep tms")) {
    tags.push("Deep TMS");
  }

  if (!tags.length) {
    tags.push("General TMS");
  }

  return Array.from(new Set(tags));
}

export function inferConditionCategory(tags) {
  const preferred = [
    "Treatment-resistant depression",
    "Depression",
    "Addiction",
    "Anxiety",
    "OCD",
    "PTSD",
    "Chronic pain",
    "Adolescents",
    "Veterans",
    "FDA/Regulatory",
    "Insurance",
    "Clinical trials",
  ];

  return preferred.find((tag) => tags.includes(tag)) || tags[0] || "General TMS";
}

export function isoNow() {
  return new Date().toISOString();
}

export function parseJsonArray(value) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function buildSourceUrl({ doi, pmid, pmcid, url }) {
  if (url) {
    return url;
  }

  if (doi) {
    return `https://doi.org/${encodeURIComponent(doi)}`;
  }

  if (pmid) {
    return `https://pubmed.ncbi.nlm.nih.gov/${encodeURIComponent(pmid)}/`;
  }

  if (pmcid) {
    return `https://pmc.ncbi.nlm.nih.gov/articles/${encodeURIComponent(pmcid)}/`;
  }

  return "";
}

export function toArray(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (!value) {
    return [];
  }

  return [value];
}
