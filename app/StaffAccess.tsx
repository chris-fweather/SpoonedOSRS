"use client";
import {useState, type FormEvent} from "react";
import {ChevronDown, Lock} from "lucide-react";
import {STAFF_AREAS, EDITABLE_STAFF_ROLES, type EditableStaffRole, type StaffArea, type StaffPermissions} from "@/lib/staff-permissions";
import {mayGrant, STAFF_LABEL, STAFF_TONE, type StaffRole} from "@/lib/staff-policy";
import {RankIcon, RankLabel} from "./StaffBadge";
import {timeAgo} from "./StaffWorkspace";
import "./account-settings.css";
import "./staff-access.css";
type Viewer = {id: string; role: StaffRole};
export type StaffMember = {discord_id: string; username: string; global_name: string | null; avatarUrl: string | null; role: StaffRole; linked_names: string; custom: boolean; permissions: StaffPermissions};
export type AuditEntry = {id: number; action: string; detail: string; created_at: string; target_id: string; actor_id: string; actor_name: string | null; target_name: string | null};
type Save = (body: object, message: string) => Promise<boolean>;
const RANKS: StaffRole[] = ["owner", "admin", "moderator", "helper"];
const AREAS = Object.entries(STAFF_AREAS) as [StaffArea, string][];
/** Short labels and the same official icons as the portal tabs. */
const AREA_SHORT: Record<StaffArea, string> = {guides: "Guides", corrections: "Corrections", planning: "Planning"};
const AREA_ICON: Record<StaffArea, string> = {guides: "/icons/navigation/quest-point-icon.png", corrections: "/items/2347.png", planning: "/icons/navigation/combat-achievements-icon.png"};
/** What a rank can do whatever its areas: one short line under the rank. */
const RANK_NOTE: Record<StaffRole, string> = {helper: "Account requests", moderator: "Also reviews and publishes", admin: "Also players, progress and ranks", owner: "Everything, always"};
const linkedNames = (m: StaffMember) => {try {return JSON.parse(m.linked_names) as string[];} catch {return [];}};
const displayName = (m: StaffMember) => m.global_name || m.username;
const rankWord = (r: StaffRole) => `${r === "admin" ? "an" : "a"} ${STAFF_LABEL[r]}`;

/** Owner-only Permissions tab: the team with each member's access, rank defaults, and the access history. */
export function StaffAccess({members, audit, rolePermissions, viewer, busy, onSave, grantName, setGrantName}: {members: StaffMember[]; audit: AuditEntry[]; rolePermissions: Record<EditableStaffRole, StaffPermissions>; viewer: Viewer; busy: boolean; onSave: Save; grantName: string; setGrantName: (name: string) => void}) {
  const sorted = [...members].sort((a, b) => RANKS.indexOf(a.role) - RANKS.indexOf(b.role) || displayName(a).localeCompare(displayName(b)));
  const [open, setOpen] = useState<string | null>(null);
  return <div className="staff-access">
    <section className="community-panel perm-panel" aria-labelledby="perm-team-title">
      <div className="section-heading"><div><h3 id="perm-team-title">Team</h3><p>{members.length} staff. Nobody changes their own rank.</p></div></div>
      <AddStaff viewer={viewer} busy={busy} onSave={onSave} name={grantName} setName={setGrantName} />
      <div className="perm-list-head" aria-hidden="true"><span>Member</span><span>Rank</span><span>Access</span></div>
      <ul className="perm-members">{sorted.map((m) => <MemberRow key={m.discord_id + m.role + JSON.stringify(m.permissions) + m.custom} member={m} viewer={viewer} busy={busy} onSave={onSave} open={open === m.discord_id} onToggle={() => setOpen(open === m.discord_id ? null : m.discord_id)} />)}</ul>
    </section>
    <RankDefaults key={JSON.stringify(rolePermissions)} rolePermissions={rolePermissions} busy={busy} onSave={onSave} />
    <AccessHistory audit={audit} />
  </div>;
}

