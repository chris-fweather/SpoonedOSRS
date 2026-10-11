-- Optional Discord nickname and supporter display preferences; no credentials.
CREATE TABLE discord_sync_preferences (
 discord_id TEXT PRIMARY KEY NOT NULL,
 nickname_rsn TEXT,
 supporter_role INTEGER NOT NULL DEFAULT 1 CHECK(supporter_role IN (0,1))
);
