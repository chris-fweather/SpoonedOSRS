CREATE TABLE IF NOT EXISTS `users` (
	`discord_id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`global_name` text,
	`avatar` text,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `claimed_names` (
	`rsn` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`discord_id` text NOT NULL,
	`claimed_at` integer NOT NULL,
	FOREIGN KEY (`discord_id`) REFERENCES `users`(`discord_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `claimed_names_discord_id` ON `claimed_names` (`discord_id`);
