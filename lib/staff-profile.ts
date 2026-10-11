import {HttpError} from './auth';
import {requireStaff} from './staff-store';
import {accountName,db,readJournal,sameOrigin} from './storage';
import {mayGrant,mayManageProfile,type StaffRole} from './staff-policy';
import {publicProfile} from './profile-store';
import {takeBudget} from './request-controls';
import {validVisibility} from './profile-privacy';
import {editableTitleChoice,titleChoices} from './presentation';
import {earnedMarks} from './flair';

/** The titles and badges this player can show: every achievement title (assignable once unlocked) and their earned badges. */
async function showcase(name:string,role:StaffRole|null){
 const [flair,journal]=await Promise.all([publicProfile(name,null),readJournal(name)]);
 const supporter=!!flair.supporter;
 return {flair,titles:titleChoices(journal,supporter,role).map(({id,label,requirement,unlocked})=>({id,label,requirement,unlocked})),badges:earnedMarks(journal),
  titleId:editableTitleChoice(journal,flair.titleChoice??'auto',flair.pinnedMark,false,supporter,role)};
}

/** Who holds a RuneScape name: the linked Discord account (claim), the reservation kept after an unlink, and that account's rank. */
type Holder={claim:string|null;reservation:string|null;role:StaffRole|null;username:string|null;globalName:string|null};
async function holder(rsn:string):Promise<Holder>{
 return (await db().prepare(`SELECT c.discord_id AS claim,r.discord_id AS reservation,s.role,u.username,u.global_name AS globalName
  FROM (SELECT ? AS rsn) n LEFT JOIN claimed_names c ON c.rsn=n.rsn LEFT JOIN profile_link_owners r ON r.rsn=n.rsn
  LEFT JOIN staff_members s ON s.discord_id=COALESCE(c.discord_id,r.discord_id) LEFT JOIN users u ON u.discord_id=COALESCE(c.discord_id,r.discord_id)`).bind(rsn).first<Holder>())!;
}
/** A reservation can also be a moderation hold ("moderation-hold:<case>"), which only a reviewed request releases. */
const discordAccount=(id:string|null)=>!!id&&/^\d{5,32}$/.test(id);
const ownerOf=(h:Holder)=>h.claim??(discordAccount(h.reservation)?h.reservation:null);
async function manager(req:Request){
 const actor=await requireStaff(req);
 if(actor.role!=='owner'&&actor.role!=='admin')throw new HttpError(403,'Only Owners and Admins use staff controls.');
 return actor;
}
function nameFrom(value:unknown){
 if(typeof value!=='string'||!/^[A-Za-z0-9 _-]{1,12}$/.test(value.trim()))throw new HttpError(400,'Enter a valid RuneScape name.');
 return accountName(value);
}

/** The quick staff panel on a profile: rank, profile settings and the Discord link, with what this viewer may change. */
export async function staffProfileView(req:Request){
 const actor=await manager(req),name=nameFrom(new URL(req.url).searchParams.get('username')),rsn=name.toLowerCase(),h=await holder(rsn),owner=ownerOf(h);
 const roles:(StaffRole|null)[]=['helper','moderator','admin',null];
 const allowed=h.claim?roles.filter(role=>mayGrant(actor,{id:h.claim!,role:h.role},role)):[];
 const linkedNames=owner?(await db().prepare('SELECT display_name FROM claimed_names WHERE discord_id=? ORDER BY display_name').bind(owner).all<{display_name:string}>()).results.map(r=>r.display_name):[];
 const manage=!!owner&&mayManageProfile(actor,{id:owner,role:h.role});
 const shown=h.claim?await showcase(name,h.role):null,flair=shown?.flair;
 const journal=!!await db().prepare('SELECT 1 FROM journals WHERE id=?').bind(rsn).first();
 return {
  name,linkedNames,role:h.role,allowed,
  reason:!h.claim?'Link this name to a Discord account to set a rank.':!allowed.length?'You cannot change your own rank or manage this rank.':null,
  manage,journal,
  account:{linked:!!h.claim,discordName:owner?h.globalName||h.username:null,username:owner?h.username:null,hold:!h.claim&&!!h.reservation&&!discordAccount(h.reservation),
   canUnlink:manage&&!!h.claim,canRelink:manage&&!h.claim&&discordAccount(h.reservation)},
  profile:flair&&shown?{visibility:flair.visibility??'public',title:flair.showcase?.achievementTitle??null,badge:flair.showcase?.badge?.name??null,
   titleId:shown.titleId,badgeId:flair.showcase?.badge?.id??null,titles:shown.titles,badges:shown.badges}:null,
 };
}

