CREATE TABLE IF NOT EXISTS staff_members (
  discord_id TEXT PRIMARY KEY REFERENCES users(discord_id),
  role TEXT NOT NULL CHECK(role IN ('helper','moderator','admin','owner')),
  prefix TEXT CHECK(prefix IS NULL OR prefix = 'Sir'),
  revision TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS staff_changes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL CHECK(kind IN ('rate','record')),
  target TEXT NOT NULL,
  payload TEXT NOT NULL,
  source TEXT NOT NULL,
  reason TEXT NOT NULL,
  base_revision INTEGER NOT NULL DEFAULT 0,
  actor_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','approved','rejected')),
  reviewer_id TEXT,
  created_at TEXT NOT NULL,
  reviewed_at TEXT
);
CREATE TABLE IF NOT EXISTS staff_overrides (
  kind TEXT NOT NULL,
  target TEXT NOT NULL,
  payload TEXT NOT NULL,
  source TEXT NOT NULL,
  revision INTEGER NOT NULL REFERENCES staff_changes(id),
  PRIMARY KEY(kind,target)
);
CREATE TABLE IF NOT EXISTS staff_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS staff_changes_state ON staff_changes(state,id);
