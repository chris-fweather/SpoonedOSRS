export type StaffRole = 'helper' | 'moderator' | 'admin' | 'owner';
export type PublicStaff = {role: StaffRole; prefix: 'Sir' | null; displayRole?:StaffRole|null; displayPrefix?:'Sir'|null};
export const STAFF_LABEL: Record<StaffRole,string> = {helper:'Helper',moderator:'Moderator',admin:'Admin',owner:'Owner'};
/** Rank colour class: helper green, moderator blue, admin red, owner gold (colours in app/globals.css, --rank-*). */
/** The username in the rank's colour wherever a staff member's name shows (the rank they display, if the owner picked another). */
export function rankNameClass(staff?:PublicStaff|null){return staff?'player-username rank-name-'+(staff.displayRole??staff.role):'player-username';}
export const STAFF_TONE: Record<StaffRole,string> = {helper:'rank-text-helper',moderator:'rank-text-moderator',admin:'rank-text-admin',owner:'rank-text-owner'};
export function mayGrant(actor:{id:string;role:StaffRole}, target:{id:string;role:StaffRole|null}, next:StaffRole|null) {
  if(actor.id===target.id || target.role==='owner' || next==='owner') return false;
  if(actor.role==='owner') return true;
  return actor.role==='admin' && target.role!=='admin' && (next===null||next==='helper'||next==='moderator');
}
/** Staff profile controls (visibility, title, badge, unlink, relink): admins and the owner, never on their own account,
 * the owner's, or (for admins) another admin's. The same reach as mayGrant. */
export function mayManageProfile(actor:{id:string;role:StaffRole}, owner:{id:string;role:StaffRole|null}) {
  if(actor.role!=='owner'&&actor.role!=='admin') return false;
  if(actor.id===owner.id || owner.role==='owner') return false;
  return actor.role==='owner' || owner.role!=='admin';
}
export function evidenceUrl(value:unknown, wikiOnly=false):string {
  if(typeof value!=='string'||value.length>1500) throw Error('Add a source URL.');
  const url=new URL(value);
  if(url.protocol!=='https:'||url.username||url.password) throw Error('Use a public HTTPS source link.');
  if(wikiOnly && (url.hostname!=='oldschool.runescape.wiki'||!url.pathname.startsWith('/w/'))) throw Error('Rate corrections need the relevant OSRS Wiki page.');
  return url.href;
}
const RANK_ORDER:Record<StaffRole,number>={helper:0,moderator:1,admin:2,owner:3};
/** A reviewer decides proposals from their own rank or below: a moderator never signs off an admin's change. */
export function mayReviewProposal(reviewer:StaffRole,proposer:StaffRole|null|undefined){return !proposer||RANK_ORDER[reviewer]>=RANK_ORDER[proposer];}
