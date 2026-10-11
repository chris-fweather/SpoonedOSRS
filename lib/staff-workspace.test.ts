import test from "node:test";
import assert from "node:assert/strict";
import { staffPermissions, parseStaffPermissions } from "./staff-permissions";
import { parseAppearance } from "./appearance";
import { emptyGuide, parseGuide } from "./guides";
test("staff workspace grants preserve defaults and support guide-only access", () => {
  assert.deepEqual(staffPermissions("helper"), {
    guides: true,
    corrections: false,
    planning: false,
  });
  assert.deepEqual(
    staffPermissions("helper", { guides: 1, corrections: 0, planning: 0 }),
    { guides: true, corrections: false, planning: false },
  );
  assert.deepEqual(
    staffPermissions("owner", { guides: 0, corrections: 0, planning: 0 }),
    { guides: true, corrections: true, planning: true },
  );
  assert.throws(() =>
    parseStaffPermissions({
      guides: true,
      corrections: false,
      planning: false,
      admin: true,
    }),
  );
  assert.throws(() =>
    parseStaffPermissions({
      guides: "true",
      corrections: false,
      planning: false,
    }),
  );
});
test("backgrounds use curated identifiers, not URLs or styles", () => {
  assert.equal(
    parseAppearance({ body: "male", hair: "brown", background: "castle" })
      .background,
    "castle",
  );
  assert.throws(() =>
    parseAppearance({
      body: "male",
      hair: "brown",
      background: "https://tracker.invalid",
    }),
  );
});
test("structured guide requirements allowlist item fields and reject duplicates", () => {
  const guide = {
    ...emptyGuide(),
    title: "Fishing guide",
    activity: "Fishing",
    summary: "A short guide for testing.",
    strategy: "Choose an appropriate fishing spot and bring supplies.",
    requiredItems: [{ id: "385", quantity: 2, privateField: "discard" }],
  };
  assert.deepEqual(parseGuide(guide).requiredItems, [
    { id: "385", quantity: 2 },
  ]);
  assert.throws(() =>
    parseGuide({ ...guide, requiredItems: [{ id: "385", quantity: -1 }] }),
  );
  assert.throws(() =>
    parseGuide({
      ...guide,
      requiredItems: [
        { id: "385", quantity: 1 },
        { id: "385", quantity: 2 },
      ],
    }),
  );
});
