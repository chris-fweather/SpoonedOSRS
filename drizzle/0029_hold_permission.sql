-- Hold names: staff with this permission put an unprotected RuneScape name on hold straight away, without a second reviewer.
-- A hold only stops anyone linking the name; releasing it or linking it to an owner still needs a reviewer.
ALTER TABLE staff_role_permissions ADD COLUMN holds INTEGER CHECK(holds IS NULL OR holds IN (0,1));
ALTER TABLE staff_permissions ADD COLUMN holds INTEGER CHECK(holds IS NULL OR holds IN (0,1));
UPDATE staff_role_permissions SET holds=CASE WHEN role='helper' THEN 0 ELSE 1 END WHERE holds IS NULL;
