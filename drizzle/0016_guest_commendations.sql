-- Keep prior account endorsements; new votes are also unique per network/profile.
CREATE TABLE IF NOT EXISTS profile_commendations (
 rsn TEXT NOT NULL,
 voter_id TEXT,
 ip_key TEXT,
 created_at TEXT NOT NULL,
 CHECK(voter_id IS NOT NULL OR ip_key IS NOT NULL),
 UNIQUE(rsn,voter_id),
 UNIQUE(rsn,ip_key)
);
INSERT OR IGNORE INTO profile_commendations(rsn,voter_id,created_at)
 SELECT rsn,voter_id,created_at FROM profile_reputation;
CREATE INDEX IF NOT EXISTS profile_commendations_rsn ON profile_commendations(rsn);
CREATE TABLE IF NOT EXISTS commendation_limits (
 id TEXT PRIMARY KEY NOT NULL,
 window INTEGER NOT NULL,
 count INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS commendation_limits_window ON commendation_limits(window);
