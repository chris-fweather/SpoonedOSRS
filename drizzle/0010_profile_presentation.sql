CREATE TABLE IF NOT EXISTS profile_presentation (
 rsn TEXT PRIMARY KEY NOT NULL,
 staff_badge TEXT,
 staff_prefix TEXT,
 title_choice TEXT NOT NULL DEFAULT 'auto',
 show_donation INTEGER NOT NULL DEFAULT 1 CHECK(show_donation IN (0,1))
);
-- Verified totals are populated by the payment/admin process, never a profile edit.
CREATE TABLE IF NOT EXISTS supporter_totals (
 discord_id TEXT PRIMARY KEY NOT NULL,
 amount_minor INTEGER CHECK(amount_minor >= 0),
 currency TEXT NOT NULL DEFAULT 'USD'
);
