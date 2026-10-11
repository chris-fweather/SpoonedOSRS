import {accountName,db,sameOrigin} from './storage';
import {HttpError} from './auth';
import {requireStaff} from './staff-store';
import {accountIdentity} from './account-identity';
import {canSubmitCase,canReviewCase,protectionReasons,validDiscordId} from './moderation-policy';
import records from './petcord-driest.json';
import {takeBudget} from './request-controls';
import type {Journal} from './model';

type Actor=Awaited<ReturnType<typeof requireStaff>>;
type Case={id:string;rsn:string;action:'unlink'|'relink';target_id:string|null;source_id:string|null;expected_claim:string|null;expected_reservation:string|null;protected:number;reason:string;creator_id:string;creator_name:string;created_at:string;state:string;reviewer_id:string|null;reviewed_at:string|null};
type Snapshot={rsn:string;claim:string|null;reservation:string|null;pets:number|null;log:number|null;data:string|null;revision:number|null;staffOwned:number;recordHolder:number;boardVersion:number;recordVersion:number};
const normal=(s:string)=>s.trim().toLowerCase().replaceAll('_',' ');
const recorded=new Set(records.records.map(r=>normal(r.username)));
export async function moderationSnapshot(name:string,target:string|null=null){
 const rsn=accountName(name).toLowerCase();
 const row=await db().prepare(`SELECT ? AS rsn,c.discord_id AS claim,r.discord_id AS reservation,s.pets,s.log,j.data,j.revision,
 (EXISTS(SELECT 1 FROM staff_members WHERE discord_id IN (c.discord_id,r.discord_id,?)) OR EXISTS(SELECT 1 FROM staff_cases WHERE rsn=n.rsn AND state='approved' AND protected=1)) AS staffOwned,
 (EXISTS(SELECT 1 FROM staff_overrides WHERE kind='record' AND lower(replace(json_extract(payload,'$.username'),'_',' '))=?) OR
 EXISTS(SELECT 1 FROM json_each(s.data,'$.hiscores.skills') WHERE json_extract(value,'$.rank')=1) OR
 EXISTS(SELECT 1 FROM json_each(s.data,'$.hiscores.activities') WHERE json_extract(value,'$.rank')=1)) AS recordHolder,
 (SELECT version FROM board_revision WHERE id=1) AS boardVersion,
 COALESCE((SELECT MAX(revision) FROM staff_overrides WHERE kind='record'),0) AS recordVersion
 FROM (SELECT ? AS rsn) n LEFT JOIN claimed_names c ON c.rsn=n.rsn LEFT JOIN profile_link_owners r ON r.rsn=n.rsn
 LEFT JOIN journal_summaries s ON s.rsn=n.rsn LEFT JOIN journals j ON j.id=n.rsn`).bind(rsn,target,normal(rsn),rsn).first<Snapshot>();
 if(!row||!row.claim&&!row.reservation)throw new HttpError(404,'No linked or reserved account was found.');
 const reasons=protectionReasons({pets:row.pets??0,log:row.log??0,recordHolder:!!row.recordHolder||recorded.has(normal(rsn)),staffOwned:!!row.staffOwned,unknown:row.revision===null||row.log===null});
 return {...row,reasons,protected:reasons.length>0};
}
function reason(value:unknown){if(typeof value!=='string'||value.trim().length<10||value.length>2000)throw new HttpError(400,'Add a reason or case note of 10–2,000 characters.');return value.trim();}
function mutationOrigin(req:Request){if(req.headers.get('origin')!==new URL(req.url).origin)throw new HttpError(403,'Use the staff portal to make changes.');sameOrigin(req);}
function guard(s:Snapshot,actor:Actor){return {sql:`(SELECT version FROM board_revision WHERE id=1)=? AND COALESCE((SELECT MAX(revision) FROM staff_overrides WHERE kind='record'),0)=? AND EXISTS(SELECT 1 FROM staff_members WHERE discord_id=? AND role=?)`,values:[s.boardVersion,s.recordVersion,actor.id,actor.role]};}
async function visibleCase(actor:Actor,id:string){
 const item=await db().prepare('SELECT * FROM staff_cases WHERE id=?').bind(id).first<Case>();if(!item)throw new HttpError(404,'Case not found.');
 const snapshot=await moderationSnapshot(item.rsn,item.target_id);
 if(!canSubmitCase(actor.role,!!item.protected||snapshot.protected))throw new HttpError(403,'Protected accounts require a moderator or admin.');
 return {item,snapshot};
}
export async function caseDashboard(req:Request){
 const actor=await requireStaff(req),url=new URL(req.url);await takeBudget('case-read:'+actor.id,90,60);
 const id=url.searchParams.get('id');if(id){
  const {item,snapshot}=await visibleCase(actor,id);
  const events=await db().prepare("SELECT * FROM account_actions WHERE rsn=? AND action<>'donor attribution reset' ORDER BY id DESC LIMIT 100").bind(item.rsn).all();
  return {item,events:events.results,reasons:snapshot.reasons,canReview:item.state==='pending'&&canReviewCase(actor.role,!!item.protected||snapshot.protected,actor.id,item.creator_id,snapshot.claim??item.source_id,item.target_id)};
 }
 const q=(url.searchParams.get('q')??'').trim().slice(0,80),before=url.searchParams.get('before')??'9999';
 const rows=await db().prepare(`SELECT * FROM staff_cases WHERE created_at<? AND (instr(rsn,?)>0 OR source_id=? OR target_id=? OR EXISTS(SELECT 1 FROM users u WHERE u.discord_id IN (staff_cases.source_id,staff_cases.target_id) AND (instr(lower(u.username),?)>0 OR instr(lower(COALESCE(u.global_name,'')),?)>0))) ${actor.role==='helper'?'AND protected=0':''} ORDER BY created_at DESC LIMIT 20`).bind(before,q.toLowerCase(),q,q,q.toLowerCase(),q.toLowerCase()).all<Case>();
 const items=[];for(const item of rows.results){try{const {snapshot}=await visibleCase(actor,item.id);items.push({...item,protected:+(!!item.protected||snapshot.protected)});}catch(e){if(!(e instanceof HttpError&&e.status===403))throw e;}}
 // Helpers handle cases, not unrestricted private account directories.
 const users=actor.role!=='helper'&&q.length>=2?(await db().prepare(`SELECT u.discord_id,u.username,u.global_name,(SELECT json_group_array(display_name) FROM claimed_names WHERE discord_id=u.discord_id) AS accounts FROM users u WHERE u.discord_id=? OR instr(lower(u.username),?)>0 OR instr(lower(COALESCE(u.global_name,'')),?)>0 OR EXISTS(SELECT 1 FROM claimed_names c WHERE c.discord_id=u.discord_id AND instr(lower(c.display_name),?)>0) ORDER BY CASE WHEN u.discord_id=? THEN 0 ELSE 1 END,u.username LIMIT 15`).bind(q,q.toLowerCase(),q.toLowerCase(),q.toLowerCase(),q).all()).results:[];
 return {items,users,next:rows.results.length===20?rows.results.at(-1)!.created_at:null,viewer:{id:actor.id,role:actor.role}};
}
export async function caseAction(req:Request,body:Record<string,unknown>){
 mutationOrigin(req);const actor=await requireStaff(req);await takeBudget('case-write:'+actor.id,30,60);
 const database=db(),now=new Date().toISOString();
 if(body.action==='create'){
  if(body.operation!=='unlink'&&body.operation!=='relink')throw new HttpError(400,'Choose unlink or relink.');
  const target=body.operation==='relink'?(validDiscordId(body.targetId)?accountIdentity(body.targetId):null):null;
  if(body.operation==='relink'&&!target)throw new HttpError(400,'Enter the destination Discord ID, not a display name.');
  const rsn=accountName(body.username).toLowerCase(),s=await moderationSnapshot(rsn,target),note=reason(body.reason);
  if(!canSubmitCase(actor.role,s.protected))throw new HttpError(403,'Helpers cannot open protected-account cases. Ask a moderator.');
  if(target&&(target===s.claim||target===s.reservation))throw new HttpError(400,'That Discord account already owns this profile.');
  const id=crypto.randomUUID(),g=guard(s,actor);
  const result=await database.batch([
   database.prepare(`INSERT INTO staff_cases(id,rsn,action,target_id,source_id,expected_claim,expected_reservation,protected,reason,creator_id,creator_name,created_at) SELECT ?,?,?,?,?,?,?,?,?,?,?,? WHERE ${g.sql}`).bind(id,rsn,body.operation,target,s.claim??s.reservation,s.claim,s.reservation,+s.protected,note,actor.id,actor.globalName||actor.username,now,...g.values),
   database.prepare(`INSERT INTO account_actions(rsn,case_id,actor_id,actor_name,action,detail,created_at) SELECT rsn,id,creator_id,creator_name,'case opened',reason,created_at FROM staff_cases WHERE id=?`).bind(id)
  ]);if(!result[0].meta.changes)throw new HttpError(409,'Account or staff access changed. Refresh and retry.');return {id};
 }
 if(typeof body.id!=='string')throw new HttpError(400,'Choose a case.');
 const {item,snapshot:s}=await visibleCase(actor,body.id),note=reason(body.reason);
 if(body.action==='note'){
  const g=guard(s,actor);const result=await database.prepare(`INSERT INTO account_actions(rsn,case_id,actor_id,actor_name,action,detail,created_at) SELECT ?,?,?,?,'note',?,? WHERE ${g.sql}`).bind(item.rsn,item.id,actor.id,actor.globalName||actor.username,note,now,...g.values).run();if(!result.meta.changes)throw new HttpError(409,'Access changed. Refresh.');return {id:item.id};
 }
 if(body.action!=='review'||!['approved','rejected'].includes(String(body.decision))||body.confirmed!==true)throw new HttpError(400,'Confirm the case decision.');
 if(item.state!=='pending')throw new HttpError(409,'This case was already reviewed.');
 if(!canReviewCase(actor.role,!!item.protected||s.protected,actor.id,item.creator_id,s.claim??item.source_id,item.target_id))throw new HttpError(403,'A different authorised reviewer must decide this case. Protected cases require an admin.');
 if(body.decision==='approved'&&(s.claim!==item.expected_claim||s.reservation!==item.expected_reservation))throw new HttpError(409,'Ownership changed since this case opened. Open a fresh case.');
 const token=crypto.randomUUID(),g=guard(s,actor),gate='EXISTS(SELECT 1 FROM staff_cases WHERE id=? AND execution_token=?)';
 const writes=[database.prepare(`UPDATE staff_cases SET state=?,reviewer_id=?,reviewed_at=?,execution_token=?,protected=? WHERE id=? AND state='pending' AND ${g.sql}`).bind(body.decision,actor.id,now,token,+(!!item.protected||s.protected),item.id,...g.values)];
 const stmt=(sql:string,...values:(string|number|null)[])=>database.prepare(sql).bind(...values,item.id,token);
 if(body.decision==='approved'){
  if(item.action==='relink'){
   // The former owner's private planning text and donor attribution never follow a transferred name.
   const journal=s.data?JSON.parse(s.data) as Journal:null;
   if(journal){
    const privateData=JSON.stringify(journal.pets.map(p=>({id:p.id,notes:p.notes,priority:p.priority})));
    journal.pets=journal.pets.map(p=>({...p,notes:'',priority:false}));
    writes.push(stmt(`INSERT INTO transfer_private_archives(case_id,owner_id,private_data,expires_at) SELECT ?,?,?,? WHERE ${gate}`,item.id,item.source_id,privateData,Date.now()+30*86400000));
    writes.push(stmt(`UPDATE journals SET data=?,revision=revision+1 WHERE id=? AND ${gate}`,JSON.stringify(journal),item.rsn));
   }
   writes.push(stmt(`INSERT OR IGNORE INTO users(discord_id,username,updated_at) SELECT ?,'Discord account (not signed in)',? WHERE ${gate}`,item.target_id,Date.now()));
   writes.push(stmt(`INSERT INTO claimed_names(rsn,display_name,discord_id,claimed_at) SELECT ?,?,?,? WHERE ${gate} ON CONFLICT(rsn) DO UPDATE SET discord_id=excluded.discord_id,claimed_at=excluded.claimed_at`,item.rsn,item.rsn,item.target_id,Date.now()));
   // Donation attribution stays with the original Discord identity, archived in a restricted audit entry.
   writes.push(stmt(`INSERT INTO account_actions(rsn,case_id,actor_id,action,detail,created_at) SELECT rsn,?,?, 'donor attribution reset',json_object('from',?,'amount',amount_minor,'currency',currency),? FROM profile_supporter_totals WHERE rsn=? AND ${gate}`,item.id,actor.id,item.source_id,now,item.rsn));
   writes.push(stmt(`DELETE FROM profile_supporter_totals WHERE rsn=? AND ${gate}`,item.rsn));
   writes.push(stmt(`DELETE FROM profile_presentation WHERE rsn=? AND ${gate}`,item.rsn));
  }else{
   writes.push(stmt(`DELETE FROM claimed_names WHERE rsn=? AND ${gate}`,item.rsn));
   writes.push(stmt(`UPDATE journals SET revision=revision+1 WHERE id=? AND ${gate}`,item.rsn));
  }
  writes.push(stmt(`INSERT INTO profile_link_owners(rsn,discord_id,linked_at,saved_flair) SELECT ?,?,?,'{}' WHERE ${gate} ON CONFLICT(rsn) DO UPDATE SET discord_id=excluded.discord_id,linked_at=excluded.linked_at,saved_flair='{}'`,item.rsn,item.target_id??'moderation-hold:'+item.id,Date.now()));
  writes.push(stmt(`INSERT INTO profile_visibility(rsn,visibility) SELECT ?,'private' WHERE ${gate} ON CONFLICT(rsn) DO UPDATE SET visibility='private'`,item.rsn));
 }
 writes.push(stmt(`INSERT INTO account_actions(rsn,case_id,actor_id,actor_name,action,detail,created_at) SELECT ?,?,?,?,?,?,? WHERE ${gate}`,item.rsn,item.id,actor.id,actor.globalName||actor.username,String(body.decision),JSON.stringify({reason:note,from:item.source_id,to:item.target_id,protection:s.reasons}),now));
 const results=await database.batch(writes);if(!results[0].meta.changes)throw new HttpError(409,'Account or staff access changed. Refresh and review again.');
 await database.prepare('DELETE FROM transfer_private_archives WHERE expires_at<?').bind(Date.now()).run();return {id:item.id};
}
