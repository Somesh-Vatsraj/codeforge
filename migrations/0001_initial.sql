PRAGMA foreign_keys = ON;

-- ============ ADMIN (single account only) ============
CREATE TABLE IF NOT EXISTS admins (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE,
  email         TEXT,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============ CATEGORIES ============
CREATE TABLE IF NOT EXISTS categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL UNIQUE,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

-- ============ TAGS ============
CREATE TABLE IF NOT EXISTS tags (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL UNIQUE,
  slug       TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);

-- ============ POSTS ============
CREATE TABLE IF NOT EXISTS posts (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  title           TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  description     TEXT NOT NULL DEFAULT '',
  article_content TEXT NOT NULL DEFAULT '',
  thumbnail_url   TEXT,
  youtube_url     TEXT,
  category_id     INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  technologies    TEXT NOT NULL DEFAULT '[]',
  features        TEXT NOT NULL DEFAULT '[]',
  featured        INTEGER NOT NULL DEFAULT 0,
  trending        INTEGER NOT NULL DEFAULT 0,
  live_preview    INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'draft',
  seo_title       TEXT,
  seo_description TEXT,
  seo_keywords    TEXT,
  canonical_url   TEXT,
  author          TEXT,
  views           INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  published_at    TEXT
);
CREATE INDEX IF NOT EXISTS idx_posts_slug       ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_status     ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_category   ON posts(category_id);
CREATE INDEX IF NOT EXISTS idx_posts_created    ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_views      ON posts(views DESC);
CREATE INDEX IF NOT EXISTS idx_posts_published  ON posts(published_at DESC);

-- ============ POST IMAGES ============
CREATE TABLE IF NOT EXISTS post_images (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  image_url  TEXT NOT NULL,
  alt_text   TEXT DEFAULT '',
  caption    TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_post_images_post ON post_images(post_id);

-- ============ SOURCE CODE FILES (dynamic, unlimited) ============
CREATE TABLE IF NOT EXISTS post_files (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id      INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  file_name    TEXT NOT NULL,
  file_path    TEXT NOT NULL DEFAULT '',
  language     TEXT NOT NULL DEFAULT 'text',
  code_content TEXT NOT NULL DEFAULT '',
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_post_files_post ON post_files(post_id, sort_order);

-- ============ DEMO FILES (for Live Preview / download) ============
CREATE TABLE IF NOT EXISTS post_demo_files (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id      INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  file_path    TEXT NOT NULL,
  file_content TEXT NOT NULL DEFAULT '',
  file_type    TEXT NOT NULL DEFAULT 'text/html',
  sort_order   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_post_demo_post ON post_demo_files(post_id, sort_order);

-- ============ POST <-> TAG ============
CREATE TABLE IF NOT EXISTS post_tags (
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag_id  INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_post_tags_tag ON post_tags(tag_id);

-- ============ SETTINGS ============
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

-- ============ VIEW TRACKING (per-visitor-per-day de-duplication) ============
CREATE TABLE IF NOT EXISTS views (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id     INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  visitor_key TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_views_unique ON views(post_id, visitor_key);
CREATE INDEX IF NOT EXISTS idx_views_created ON views(created_at);

-- ============ UPLOADS (small images stored in D1, no R2) ============
CREATE TABLE IF NOT EXISTS uploads (
  id         TEXT PRIMARY KEY,
  mime_type  TEXT NOT NULL,
  byte_size  INTEGER NOT NULL,
  data       TEXT NOT NULL,           -- base64 payload
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_uploads_created ON uploads(created_at);

-- ============ DEFAULT SETTINGS ============
INSERT OR IGNORE INTO settings (key, value) VALUES
  ('site_name', 'CodeForge'),
  ('site_description', 'Hands-on coding tutorials and free source-code projects for web developers.'),
  ('logo_url', ''),
  ('favicon_url', '/favicon.svg'),
  ('author_name', 'CodeForge Team'),
  ('contact_email', 'hello@example.com'),
  ('footer_text', 'Learn by building. Free tutorials and open source projects.'),
  ('social_twitter', ''),
  ('social_github', ''),
  ('social_youtube', ''),
  ('social_facebook', ''),
  ('youtube_channel', ''),
  ('seo_default_title', 'CodeForge — Tutorials & Projects'),
  ('seo_default_description', 'Hands-on coding tutorials and free source-code projects for web developers.'),
  ('ads_enabled', '0'),
  ('adsense_publisher_id', ''),
  ('adsense_slot_home', ''),
  ('adsense_slot_post_top', ''),
  ('adsense_slot_post_bottom', ''),
  ('ads_txt', ''),
  ('privacy_policy', ''),
  ('terms', ''),
  ('disclaimer', ''),
  ('cookie_policy', '');
