-- Guide images and GIFs uploaded by staff into R2. One row per stored file (keyed by content hash, so the same
-- picture is stored once). The sizes are what the upload caps count: per person per day, and the whole bucket.
CREATE TABLE guide_uploads (
 key TEXT PRIMARY KEY CHECK(key GLOB 'guides/*'),
 uploader_id TEXT NOT NULL,
 bytes INTEGER NOT NULL CHECK(bytes > 0),
 type TEXT NOT NULL CHECK(type IN ('image/png','image/jpeg','image/gif','image/webp')),
 created_at TEXT NOT NULL
);
CREATE INDEX guide_uploads_uploader ON guide_uploads(uploader_id, created_at);
