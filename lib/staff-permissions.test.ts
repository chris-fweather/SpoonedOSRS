import test from "node:test";
import assert from "node:assert/strict";
import { staffPermissions, isEditableStaffRole, parseStaffPermissions, DEFAULT_ROLE_PERMISSIONS } from "./staff-permissions";
const all = { guides: true, publish: true, corrections: true, planning: true, review: true, ownership: true, holds: true };
/** The four corrections and guide areas these cases set; publish and ownership follow the same rules (checked below). */
const core = (p: Record<string, boolean>) => ({ guides: p.guides, corrections: p.corrections, planning: p.planning, review: p.review });
const proposeOnly = { guides: true, publish: false, corrections: true, planning: true, review: false, ownership: false, holds: false };
test("ranks fall back to the shipped defaults: helpers propose, moderators and admins also approve", () => {
  assert.deepEqual(staffPermissions("helper", null, null), proposeOnly);
  assert.deepEqual(staffPermissions("moderator"), all);
  assert.deepEqual(staffPermissions("admin", undefined, undefined), all);
  assert.deepEqual(DEFAULT_ROLE_PERMISSIONS.helper, proposeOnly);
});
test("a saved rank row becomes the default for members of that rank; unsaved areas use the shipped default", () => {
  assert.deepEqual(core(staffPermissions("helper", null, { guides: 1, corrections: 1, planning: 0, review: 1 })), { guides: true, corrections: true, planning: false, review: true });
  assert.deepEqual(core(staffPermissions("moderator", null, { guides: 0, corrections: 1, planning: 0 })), { guides: false, corrections: true, planning: false, review: true });
  assert.deepEqual(core(staffPermissions("admin", null, { guides: 1, corrections: 0, planning: 1, review: 0 })), { guides: true, corrections: false, planning: true, review: false });
});
test("a member's own row wins over the rank row, area by area", () => {
  assert.deepEqual(core(staffPermissions("moderator", { guides: 1, corrections: 0, planning: 1, review: 0 }, { guides: 0, corrections: 1, planning: 0, review: 1 })), { guides: true, corrections: false, planning: true, review: false });
  assert.deepEqual(core(staffPermissions("helper", { guides: 0, corrections: 1, planning: 0, review: 1 }, { guides: 1, corrections: 0, planning: 0, review: 0 })), { guides: false, corrections: true, planning: false, review: true });
  // A LEFT JOIN without a member row gives nulls: those areas follow the rank.
  assert.deepEqual(core(staffPermissions("admin", { guides: null, corrections: null, planning: null, review: null }, { guides: 1, corrections: 0, planning: 1, review: 1 })), { guides: true, corrections: false, planning: true, review: true });
  assert.deepEqual(core(staffPermissions("helper", { guides: false }, { guides: 1, corrections: 1, planning: 1 })), { guides: false, corrections: true, planning: true, review: false });
});
test("publish and ownership approval: moderators and up by default, rows can grant or remove them", () => {
  assert.equal(staffPermissions("helper").publish, false);
  assert.equal(staffPermissions("helper", { publish: 1, ownership: 1 }).ownership, true);
  assert.equal(staffPermissions("moderator", null, { publish: 0 }).publish, false);
  assert.equal(staffPermissions("admin").ownership, true);
});
test("the owner always has every area, whatever any row says", () => {
  assert.deepEqual(staffPermissions("owner", { guides: 0, corrections: 0, planning: 0, review: 0 }, { guides: 0, corrections: 0, planning: 0, review: 0 }), all);
  assert.deepEqual(staffPermissions("owner"), all);
});
test("saved permissions name every area, including approval, as booleans", () => {
  assert.deepEqual(parseStaffPermissions(proposeOnly), proposeOnly);
  assert.throws(() => parseStaffPermissions({ guides: true, corrections: true, planning: true }));
  assert.throws(() => parseStaffPermissions({ ...all, review: "yes" }));
  assert.throws(() => parseStaffPermissions({ ...all, admin: true }));
});
test("only helper, moderator and admin ranks are editable", () => {
  assert.ok(["helper", "moderator", "admin"].every(isEditableStaffRole));
  assert.ok(!["owner", "Admin", "", null, undefined, 1].some(isEditableStaffRole));
});
