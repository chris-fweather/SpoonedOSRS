-- Log out everywhere: each account has a session version, signed into its session cookie.
-- Raising the version ends every older session for that account, on every device.
ALTER TABLE users ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0;