/** Equal-width rank choices with their scimitars (the owner rank is never assignable). */
function RankChoices({value, ranks, name, disabled, onChange}: {value: StaffRole | null; ranks: StaffRole[]; name: string; disabled?: boolean; onChange: (r: StaffRole) => void}) {
  return <div className="perm-choices perm-ranks" role="radiogroup" aria-label="Rank">{(["helper", "moderator", "admin"] as const).map((r) => <label key={r} className="account-choice">
    <input className="sr-only" type="radio" name={name} checked={value === r} disabled={disabled || !ranks.includes(r)} onChange={() => onChange(r)} />
    <RankIcon staff={{role: r, prefix: null}} /><span className={STAFF_TONE[r]}>{STAFF_LABEL[r]}</span>
  </label>)}</div>;
}

/** Three equal-width area toggles in the site's checkbox style, with the portal's tab icons. */
function AreaChoices({value, onChange, disabled, label}: {value: StaffPermissions; onChange?: (next: StaffPermissions) => void; disabled?: boolean; label: string}) {
  return <div className="perm-choices" role="group" aria-label={label}>{AREAS.map(([key, full]) => <label key={key} className="account-choice" title={full}>
    <input type="checkbox" checked={value[key]} disabled={disabled || !onChange} onChange={(e) => onChange?.({...value, [key]: e.target.checked})} />
    <img src={AREA_ICON[key]} alt="" /><span>{AREA_SHORT[key]}</span>
  </label>)}</div>;
}

function AddStaff({viewer, busy, onSave, name, setName}: {viewer: Viewer; busy: boolean; onSave: Save; name: string; setName: (n: string) => void}) {
  const grantable = (["helper", "moderator", "admin"] as const).filter((r) => mayGrant(viewer, {id: "", role: null}, r));
  const [role, setRole] = useState<StaffRole>("helper");
  async function add(e: FormEvent) {e.preventDefault();if (await onSave({action: "grant", username: name.trim(), role}, `${name.trim()} is now ${STAFF_LABEL[role]}.`)) setName("");}
  return <form className="perm-add" onSubmit={add}>
    <label className="perm-add-name"><span className="sr-only">Linked RuneScape name</span><input required maxLength={12} value={name} onChange={(e) => setName(e.target.value)} placeholder="Linked RuneScape name" /></label>
    <RankChoices value={role} ranks={grantable} name="perm-add-rank" onChange={setRole} />
    <button className="btn primary" disabled={busy || !name.trim()}>Add</button>
  </form>;
}

function Avatar({member: m}: {member: StaffMember}) {
  const [failed, setFailed] = useState(false);
  return m.avatarUrl && !failed ? <img className="staff-avatar" src={m.avatarUrl} alt="" onError={() => setFailed(true)} /> : <span className="staff-avatar" aria-hidden="true">{displayName(m).slice(0, 1).toUpperCase()}</span>;
}

function MemberRow({member: m, viewer, busy, onSave, open, onToggle}: {member: StaffMember; viewer: Viewer; busy: boolean; onSave: Save; open: boolean; onToggle: () => void}) {
  const names = linkedNames(m), target = {id: m.discord_id, role: m.role}, linked = names.length > 0, name = displayName(m), self = m.discord_id === viewer.id;
  const ranks = (["helper", "moderator", "admin"] as const).filter((r) => r === m.role || mayGrant(viewer, target, r));
  const manageable = linked && (ranks.some((r) => r !== m.role) || mayGrant(viewer, target, null) || mayGrant(viewer, target, m.role));
  const locked = self ? "You" : m.role === "owner" ? "Site owner" : !linked ? "No linked name" : "Locked";
  const summary = <>
    <Avatar member={m} />
    <span className="perm-member-id"><b>{name}</b><small>{[`@${m.username}`, ...names].join(" · ")}</small></span>
    <RankLabel role={m.role} />
    <span className="perm-member-areas">{m.role === "owner" ? <small>Every area</small> : AREAS.filter(([k]) => m.permissions[k]).map(([k, label]) => <img key={k} src={AREA_ICON[k]} alt={label} title={label} />)}{m.role !== "owner" && !AREAS.some(([k]) => m.permissions[k]) && <small>None</small>}{m.custom && <small className="perm-custom" title="Own access instead of the rank's">Custom</small>}</span>
  </>;
  return <li className={"perm-member" + (open ? " is-open" : "")}>
    {manageable ? <button type="button" className="perm-member-row" aria-expanded={open} aria-label={`Manage ${name}`} onClick={onToggle}>{summary}<ChevronDown className="perm-chevron" size={17} aria-hidden="true" /></button>
      : <div className="perm-member-row">{summary}<small className="perm-locked"><Lock size={12} aria-hidden="true" />{locked}</small></div>}
    {open && manageable && <MemberEditor member={m} names={names} ranks={ranks} viewer={viewer} busy={busy} onSave={onSave} />}
  </li>;
}

