import type { StaffRole } from "./staff-policy";
export const STAFF_AREAS = {
  guides: "Guide workshop",
  corrections: "Corrections & review",
  planning: "Planning & observations",
} as const;
export type StaffArea = keyof typeof STAFF_AREAS;
export type StaffPermissions = Record<StaffArea, boolean>;
type PermissionRow = Partial<Record<StaffArea, number | boolean | null>> | null | undefined;
/** Ranks whose areas the owner can change. The owner always has every area. */
export const EDITABLE_STAFF_ROLES = ["helper", "moderator", "admin"] as const;
export type EditableStaffRole = (typeof EDITABLE_STAFF_ROLES)[number];
/** Shipped defaults: used until the owner saves a rank, and whenever the role table is unavailable. */
export const DEFAULT_ROLE_PERMISSIONS: Record<EditableStaffRole, StaffPermissions> = {
  helper: { guides: true, corrections: false, planning: false },
  moderator: { guides: true, corrections: true, planning: true },
  admin: { guides: true, corrections: true, planning: true },
};
const pick = (row: PermissionRow, key: StaffArea) => row?.[key] === undefined || row[key] === null ? undefined : !!row[key];
/** A member override wins, then the rank's saved default, then the shipped default. Owners always have every area. */
export function staffPermissions(role: StaffRole, member?: PermissionRow, roleDefault?: PermissionRow): StaffPermissions {
  return Object.fromEntries(
    (Object.keys(STAFF_AREAS) as StaffArea[]).map((key) => [
      key,
      role === "owner" || (pick(member, key) ?? pick(roleDefault, key) ?? DEFAULT_ROLE_PERMISSIONS[role][key]),
    ]),
  ) as StaffPermissions;
}
export function isEditableStaffRole(value: unknown): value is EditableStaffRole {
  return EDITABLE_STAFF_ROLES.includes(value as EditableStaffRole);
}
export function parseStaffPermissions(value: unknown): StaffPermissions {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("Choose staff workspace permissions.");
  const v = value as Record<string, unknown>;
  if (
    Object.keys(v).some((k) => !Object.hasOwn(STAFF_AREAS, k)) ||
    Object.keys(STAFF_AREAS).some((k) => typeof v[k] !== "boolean")
  )
    throw Error("Choose valid staff workspace permissions.");
  return {
    guides: v.guides as boolean,
    corrections: v.corrections as boolean,
    planning: v.planning as boolean,
  };
}
