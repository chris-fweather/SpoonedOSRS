"use client";
import {ExternalLink} from "lucide-react";
import {STAFF_AREAS, type StaffArea, type StaffPermissions} from "@/lib/staff-permissions";
import type {StaffRole} from "@/lib/staff-policy";
import {StaffBadge} from "./StaffBadge";
import type {StaffTabId} from "./StaffNavigation";
type Viewer = {id: string; role: StaffRole; permissions: StaffPermissions};
export type ReviewState = "pending" | "approved" | "rejected";
export type Change = {id:number;kind:'rate'|'record';target:string;payload:string;source:string;reason:string;actor_id:string;actor_name:string;state:string;created_at:string;reviewed_at:string|null;reviewer_name?:string|null};
export const REVIEW_STATES: {state: ReviewState; label: string}[] = [
  {state: "pending", label: "Awaiting review"},
  {state: "approved", label: "Approved"},
  {state: "rejected", label: "Rejected"},
];
const stateLabel = (state: string) => REVIEW_STATES.find((s) => s.state === state)?.label ?? state;
/** A coloured orb and the state in the same colour (amber, green or red), shared by corrections, history, account requests and guides. No box. */
export function StateLabel({state, label}: {state: string; label?: string}) {
  return <span className={"state-label state-" + state}><i aria-hidden="true" />{label ?? stateLabel(state)}</span>;
}
export function timeAgo(iso: string) {
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (!Number.isFinite(s)) return "";
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {day: "numeric", month: "short", year: s > 86400 * 300 ? "numeric" : undefined});
}
const fullDate = (iso: string) => new Date(iso).toLocaleString();
type Payload = {label?:string;planning?:boolean;pace?:number;unit?:string;averageXp?:number|null;denominator?:number;username?:string;count?:number;pet?:string};
const payloadOf = (c: Change): Payload => {try {return JSON.parse(c.payload);} catch {return {};}};
export const changeTitle = (c: Change) => payloadOf(c).label ?? c.target;
function changeSummary(c: Change) {
  const p = payloadOf(c);
  if (p.planning) return `Planning pace ${p.pace?.toLocaleString()} ${p.unit}/hour${p.averageXp ? ` · observed ${p.averageXp.toLocaleString()} XP per pet (reference only)` : ""}`;
  return c.kind === "rate" ? `Drop rate 1/${p.denominator?.toLocaleString()}` : `${p.username} · ${p.count?.toLocaleString()} ${p.unit}`;
}

export function StaffOverview({changes, memberCount, viewer, onNavigate, onFilter}: {changes: Change[]; memberCount: number | null; viewer: Viewer; onNavigate: (tab: StaffTabId) => void; onFilter: (state: ReviewState) => void}) {
  const counts = Object.fromEntries(REVIEW_STATES.map(({state}) => [state, changes.filter((c) => c.state === state).length])) as Record<ReviewState, number>;
  const reviews = viewer.permissions.corrections;
  return <div className="staff-overview">
    <div className={"staff-stats" + (reviews ? "" : " is-solo")}>
      {reviews && REVIEW_STATES.map(({state, label}) => <button key={state} type="button" className={"staff-stat state-" + state} onClick={() => state === "pending" ? onNavigate("corrections") : onFilter(state)}>
        <small><i aria-hidden="true" />{label}</small><b>{counts[state]}</b><span>{state === "pending" ? "Open review queue" : `View ${label.toLowerCase()}`} →</span>
      </button>)}
      <div className="staff-stat staff-stat-role">
        <small>Your role</small><StaffBadge staff={{role: viewer.role, prefix: null}} />
        <span>{memberCount === null ? (Object.keys(STAFF_AREAS) as StaffArea[]).filter((k) => viewer.permissions[k]).map((k) => STAFF_AREAS[k]).join(" · ") || "Account requests" : `${memberCount} staff ${memberCount === 1 ? "member" : "members"}`}</span>
      </div>
    </div>
    {reviews && <ReviewActivity changes={changes} onHistory={() => onNavigate("history")} onQueue={() => onNavigate("corrections")} />}
    <div className="staff-quick-cards">
      {viewer.permissions.guides && <button type="button" onClick={() => onNavigate("guides")}><img src="/icons/navigation/quest-point-icon.png" alt="" /><span><b>Guide workshop</b><small>Write guides, insert requirements and build equipment setups.</small></span><em>Open workshop →</em></button>}
      {viewer.permissions.planning && <button type="button" onClick={() => onNavigate("planning")}><img src="/icons/navigation/combat-achievements-icon.png" alt="" /><span><b>Planning references</b><small>Review shared acquisition records and proposed planning rates.</small></span><em>Explore references →</em></button>}
      <button type="button" onClick={() => onNavigate("requests")}><img src="/icons/navigation/quest-list-icon.png" alt="" /><span><b>Account requests</b><small>Ownership disputes, evidence and account history.</small></span><em>Open requests →</em></button>
    </div>
  </div>;
}

