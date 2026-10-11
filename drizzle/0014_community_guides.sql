CREATE TABLE IF NOT EXISTS community_guides (
 id TEXT PRIMARY KEY NOT NULL,
 author_id TEXT NOT NULL,
 title TEXT NOT NULL,
 draft TEXT NOT NULL,
 published TEXT,
 revision INTEGER NOT NULL DEFAULT 1,
 updated_at TEXT NOT NULL,
 published_at TEXT,
 publisher_id TEXT
);
CREATE INDEX IF NOT EXISTS community_guides_published ON community_guides(published_at);
