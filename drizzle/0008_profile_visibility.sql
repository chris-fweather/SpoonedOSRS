CREATE TABLE IF NOT EXISTS profile_visibility (rsn TEXT PRIMARY KEY NOT NULL, visibility TEXT NOT NULL DEFAULT 'public' CHECK(visibility IN ('public','private')));
