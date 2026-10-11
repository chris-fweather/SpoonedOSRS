-- Restricted staff cases and append-only application audit history.
CREATE TABLE staff_cases (
 id TEXT PRIMARY KEY,rsn TEXT NOT NULL,action TEXT NOT NULL CHECK(action IN ('unlink','relink')),
 target_id TEXT,source_id TEXT,expected_claim TEXT,expected_reservation TEXT,
 protected INTEGER NOT NULL CHECK(protected IN (0,1)),reason TEXT NOT NULL,
 creator_id TEXT NOT NULL,creator_name TEXT NOT NULL,created_at TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','approved','rejected')),
 reviewer_id TEXT,reviewed_at TEXT,execution_token TEXT
);
CREATE INDEX staff_cases_queue ON staff_cases(state,created_at DESC);
CREATE INDEX staff_cases_rsn ON staff_cases(rsn,created_at DESC);
CREATE TABLE account_actions (
 id INTEGER PRIMARY KEY AUTOINCREMENT,rsn TEXT NOT NULL,case_id TEXT,actor_id TEXT,
 actor_name TEXT,action TEXT NOT NULL,detail TEXT NOT NULL,created_at TEXT NOT NULL
);
CREATE INDEX account_actions_rsn ON account_actions(rsn,id DESC);
CREATE INDEX account_actions_case ON account_actions(case_id,id DESC);
-- Former-owner private notes are isolated from transferred profiles. No public or staff read API.
CREATE TABLE transfer_private_archives (
 case_id TEXT PRIMARY KEY,owner_id TEXT,private_data TEXT NOT NULL,expires_at INTEGER NOT NULL
);
CREATE TRIGGER account_link_audit AFTER INSERT ON claimed_names BEGIN
 INSERT INTO account_actions(rsn,action,detail,created_at) VALUES(NEW.rsn,'linked',json_object('to',NEW.discord_id),strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
CREATE TRIGGER account_unlink_audit AFTER DELETE ON claimed_names BEGIN
 INSERT INTO account_actions(rsn,action,detail,created_at) VALUES(OLD.rsn,'unlinked',json_object('from',OLD.discord_id),strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
CREATE TRIGGER account_transfer_audit AFTER UPDATE OF discord_id ON claimed_names WHEN OLD.discord_id<>NEW.discord_id BEGIN
 INSERT INTO account_actions(rsn,action,detail,created_at) VALUES(NEW.rsn,'relinked',json_object('from',OLD.discord_id,'to',NEW.discord_id),strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
