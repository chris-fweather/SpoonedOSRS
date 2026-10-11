import {staffPermissions,parseStaffPermissions,isEditableStaffRole,EDITABLE_STAFF_ROLES,type StaffPermissions,type StaffArea} from './staff-permissions';
import {planningCatalogue,parsePlanning} from './planning-catalogue';
import {HttpError,readSession} from './auth';
import {db,sameOrigin} from './storage';
import {publicMessage} from './request-body';
import {evidenceUrl,mayGrant,mayReview,type StaffRole} from './staff-policy';
import {publicStaff} from './staff-data';
import {rateCatalogue} from './rate-catalogue';
import seed from './catalogue.json';
import {discordAvatarUrl} from './session';

type StaffMember={discord_id:string;role:StaffRole;prefix:'Sir'|null;revision:string};
type Change={id:number;kind:'rate'|'record';target:string;payload:string;source:string;reason:string;base_revision:number;actor_id:string;actor_name:string;state:string;reviewer_id:string|null;reviewer_name?:string|null;created_at:string;reviewed_at:string|null};
type AreaRow=Record<StaffArea,number>;
/** Saved rank defaults. Until the role migration runs, every rank uses the shipped defaults. */
async function roleDefaults():Promise<(AreaRow & {role:string})[]>{
 try{return (await db().prepare('SELECT role,guides,corrections,planning FROM staff_role_permissions').all<AreaRow & {role:string}>()).results;}
 catch(error){if(String(error).includes('no such table'))return [];throw error;}
}
/** SQL that stays true while staff row `s` still has `area`: own row, then rank default, then the shipped default. */
export function areaGuard(area:StaffArea){return `(s.role='owner' OR COALESCE((SELECT ${area} FROM staff_permissions p WHERE p.discord_id=s.discord_id),(SELECT ${area} FROM staff_role_permissions r WHERE r.role=s.role),${area==='guides'?'1':"s.role<>'helper'"})=1)`;}
export async function requireStaff(req:Request) {
 const user=await readSession(req);if(!user)throw new HttpError(401,'Sign in with Discord to open the staff portal.');
 const staff=await publicStaff(user.id);if(!staff)throw new HttpError(403,'Your account has not been granted a staff role.');
 const [row,roles]=await Promise.all([db().prepare('SELECT guides,corrections,planning FROM staff_permissions WHERE discord_id=?').bind(user.id).first<AreaRow>(),staff.role==='owner'?[]:roleDefaults()]);
 return {...user,...staff,permissions:staffPermissions(staff.role,row,roles.find(r=>r.role===staff.role))};
}
export async function requireStaffArea(req:Request,area:keyof StaffPermissions){const actor=await requireStaff(req);if(!actor.permissions[area])throw new HttpError(403,'Your staff access does not include this workspace.');return actor;}
export async function staffDashboard(req:Request) {
 const user=await requireStaff(req);
 // Admins and the owner see the player directory; the team, rank permissions and access history are the owner's.
 const manager=user.role==='admin'||user.role==='owner',owner=user.role==='owner';
 const changes=user.permissions.corrections?await db().prepare("SELECT c.*,COALESCE(r.global_name,r.username) AS reviewer_name FROM staff_changes c LEFT JOIN users r ON r.discord_id=c.reviewer_id WHERE c.state='pending' OR c.id IN (SELECT id FROM staff_changes ORDER BY id DESC LIMIT 100) ORDER BY c.id DESC").all<Change>():{results:[]};
 const roles=owner?await roleDefaults():[];
 type MemberRow={discord_id:string;role:StaffRole;prefix:string|null;username:string;global_name:string|null;avatar:string|null;linked_names:string} & Record<StaffArea,number|null>;
 const members=owner ? (await db().prepare('SELECT s.discord_id,s.role,s.prefix,u.username,u.global_name,u.avatar,p.guides,p.corrections,p.planning,(SELECT json_group_array(display_name) FROM claimed_names c WHERE c.discord_id=s.discord_id) AS linked_names FROM staff_members s JOIN users u ON u.discord_id=s.discord_id LEFT JOIN staff_permissions p ON p.discord_id=s.discord_id ORDER BY s.role,u.username').all<MemberRow>()).results
  .map(({avatar,...m})=>({...m,avatarUrl:avatar?discordAvatarUrl(m.discord_id,avatar):null,custom:m.guides!==null,permissions:staffPermissions(m.role,m,roles.find(r=>r.role===m.role))})) : [];
 const audit=owner ? (await db().prepare('SELECT a.*,COALESCE(au.global_name,au.username) AS actor_name,COALESCE(tu.global_name,tu.username) AS target_name FROM staff_audit a LEFT JOIN users au ON au.discord_id=a.actor_id LEFT JOIN users tu ON tu.discord_id=a.target_id ORDER BY a.id DESC LIMIT 50').all()).results : [];
 // What each rank opens by default; the owner column is always every area.
 const rolePermissions=owner?Object.fromEntries(EDITABLE_STAFF_ROLES.map(role=>[role,staffPermissions(role,null,roles.find(r=>r.role===role))])):null;
 const q=new URL(req.url).searchParams.get('q')?.trim().toLowerCase()??'';
 const observations=user.permissions.planning?await databaseObservations():[];
 const players=manager?(await db().prepare(`SELECT c.display_name AS name,u.username AS discordName,c.claimed_at AS linkedAt,s.role,COALESCE(v.visibility,'public') AS visibility,(SELECT json_group_array(display_name) FROM claimed_names all_names WHERE all_names.discord_id=c.discord_id) AS linked_names FROM claimed_names c JOIN users u ON u.discord_id=c.discord_id LEFT JOIN staff_members s ON s.discord_id=c.discord_id LEFT JOIN profile_visibility v ON v.rsn=c.rsn WHERE instr(lower(c.display_name),?)>0 OR instr(lower(u.username),?)>0 ORDER BY c.display_name LIMIT 30`).bind(q.slice(0,80),q.slice(0,80)).all()).results:[];
 return {players,observations,rolePermissions,viewer:{id:user.id,name:user.globalName||user.username,role:user.role,prefix:user.prefix,permissions:user.permissions},members,changes:changes.results,audit,
  planningTargets:user.permissions.planning?planningCatalogue():[],overrides:user.permissions.planning?(await db().prepare("SELECT kind,target,payload,source,revision FROM staff_overrides WHERE kind='rate'").all()).results:[],targets:user.permissions.corrections&&q.length>=2?rateCatalogue().filter(t=>`${t.source} ${t.table} ${t.item}`.toLowerCase().includes(q)).slice(0,60):[],pets:seed.pets.map(p=>p.name)};
}
export async function staffAction(req:Request,body:Record<string,unknown>) {
 try{sameOrigin(req);}catch{throw new HttpError(403,'Use the staff portal to make changes.');}
 const actor=await requireStaff(req), database=db(), now=new Date().toISOString();
 if(body.action==='prefix') {
  if(body.prefix!==null&&body.prefix!=='Sir')throw new HttpError(400,'Choose Sir or no prefix.');
  await database.prepare('UPDATE staff_members SET prefix=? WHERE discord_id=?').bind(body.prefix,actor.id).run();return;
 }
 if(body.action==='role-permissions') {
  if(actor.role!=='owner')throw new HttpError(403,'Only the owner can change what each rank can open.');
  if(!isEditableStaffRole(body.role))throw new HttpError(400,'Choose helper, moderator or admin.');
  let permissions;try{permissions=parseStaffPermissions(body.permissions);}catch(e){throw new HttpError(400,publicMessage(e,'Choose valid workspace permissions.'));}
  const before=staffPermissions(body.role,null,(await roleDefaults()).find(r=>r.role===body.role));
  // The owner check is repeated in the write, so a rank change in between cannot apply a stale request.
  const owner="EXISTS(SELECT 1 FROM staff_members WHERE discord_id=? AND role='owner')";
  const results=await database.batch([
   database.prepare(`INSERT INTO staff_role_permissions(role,guides,corrections,planning) SELECT ?,?,?,? WHERE ${owner} ON CONFLICT(role) DO UPDATE SET guides=excluded.guides,corrections=excluded.corrections,planning=excluded.planning`).bind(body.role,+permissions.guides,+permissions.corrections,+permissions.planning,actor.id),
   database.prepare(`INSERT INTO staff_audit(actor_id,target_id,action,detail,created_at) SELECT ?,?,'role-permissions',?,? WHERE ${owner}`).bind(actor.id,'role:'+body.role,JSON.stringify({role:body.role,from:before,to:permissions}),now,actor.id),
  ]);if(!results[0].meta.changes)throw new HttpError(409,'Staff access changed. Refresh and retry.');return;
 }
 if(body.action==='grant'||body.action==='permissions') {
  if(actor.role!=='admin'&&actor.role!=='owner')throw new HttpError(403,'Only admins can manage staff.');
  // Ranks follow mayGrant (admins manage helpers and moderators); a member's own access is the owner's call.
  if(body.action==='permissions'&&actor.role!=='owner')throw new HttpError(403,'Only the owner can give a member their own access.');
  if(typeof body.username!=='string'||!/^[A-Za-z0-9 _-]{1,12}$/.test(body.username.trim()))throw new HttpError(400,'Enter a linked RuneScape name.');
  const linked=await database.prepare('SELECT discord_id FROM claimed_names WHERE rsn=?').bind(body.username.trim().toLowerCase()).first<{discord_id:string}>();
  if(!linked)throw new HttpError(400,'That name must be linked to a Discord account first.');
  const current=await database.prepare('SELECT * FROM staff_members WHERE discord_id=?').bind(linked.discord_id).first<StaffMember>();
  const role=body.action==='permissions'?current?.role??null:body.role;
  if(role!==null&&role!=='helper'&&role!=='moderator'&&role!=='admin')throw new HttpError(400,'Choose a valid staff role.');
  if(!mayGrant(actor,{id:linked.discord_id,role:current?.role??null},role))throw new HttpError(403,'You cannot change your own rank or manage that rank.');
  if(body.action==='permissions'){
   if(!current)throw new HttpError(400,'Grant a staff role before choosing permissions.');
   // null removes the member's own row, so their rank defaults apply again.
   let permissions:StaffPermissions|null=null;if(body.permissions!==null)try{permissions=parseStaffPermissions(body.permissions);}catch(e){throw new HttpError(400,publicMessage(e,'Choose valid workspace permissions.'));}
   const revision=crypto.randomUUID();
   const results=await database.batch([
    database.prepare("UPDATE staff_members SET revision=? WHERE discord_id=? AND revision=? AND EXISTS(SELECT 1 FROM staff_members WHERE discord_id=? AND role='owner')").bind(revision,linked.discord_id,current.revision,actor.id),
    permissions?database.prepare('INSERT INTO staff_permissions(discord_id,guides,corrections,planning) SELECT discord_id,?,?,? FROM staff_members WHERE discord_id=? AND revision=? ON CONFLICT(discord_id) DO UPDATE SET guides=excluded.guides,corrections=excluded.corrections,planning=excluded.planning').bind(+permissions.guides,+permissions.corrections,+permissions.planning,linked.discord_id,revision)
     :database.prepare('DELETE FROM staff_permissions WHERE discord_id=? AND EXISTS(SELECT 1 FROM staff_members WHERE discord_id=? AND revision=?)').bind(linked.discord_id,linked.discord_id,revision),
    database.prepare("INSERT INTO staff_audit(actor_id,target_id,action,detail,created_at) SELECT ?,?,'permissions',?,? WHERE EXISTS(SELECT 1 FROM staff_members WHERE discord_id=? AND revision=?)").bind(actor.id,linked.discord_id,JSON.stringify(permissions??{reset:true}),now,linked.discord_id,revision)
   ]);if(!results[0].meta.changes)throw new HttpError(409,'Staff access changed. Refresh and retry.');return;
  }
  const revision=crypto.randomUUID();
  // Permissions and target revision are rechecked in the write to prevent a stale grant.
  const guard=`EXISTS(SELECT 1 FROM staff_members a WHERE a.discord_id=? AND a.role=?) AND COALESCE((SELECT revision FROM staff_members WHERE discord_id=?),'')=?`;
  if(role===null) {
   const result=await database.batch([
    database.prepare(`INSERT INTO staff_audit(actor_id,target_id,action,detail,created_at) SELECT ?,?,'revoke',?,? WHERE ${guard}`).bind(actor.id,linked.discord_id,JSON.stringify({from:current?.role??null,to:null}),now,actor.id,actor.role,linked.discord_id,current?.revision??''),
    database.prepare(`DELETE FROM staff_members WHERE discord_id=? AND ${guard}`).bind(linked.discord_id,actor.id,actor.role,linked.discord_id,current?.revision??''),
   ]);if(!result[0].meta.changes)throw new HttpError(409,'Staff access changed. Refresh and try again.');
  }else{
   const result=await database.batch([
    database.prepare(`INSERT INTO staff_members(discord_id,role,prefix,revision) SELECT ?,?,NULL,? WHERE ${guard} ON CONFLICT(discord_id) DO UPDATE SET role=excluded.role,revision=excluded.revision`).bind(linked.discord_id,role,revision,actor.id,actor.role,linked.discord_id,current?.revision??''),
    database.prepare("INSERT INTO staff_audit(actor_id,target_id,action,detail,created_at) SELECT ?,?,'grant',?,? WHERE EXISTS(SELECT 1 FROM staff_members WHERE discord_id=? AND revision=?)").bind(actor.id,linked.discord_id,JSON.stringify({from:current?.role??null,to:role}),now,linked.discord_id,revision),
   ]);if(!result[0].meta.changes)throw new HttpError(409,'Staff access changed. Refresh and try again.');
  }return;
 }
 if(body.action==='propose') {
  if(!actor.permissions[body.mode==='planning'?'planning':'corrections'])throw new HttpError(403,'Your staff access does not include this workspace.');
  if(body.kind!=='rate'&&body.kind!=='record')throw new HttpError(400,'Choose a correction type.');
  if(typeof body.reason!=='string'||body.reason.trim().length<10||body.reason.length>2000)throw new HttpError(400,'Explain the correction in 10–2,000 characters.');
  let source:string;try{source=evidenceUrl(body.source,body.kind==='rate'&&body.mode!=='planning');}catch(e){throw new HttpError(400,publicMessage(e,'Enter a valid evidence link.'));}
  let target:string,payload:object;
  if(body.kind==='rate'&&body.mode==='planning'){
   try{payload=parsePlanning(body.target,body.pace,body.averageXp);target=String(body.target);}catch(e){throw new HttpError(400,publicMessage(e,'Enter a valid planning estimate.'));}
  }else if(body.kind==='rate') {
   const known=rateCatalogue().find(t=>t.key===body.target);if(!known)throw new HttpError(400,'Choose a supported source, table and item.');
   if(typeof body.denominator!=='number'||!Number.isFinite(body.denominator)||body.denominator<1||body.denominator>1e12)throw new HttpError(400,'Enter a denominator from 1 to 1,000,000,000,000.');
   target=known.key;payload={denominator:body.denominator,label:`${known.source} · ${known.table} · ${known.item}`};
  }else{
   if(typeof body.pet!=='string'||!seed.pets.some(p=>p.name===body.pet))throw new HttpError(400,'Choose a pet.');
   if(typeof body.username!=='string'||!/^[A-Za-z0-9 _-]{1,12}$/.test(body.username.trim()))throw new HttpError(400,'Enter a RuneScape name.');
   if(typeof body.count!=='number'||!Number.isSafeInteger(body.count)||body.count<0||body.count>1e12)throw new HttpError(400,'Enter a valid recorded count.');
   if(!['kills','runs','raids','rolls','XP','catches','pickpockets','clues','harvests'].includes(String(body.unit)))throw new HttpError(400,'Choose the unit matching the evidence.');
   target=body.pet;payload={pet:body.pet,username:body.username.trim(),count:body.count,unit:body.unit,note:body.reason,date:null,proof:source,clog:null};
  }
  const base=await database.prepare('SELECT revision FROM staff_overrides WHERE kind=? AND target=?').bind(body.kind,target).first<{revision:number}>();
  const area=body.mode==='planning'?'planning':'corrections';
  const result=await database.prepare(`INSERT INTO staff_changes(kind,target,payload,source,reason,base_revision,actor_id,actor_name,created_at) SELECT ?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM staff_members s WHERE s.discord_id=? AND s.role=? AND ${areaGuard(area)})`).bind(body.kind,target,JSON.stringify(payload),source,body.reason.trim(),base?.revision??0,actor.id,actor.globalName||actor.username,now,actor.id,actor.role).run();if(!result.meta.changes)throw new HttpError(409,'Staff access changed. Refresh.');return;
 }
 if(body.action==='review') {
  if(!actor.permissions.corrections)throw new HttpError(403,'Your staff access does not include reviews.');
  if(!Number.isSafeInteger(body.id)||!['approved','rejected'].includes(String(body.decision)))throw new HttpError(400,'Choose a pending correction and decision.');
  const change=await database.prepare('SELECT * FROM staff_changes WHERE id=?').bind(body.id).first<Change>();
  if(!change||change.state!=='pending')throw new HttpError(409,'That correction was already reviewed. Refresh the queue.');
  if(!mayReview(actor.role,change.kind))throw new HttpError(403,'Your role cannot review this correction.');
  if(change.actor_id===actor.id)throw new HttpError(403,'A different authorised staff member must review your proposal.');
  if(body.decision==='rejected'){
   const r=await database.prepare(`UPDATE staff_changes SET state='rejected',reviewer_id=?,reviewed_at=? WHERE id=? AND state='pending' AND EXISTS(SELECT 1 FROM staff_members s WHERE s.discord_id=? AND s.role=? AND ${areaGuard('corrections')})`).bind(actor.id,now,change.id,actor.id,actor.role).run();if(!r.meta.changes)throw new HttpError(409,'Access or proposal changed. Refresh.');return;
  }
  const result=await database.batch([
   database.prepare(`INSERT INTO staff_overrides(kind,target,payload,source,revision)
    SELECT kind,target,payload,source,id FROM staff_changes WHERE id=? AND state='pending'
    AND COALESCE((SELECT revision FROM staff_overrides o WHERE o.kind=staff_changes.kind AND o.target=staff_changes.target),0)=base_revision
    AND EXISTS(SELECT 1 FROM staff_members s WHERE s.discord_id=? AND s.role=? AND ${areaGuard('corrections')})
    ON CONFLICT(kind,target) DO UPDATE SET payload=excluded.payload,source=excluded.source,revision=excluded.revision`).bind(change.id,actor.id,actor.role),
   database.prepare("UPDATE staff_changes SET state='approved',reviewer_id=?,reviewed_at=? WHERE id=? AND state='pending' AND EXISTS(SELECT 1 FROM staff_overrides WHERE revision=?)").bind(actor.id,now,change.id,change.id),
  ]);if(!result[0].meta.changes)throw new HttpError(409,'A newer correction or role change prevents publication. Refresh and submit a new proposal.');return;
 }
 throw new HttpError(400,'Unknown staff action.');
}

