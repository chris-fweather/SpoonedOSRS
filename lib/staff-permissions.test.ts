import test from "node:test";
import assert from "node:assert/strict";
import { staffPermissions, isEditableStaffRole, DEFAULT_ROLE_PERMISSIONS } from "./staff-permissions";
const all = { guides: true, corrections: true, planning: true };
const guidesOnly = { guides: true, corrections: false, planning: false };
test("ranks fall back to the shipped defaults when no rank row is saved", () => {
  assert.deepEqual(staffPermissions("helper", null, null), guidesOnly);
  assert.deepEqual(staffPermissions("moderator"), all);
  assert.deepEqual(staffPermissions("admin", undefined, undefined), all);
  assert.deepEqual(DEFAULT_ROLE_PERMISSIONS.helper, guidesOnly);
});
test("a saved rank row becomes the default for members of that rank", () => {
  assert.deepEqual(staffPermissions("helper", null, { guides: 1, corrections: 1, planning: 0 }), { guides: true, corrections: true, planning: false });
  assert.deepEqual(staffPermissions("moderator", null, { guides: 0, corrections: 1, planning: 0 }), { guides: false, corrections: true, planning: false });
  assert.deepEqual(staffPermissions("admin", null, { guides: 1, corrections: 0, planning: 1 }), { guides: true, corrections: false, planning: true });
});
test("a member's own row wins over the rank row, area by area", () => {
  assert.deepEqual(staffPermissions("moderator", { guides: 1, corrections: 0, planning: 1 }, { guides: 0, corrections: 1, planning: 0 }), { guides: true, corrections: false, planning: true });
  assert.deepEqual(staffPermissions("helper", { guides: 0, corrections: 1, planning: 0 }, { guides: 1, corrections: 0, planning: 0 }), { guides: false, corrections: true, planning: false });
  // A LEFT JOIN without a member row gives nulls: those areas follow the rank.
  assert.deepEqual(staffPermissions("admin", { guides: null, corrections: null, planning: null }, { guides: 1, corrections: 0, planning: 1 }), { guides: true, corrections: false, planning: true });
  assert.deepEqual(staffPermissions("helper", { guides: false }, { guides: 1, corrections: 1, planning: 1 }), { guides: false, corrections: true, planning: true });
});
test("the owner always has every area, whatever any row says", () => {
  assert.deepEqual(staffPermissions("owner", { guides: 0, corrections: 0, planning: 0 }, { guides: 0, corrections: 0, planning: 0 }), all);
  assert.deepEqual(staffPermissions("owner"), all);
});
test("only helper, moderator and admin ranks are editable", () => {
  assert.ok(["helper", "moderator", "admin"].every(isEditableStaffRole));
  assert.ok(!["owner", "Admin", "", null, undefined, 1].some(isEditableStaffRole));
});
