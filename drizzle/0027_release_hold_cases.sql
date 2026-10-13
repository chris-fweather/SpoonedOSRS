-- Ownership requests can release a moderation hold, so a held name becomes free to link again.
-- SQLite cannot change a CHECK in place, so staff_cases is rebuilt with the same columns and indexes.
CREATE TABLE staff_cases_next (
 id TEXT PRIMARY KEY,rsn TEXT NOT NULL,action TEXT NOT NULL CHECK(action IN ('unlink','relink','release')),
 target_id TEXT,source_id TEXT,expected_claim TEXT,expected_reservation TEXT,
 protected INTEGER NOT NULL CHECK(protected IN (0,1)),reason TEXT NOT NULL,
 creator_id TEXT NOT NULL,creator_name TEXT NOT NULL,created_at TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','approved','rejected')),
 reviewer_id TEXT,reviewed_at TEXT,execution_token TEXT
);
INSERT INTO staff_cases_next(id,rsn,action,target_id,source_id,expected_claim,expected_reservation,protected,reason,creator_id,creator_name,created_at,state,reviewer_id,reviewed_at,execution_token)
 SELECT id,rsn,action,target_id,source_id,expected_claim,expected_reservation,protected,reason,creator_id,creator_name,created_at,state,reviewer_id,reviewed_at,execution_token FROM staff_cases;
DROP TABLE staff_cases;
ALTER TABLE staff_cases_next RENAME TO staff_cases;
CREATE INDEX staff_cases_queue ON staff_cases(state,created_at DESC);
CREATE INDEX staff_cases_rsn ON staff_cases(rsn,created_at DESC);
