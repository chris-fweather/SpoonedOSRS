CREATE TABLE IF NOT EXISTS profile_supporter_totals (rsn TEXT PRIMARY KEY NOT NULL, amount_minor INTEGER NOT NULL CHECK(amount_minor>=0), currency TEXT NOT NULL DEFAULT 'USD');
UPDATE profile_options SET skin='default' WHERE skin='red';
