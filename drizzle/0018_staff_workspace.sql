-- Per-Discord staff permissions and a curated per-profile wallpaper.
CREATE TABLE IF NOT EXISTS staff_permissions (
 discord_id TEXT PRIMARY KEY REFERENCES users(discord_id),
 guides INTEGER NOT NULL DEFAULT 1 CHECK(guides IN (0,1)),
 corrections INTEGER NOT NULL DEFAULT 1 CHECK(corrections IN (0,1)),
 planning INTEGER NOT NULL DEFAULT 1 CHECK(planning IN (0,1))
);
ALTER TABLE profile_options ADD COLUMN background TEXT NOT NULL DEFAULT 'none' CHECK(background IN ('none','castle','riverside'));