/** Rank, the member's own access, and Remove rank, each applied with its own button. */
function MemberEditor({member: m, names, ranks, viewer, busy, onSave}: {member: StaffMember; names: string[]; ranks: StaffRole[]; viewer: Viewer; busy: boolean; onSave: Save}) {
  const name = displayName(m), target = {id: m.discord_id, role: m.role};
  const [rank, setRank] = useState<StaffRole>(m.role), [areas, setAreas] = useState(m.permissions), [remove, setRemove] = useState(false);
  const changedAreas = AREAS.some(([k]) => areas[k] !== m.permissions[k]);
  return <div className="perm-editor">
    <div className="perm-field"><span className="perm-label">Rank</span>
      <RankChoices value={rank} ranks={ranks} name={"perm-rank-" + m.discord_id} disabled={busy} onChange={setRank} />
    </div>
    {rank !== m.role && <div className="perm-confirm"><span>Make {name} {rankWord(rank)}?</span><button type="button" className="btn sm primary" disabled={busy} onClick={() => void onSave({action: "grant", username: names[0], role: rank}, `${name} is now ${STAFF_LABEL[rank]}.`)}>Confirm</button><button type="button" className="btn sm ghost" disabled={busy} onClick={() => setRank(m.role)}>Cancel</button></div>}
    {mayGrant(viewer, target, m.role) && <div className="perm-field"><span className="perm-label">Access</span>
      <AreaChoices value={areas} disabled={busy} label={`Access for ${name}`} onChange={setAreas} />
    </div>}
    <div className="perm-editor-actions">
      <small>{m.custom ? "Own access, instead of the rank's." : `Follows the ${STAFF_LABEL[m.role]} rank.`}</small>
      {m.custom && <button type="button" className="btn sm ghost" disabled={busy} onClick={() => void onSave({action: "permissions", username: names[0], permissions: null}, `${name} now follows the ${STAFF_LABEL[m.role]} rank.`)}>Use rank defaults</button>}
      {changedAreas && <button type="button" className="btn sm primary" disabled={busy} onClick={() => void onSave({action: "permissions", username: names[0], permissions: areas}, `Saved ${name}'s own access.`)}>Save access</button>}
      {mayGrant(viewer, target, null) && (remove ? <span className="perm-remove-confirm"><button type="button" className="btn sm danger" disabled={busy} onClick={() => void onSave({action: "grant", username: names[0], role: null}, `${name} no longer has a rank.`)}>Remove {STAFF_LABEL[m.role]}</button><button type="button" className="btn sm ghost" disabled={busy} onClick={() => setRemove(false)}>Cancel</button></span>
        : <button type="button" className="link perm-remove" disabled={busy} onClick={() => setRemove(true)}>Remove rank</button>)}
    </div>
  </div>;
}

