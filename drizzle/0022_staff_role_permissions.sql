-- Owner-editable default workspace areas per staff rank. A member's own staff_permissions row still wins;
-- the owner always has every area. Seeded with the shipped defaults.
CREATE TABLE IF NOT EXISTS staff_role_permissions (
 role TEXT PRIMARY KEY CHECK(role IN ('helper','moderator','admin')),
 guides INTEGER NOT NULL CHECK(guides IN (0,1)),
 corrections INTEGER NOT NULL CHECK(corrections IN (0,1)),
 planning INTEGER NOT NULL CHECK(planning IN (0,1))
);
INSERT OR IGNORE INTO staff_role_permissions(role,guides,corrections,planning) VALUES ('helper',1,0,0),('moderator',1,1,1),('admin',1,1,1);
-- Helpers were always limited to guides, whatever their own row said. Member rows now win, so keep today's access.
UPDATE staff_permissions SET corrections=0,planning=0 WHERE discord_id IN (SELECT discord_id FROM staff_members WHERE role='helper');
