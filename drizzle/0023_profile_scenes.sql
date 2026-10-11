-- Character scenes gain a mine and a woodland. SQLite cannot change a CHECK constraint in place, so the table
-- is rebuilt with every row kept, and the board-version triggers are recreated on the new table.
DROP TRIGGER IF EXISTS board_version_profile_options_insert;
DROP TRIGGER IF EXISTS board_version_profile_options_update;
DROP TRIGGER IF EXISTS board_version_profile_options_delete;
CREATE TABLE profile_options_next (rsn TEXT PRIMARY KEY NOT NULL, details TEXT NOT NULL DEFAULT '{}', skin TEXT NOT NULL DEFAULT 'default', background TEXT NOT NULL DEFAULT 'none' CHECK(background IN ('none','castle','riverside','mine','woodland')));
INSERT INTO profile_options_next(rsn,details,skin,background) SELECT rsn,details,skin,background FROM profile_options;
DROP TABLE profile_options;
ALTER TABLE profile_options_next RENAME TO profile_options;
CREATE TRIGGER board_version_profile_options_insert AFTER INSERT ON profile_options BEGIN UPDATE board_revision SET version=version+1 WHERE id=1; END;
CREATE TRIGGER board_version_profile_options_update AFTER UPDATE ON profile_options BEGIN UPDATE board_revision SET version=version+1 WHERE id=1; END;
CREATE TRIGGER board_version_profile_options_delete AFTER DELETE ON profile_options BEGIN UPDATE board_revision SET version=version+1 WHERE id=1; END;