/** What each rank opens by default. The owner row is always every area. */
function RankDefaults({rolePermissions, busy, onSave}: {rolePermissions: Record<EditableStaffRole, StaffPermissions>; busy: boolean; onSave: Save}) {
  const [draft, setDraft] = useState(rolePermissions);
  const changed = EDITABLE_STAFF_ROLES.filter((r) => AREAS.some(([k]) => draft[r][k] !== rolePermissions[r][k]));
  async function save() {for (const role of changed) if (!(await onSave({action: "role-permissions", role, permissions: draft[role]}, "Rank permissions saved."))) return;}
  const every = {guides: true, corrections: true, planning: true};
  return <section className="community-panel perm-panel" aria-labelledby="perm-ranks-title">
    <div className="section-heading"><div><h3 id="perm-ranks-title">Rank permissions</h3><p>What each rank opens. A member&apos;s own access wins.</p></div></div>
    <ul className="perm-ranks-list">
      {(["helper", "moderator", "admin"] as const).map((r) => <li key={r} className={changed.includes(r) ? "is-changed" : undefined}>
        <span className="perm-rank"><RankLabel role={r} /><small>{RANK_NOTE[r]}</small></span>
        <AreaChoices value={draft[r]} disabled={busy} label={`${STAFF_LABEL[r]} areas`} onChange={(next) => setDraft((d) => ({...d, [r]: next}))} />
      </li>)}
      <li><span className="perm-rank"><RankLabel role="owner" /><small>{RANK_NOTE.owner}</small></span><AreaChoices value={every} label="Owner areas" /></li>
    </ul>
    <footer className="perm-save" data-dirty={changed.length > 0}>
      <span role="status">{changed.length ? `Unsaved: ${changed.map((r) => STAFF_LABEL[r]).join(", ")}` : "Applies to every member without their own access."}</span>
      {changed.length > 0 && <button type="button" className="btn sm ghost" disabled={busy} onClick={() => setDraft(rolePermissions)}>Discard</button>}
      <button type="button" className="btn sm primary" disabled={busy || !changed.length} onClick={() => void save()}>Save</button>
    </footer>
  </section>;
}

function describe(a: AuditEntry) {
  const actor = a.actor_name ?? "Someone", target = a.target_name ?? "a former staff member";
  let d: Record<string, unknown> | null = null;try {d = JSON.parse(a.detail);} catch {}
  const rank = (r: unknown) => STAFF_LABEL[r as StaffRole] ?? "no rank";
  if (a.action === "grant" && d) return d.from ? {tone: RANKS.indexOf(d.to as StaffRole) < RANKS.indexOf(d.from as StaffRole) ? "up" : "down", text: `${actor} ${RANKS.indexOf(d.to as StaffRole) < RANKS.indexOf(d.from as StaffRole) ? "promoted" : "moved"} ${target} from ${rank(d.from)} to ${rank(d.to)}`} : {tone: "up", text: `${actor} added ${target} as ${rank(d.to)}`};
  if (a.action === "revoke" && d) return {tone: "down", text: `${actor} removed ${target}'s ${rank(d.from)} rank`};
  if (a.action === "permissions" && d) return {tone: "edit", text: d.reset ? `${actor} returned ${target} to rank defaults` : `${actor} gave ${target} their own access: ${AREAS.filter(([k]) => d![k]).map(([k]) => AREA_SHORT[k]).join(", ") || "no areas"}`};
  if (a.action === "role-permissions" && d) {
    const from = d.from as StaffPermissions, to = d.to as StaffPermissions;
    const diff = AREAS.filter(([k]) => from?.[k] !== to?.[k]).map(([k]) => `${AREA_SHORT[k]} ${to[k] ? "on" : "off"}`);
    return {tone: "edit", text: `${actor} changed the ${rank(d.role)} rank: ${diff.join(", ") || "no change"}`};
  }
  if (a.action === "guide-publish" || a.action === "guide-unpublish") return {tone: "edit", text: `${actor} ${a.action === "guide-publish" ? "published" : "unpublished"} the guide “${a.detail}”`};
  const action = a.action.replace(/[-_]+/g, " ");
  return {tone: "edit", text: `${actor}: ${action.charAt(0).toUpperCase() + action.slice(1)}${d ? "" : ` · ${a.detail}`}`};
}

function AccessHistory({audit}: {audit: AuditEntry[]}) {
  const [all, setAll] = useState(false), rows = all ? audit : audit.slice(0, 6);
  return <section className="community-panel perm-panel" aria-labelledby="perm-history-title">
    <div className="section-heading"><div><h3 id="perm-history-title">Access history</h3><p>Ranks, own access and guide publishing.</p></div></div>
    {audit.length ? <ol className="staff-audit-list">{rows.map((a) => {const {tone, text} = describe(a);return <li key={a.id} className={"tone-" + tone}><i aria-hidden="true" /><p>{text}</p><time dateTime={a.created_at} title={new Date(a.created_at).toLocaleString()}>{timeAgo(a.created_at)}</time></li>;})}</ol> : <p className="staff-empty">No changes yet.</p>}
    {audit.length > 6 && <button type="button" className="link" onClick={() => setAll(!all)}>{all ? "Show fewer" : `Show all ${audit.length}`}</button>}
  </section>;
}