/** Audited staff changes to someone else's profile. Each write is gated on its own audit row, and the audit row on
 * the actor's rank and the name's current claim, reservation and owner rank, so a change in between applies nothing. */
export async function staffProfileAction(req:Request,body:Record<string,unknown>){
 if(req.headers.get('origin')!==new URL(req.url).origin)throw new HttpError(403,'Use the staff controls to make changes.');
 try{sameOrigin(req);}catch{throw new HttpError(403,'Use the staff controls to make changes.');}
 const actor=await manager(req);await takeBudget('staff-profile:'+actor.id,30,60);
 const name=nameFrom(body.username),rsn=name.toLowerCase(),h=await holder(rsn),owner=ownerOf(h);
 if(!owner)throw new HttpError(404,h.reservation?'This name is on a moderation hold. Use an account request.':'This name is not linked to a Discord account.');
 if(!mayManageProfile(actor,{id:owner,role:h.role}))throw new HttpError(403,'You cannot change your own account, the owner’s, or an account of your rank here.');
 const database=db(),now=new Date().toISOString(),token=crypto.randomUUID();
 const guard=`EXISTS(SELECT 1 FROM staff_members WHERE discord_id=? AND role=?) AND COALESCE((SELECT discord_id FROM claimed_names WHERE rsn=?),'')=?
  AND COALESCE((SELECT discord_id FROM profile_link_owners WHERE rsn=?),'')=? AND COALESCE((SELECT role FROM staff_members WHERE discord_id=?),'')=?`;
 const audit=(label:string,detail:object)=>database.prepare(`INSERT INTO account_actions(rsn,actor_id,actor_name,action,detail,created_at) SELECT ?,?,?,?,?,? WHERE ${guard}`)
  .bind(rsn,actor.id,actor.globalName||actor.username,label,JSON.stringify({...detail,token}),now,actor.id,actor.role,rsn,h.claim??'',rsn,h.reservation??'',owner,h.role??'');
 const gate=`EXISTS(SELECT 1 FROM account_actions WHERE rsn=? AND actor_id=? AND json_extract(detail,'$.token')=?)`;
 const gated=(sql:string,...values:(string|number|null)[])=>database.prepare(sql.replaceAll('$GATE',gate)).bind(...values,rsn,actor.id,token);
 const linked=()=>{if(!h.claim)throw new HttpError(409,'This name is not linked. Relink it first.');};
 const confirmed=()=>{if(body.confirmed!==true)throw new HttpError(400,'Confirm this change.');};
 let writes;
 if(body.action==='visibility'){
  linked();if(!validVisibility(body.visibility))throw new HttpError(400,'Choose Public or Private.');
  const before=(await database.prepare('SELECT visibility FROM profile_visibility WHERE rsn=?').bind(rsn).first<{visibility:string}>())?.visibility??'public';
  writes=[audit('staff visibility',{from:before,to:body.visibility}),gated("INSERT INTO profile_visibility(rsn,visibility) SELECT ?,? WHERE $GATE ON CONFLICT(rsn) DO UPDATE SET visibility=excluded.visibility",rsn,body.visibility)];
 }else if(body.action==='set-title'&&body.title!=='none'){
  // Only a real achievement title this player has unlocked; "none" is the same as clearing.
  linked();const shown=await showcase(name,h.role),choice=shown.titles.find(t=>t.id===body.title);
  if(!choice)throw new HttpError(400,'Choose an achievement title.');
  if(!choice.unlocked)throw new HttpError(400,'That title is not unlocked for this player.');
  writes=[audit('staff title set',{from:shown.titleId,to:choice.id}),gated("INSERT INTO profile_presentation(rsn,title_choice) SELECT ?,? WHERE $GATE ON CONFLICT(rsn) DO UPDATE SET title_choice=excluded.title_choice",rsn,choice.id)];
 }else if(body.action==='set-badge'&&body.badge!==null){
  // Only a badge this player has earned; null is the same as clearing.
  linked();if(typeof body.badge!=='string')throw new HttpError(400,'Choose a badge.');
  const shown=await showcase(name,h.role),badge=shown.badges.find(b=>b.id===body.badge);
  if(!badge)throw new HttpError(400,'That badge is not earned by this player.');
  writes=[audit('staff badge set',{from:shown.flair.showcase?.badge?.id??null,to:badge.id}),gated('UPDATE claimed_names SET pinned_mark=? WHERE rsn=? AND $GATE',badge.id,rsn)];
 }else if(body.action==='clear-title'||body.action==='set-title'){
  linked();const before=(await database.prepare('SELECT title_choice FROM profile_presentation WHERE rsn=?').bind(rsn).first<{title_choice:string}>())?.title_choice??'auto';
  writes=[audit('staff title cleared',{from:before}),gated("INSERT INTO profile_presentation(rsn,title_choice) SELECT ?,'none' WHERE $GATE ON CONFLICT(rsn) DO UPDATE SET title_choice='none'",rsn)];
 }else if(body.action==='clear-badge'||body.action==='set-badge'){
  linked();const before=(await database.prepare('SELECT pinned_mark FROM claimed_names WHERE rsn=?').bind(rsn).first<{pinned_mark:string|null}>())?.pinned_mark??null;
  writes=[audit('staff badge cleared',{from:before}),gated('UPDATE claimed_names SET pinned_mark=NULL WHERE rsn=? AND $GATE',rsn)];
 }else if(body.action==='unlink'){
  // Same as the owner unlinking it themselves: the name stays reserved to that Discord account, with its flair saved.
  linked();confirmed();
  writes=[audit('staff unlink',{from:h.claim}),
   gated(`INSERT INTO profile_link_owners(rsn,discord_id,linked_at,saved_flair)
    SELECT rsn,discord_id,claimed_at,json_object('companion_pet',companion_pet,'display_piece',display_piece,'equipped',equipped,'pinned_mark',pinned_mark)
    FROM claimed_names WHERE rsn=? AND $GATE ON CONFLICT(rsn) DO UPDATE SET saved_flair=excluded.saved_flair WHERE profile_link_owners.discord_id=excluded.discord_id`,rsn),
   gated('DELETE FROM claimed_names WHERE rsn=? AND $GATE',rsn)];
 }else if(body.action==='relink'){
  // Only back to the Discord account that still holds the reservation; moving a name to someone else is a reviewed request.
  confirmed();if(h.claim||!discordAccount(h.reservation))throw new HttpError(409,'Only an unlinked name can be relinked to its own Discord account.');
  writes=[audit('staff relink',{to:h.reservation}),
   gated(`INSERT INTO claimed_names(rsn,display_name,discord_id,claimed_at,companion_pet,display_piece,equipped,pinned_mark)
    SELECT rsn,?,discord_id,?,json_extract(saved_flair,'$.companion_pet'),json_extract(saved_flair,'$.display_piece'),json_extract(saved_flair,'$.equipped'),json_extract(saved_flair,'$.pinned_mark')
    FROM profile_link_owners WHERE rsn=? AND $GATE`,name,Date.now(),rsn)];
 }else throw new HttpError(400,'Unknown staff profile action.');
 const results=await database.batch(writes);
 if(!results[0].meta.changes)throw new HttpError(409,'The account or your staff access changed. Refresh and retry.');
 return {ok:true};
}
