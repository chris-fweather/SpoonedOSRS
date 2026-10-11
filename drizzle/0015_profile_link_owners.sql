-- Unlinking must not give another Discord account access to old private journal data.
CREATE TABLE IF NOT EXISTS profile_link_owners (
 rsn TEXT PRIMARY KEY NOT NULL,
 discord_id TEXT NOT NULL,
 linked_at INTEGER NOT NULL,
 saved_flair TEXT NOT NULL DEFAULT '{}'
);
INSERT OR IGNORE INTO profile_link_owners(rsn,discord_id,linked_at)
 SELECT rsn,discord_id,claimed_at FROM claimed_names;

-- Short-lived anonymous upstream budgets. IDs are keyed digests, not addresses.
CREATE TABLE IF NOT EXISTS public_lookup_limits (
 id TEXT PRIMARY KEY NOT NULL,
 window INTEGER NOT NULL,
 count INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS public_lookup_limits_window ON public_lookup_limits(window);
