-- Approving corrections becomes its own permission, separate from proposing them.
-- Helpers can now propose drop rates, records and kill rates by default; approving stays with moderators and up.
ALTER TABLE staff_role_permissions ADD COLUMN review INTEGER CHECK(review IS NULL OR review IN (0,1));
ALTER TABLE staff_permissions ADD COLUMN review INTEGER CHECK(review IS NULL OR review IN (0,1));
-- Only the shipped helper defaults move; a helper rank the owner already changed is left as saved.
UPDATE staff_role_permissions SET corrections=1,planning=1 WHERE role='helper' AND guides=1 AND corrections=0 AND planning=0;
UPDATE staff_role_permissions SET review=CASE WHEN role='helper' THEN 0 ELSE corrections END WHERE review IS NULL;
-- Members with their own access keep what they could do: helpers never approved, others approved when they had corrections.
UPDATE staff_permissions SET review=CASE WHEN (SELECT role FROM staff_members m WHERE m.discord_id=staff_permissions.discord_id)='helper' THEN 0 ELSE corrections END WHERE review IS NULL;