/** Fourteen days of submissions coloured by outcome, then the latest decisions as plain rows. */
function ReviewActivity({changes, onHistory, onQueue}: {changes: Change[]; onHistory: () => void; onQueue: () => void}) {
  const days = Array.from({length: 14}, (_, i) => {
    const d = new Date();d.setDate(d.getDate() - (13 - i));const day = d.toISOString().slice(0, 10);
    const today = changes.filter((c) => c.created_at.slice(0, 10) === day);
    return {day, label: d.toLocaleDateString(undefined, {day: "numeric", month: "short"}), total: today.length, parts: REVIEW_STATES.map(({state}) => ({state, count: today.filter((c) => c.state === state).length}))};
  });
  const max = Math.max(1, ...days.map((d) => d.total)), recent = [...changes].sort((a, b) => (b.reviewed_at ?? b.created_at).localeCompare(a.reviewed_at ?? a.created_at)).slice(0, 6);
  return <section className="staff-card staff-activity" aria-labelledby="staff-activity-title">
    <header><div><h3 id="staff-activity-title">Review activity</h3><p>Submissions over the last 14 days, by outcome.</p></div>
      <ul className="staff-legend" aria-label="Legend">{REVIEW_STATES.map(({state, label}) => <li key={state} className={"state-" + state}><i aria-hidden="true" />{label}</li>)}</ul></header>
    {days.some((d) => d.total > 0) ? <div className="staff-activity-chart" role="img" aria-label={days.filter((d) => d.total).map((d) => `${d.label}: ${d.parts.filter((p) => p.count).map((p) => `${p.count} ${stateLabel(p.state).toLowerCase()}`).join(", ")}`).join("; ")}>
      {days.map((d, i) => <div key={d.day} title={`${d.label}: ${d.total} ${d.total === 1 ? "submission" : "submissions"}`}>
        <span className="staff-activity-bar" style={{height: `${(d.total / max) * 100}%`}}>{d.parts.filter((p) => p.count).map((p) => <i key={p.state} className={"state-" + p.state} style={{flexGrow: p.count}} />)}</span>
        <small aria-hidden="true">{i % 2 === 1 || i === 13 ? d.label : ""}</small>
      </div>)}
    </div> : <div className="staff-activity-empty"><img src="/icons/navigation/quest-list-icon.png" alt="" /><div><b>No submissions in the last 14 days</b><p>New proposals and review decisions will appear here.</p></div></div>}
    {recent.length > 0 && <><h4>Latest activity</h4><ol className="staff-activity-list">{recent.map((c) => <li key={c.id}>
      <StateLabel state={c.state} />
      <div><b>{changeTitle(c)}</b><small>{c.actor_name} proposed{c.reviewed_at ? ` · ${c.reviewer_name ?? "a reviewer"} ${c.state === "approved" ? "approved" : "rejected"}` : " · waiting for a reviewer"}</small></div>
      <time dateTime={c.reviewed_at ?? c.created_at} title={fullDate(c.reviewed_at ?? c.created_at)}>{timeAgo(c.reviewed_at ?? c.created_at)}</time>
    </li>)}</ol></>}
    <footer><button type="button" className="btn sm ghost" onClick={onQueue}>Review queue</button><button type="button" className="link" onClick={onHistory}>Full history →</button></footer>
  </section>;
}

export function CorrectionCard({change: c, review = false, busy = false, onDecision}: {change: Change; review?: boolean; busy?: boolean; onDecision?: (d: "approved" | "rejected") => void}) {
  return <article className={"correction state-" + c.state}>
    <header><StateLabel state={c.state} /><time dateTime={c.created_at} title={fullDate(c.created_at)}>{timeAgo(c.created_at)}</time></header>
    <h3>{changeTitle(c)}</h3>
    <p className="correction-change">{changeSummary(c)}</p>
    <p className="correction-reason">{c.reason}</p>
    <footer><span>Proposed by <b>{c.actor_name}</b></span>{c.reviewed_at && <span>{c.state === "approved" ? "Approved" : "Rejected"} by <b>{c.reviewer_name ?? "a reviewer"}</b> · {timeAgo(c.reviewed_at)}</span>}<a className="link" href={c.source} target="_blank" rel="noreferrer">Evidence <ExternalLink size={13} /></a></footer>
    {review && <div className="correction-actions"><button className="btn sm primary" disabled={busy} onClick={() => onDecision?.("approved")}>Approve &amp; publish</button><button className="btn sm ghost" disabled={busy} onClick={() => onDecision?.("rejected")}>Reject</button></div>}
  </article>;
}
