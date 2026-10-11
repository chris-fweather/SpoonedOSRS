-- Deployment-specific data migration for the original SpoonedOSRS service (owner account links and
-- owner-supplied records). It ran on that database only and is intentionally empty in public source:
-- a new deployment sets its owners with the OWNER_DISCORD_IDS build variable instead.
SELECT 1;