async function databaseObservations(){
 const result=await db().prepare(`SELECT json_extract(p.value,'$.name') AS pet,
 COALESCE(json_extract(p.value,'$.obtainedUnit'),'unknown') AS unit,
 COALESCE(json_extract(p.value,'$.obtainedMethod'),'Unspecified') AS method,
 COUNT(*) AS samples, ROUND(AVG(CAST(json_extract(p.value,'$.obtainedCount') AS REAL)),1) AS average,
 MIN(CAST(json_extract(p.value,'$.obtainedCount') AS REAL)) AS minimum,
 MAX(CAST(json_extract(p.value,'$.obtainedCount') AS REAL)) AS maximum
 FROM (SELECT j.id,j.data FROM journals j LEFT JOIN profile_visibility v ON v.rsn=j.id LEFT JOIN profile_options o ON o.rsn=j.id
 WHERE COALESCE(v.visibility,'public')='public' AND COALESCE(json_extract(o.details,'$.petRecords'),1)=1 AND COALESCE(json_extract(o.details,'$.pets'),1)=1
 ORDER BY j.id LIMIT 1000) j, json_each(j.data,'$.pets') p
 WHERE json_extract(p.value,'$.obtained')=1 AND json_type(p.value,'$.obtainedCount') IN ('integer','real')
 GROUP BY pet,unit,method ORDER BY samples DESC,pet LIMIT 100`).all();
 return result.results;
}
