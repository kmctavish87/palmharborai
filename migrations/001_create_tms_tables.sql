CREATE TABLE IF NOT EXISTS tms_studies (
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
);

CREATE TABLE IF NOT EXISTS tms_news_articles (
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
);

CREATE TABLE IF NOT EXISTS tms_refresh_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  status TEXT NOT NULL,
  message TEXT,
  studies_added INTEGER DEFAULT 0,
  studies_updated INTEGER DEFAULT 0,
  news_added INTEGER DEFAULT 0,
  news_updated INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tms_studies_pubdate
  ON tms_studies(publication_date);

CREATE INDEX IF NOT EXISTS idx_tms_news_pubdate
  ON tms_news_articles(published_date);
