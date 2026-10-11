-- Shared outbound pacing and short-lived public API responses. Times are Unix ms.
CREATE TABLE provider_pacing (
  provider TEXT PRIMARY KEY,
  next_at INTEGER NOT NULL
);
CREATE TABLE provider_responses (
  id TEXT PRIMARY KEY,
  status INTEGER NOT NULL DEFAULT 0,
  content_type TEXT NOT NULL DEFAULT '',
  body BLOB,
  fetched_at INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL DEFAULT 0,
  lease_until INTEGER NOT NULL DEFAULT 0,
  token TEXT NOT NULL
);
CREATE INDEX provider_responses_expiry ON provider_responses(expires_at);
