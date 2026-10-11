-- One endorsement per Discord account per RuneScape profile. No voter list is public.
CREATE TABLE IF NOT EXISTS profile_reputation (
  rsn TEXT NOT NULL,
  voter_id TEXT NOT NULL REFERENCES users(discord_id),
  created_at TEXT NOT NULL,
  PRIMARY KEY (rsn, voter_id)
);
