-- Publishing guides and approving ownership requests become their own permissions, so the owner and admins can
-- give them to a helper (or take them from a moderator). Shipped defaults match today: moderators and up only.
-- Protected accounts still need an admin whatever these say.
ALTER TABLE staff_role_permissions ADD COLUMN publish INTEGER CHECK(publish IS NULL OR publish IN (0,1));
ALTER TABLE staff_role_permissions ADD COLUMN ownership INTEGER CHECK(ownership IS NULL OR ownership IN (0,1));
ALTER TABLE staff_permissions ADD COLUMN publish INTEGER CHECK(publish IS NULL OR publish IN (0,1));
ALTER TABLE staff_permissions ADD COLUMN ownership INTEGER CHECK(ownership IS NULL OR ownership IN (0,1));
UPDATE staff_role_permissions SET publish=CASE WHEN role='helper' THEN 0 ELSE 1 END WHERE publish IS NULL;
UPDATE staff_role_permissions SET ownership=CASE WHEN role='helper' THEN 0 ELSE 1 END WHERE ownership IS NULL;
