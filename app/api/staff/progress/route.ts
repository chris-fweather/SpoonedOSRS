import {HttpError} from '@/lib/auth';
import {requireStaff} from '@/lib/staff-store';
import {db,readJournal,accountName} from '@/lib/storage';
import {requestJson,RequestError,publicMessage} from '@/lib/request-body';
import {takeBudget} from '@/lib/request-controls';
import {applyPetEdit} from '@/lib/pet-edit';
import {normalizeRates} from '@/lib/estimates';
import type {Pet} from '@/lib/model';
const headers={'Cache-Control':'private, no-store'};
async function admin(req:Request){const a=await requireStaff(req);if(a.role!=='admin'&&a.role!=='owner')throw new HttpError(403,'Only admins can correct another player’s progress.');return a;}
function fail(e:unknown){return Response.json({error:e instanceof HttpError||e instanceof RequestError?e.message:'Could not load or save this progress. Refresh and retry.'},{status:e instanceof HttpError||e instanceof RequestError?e.status:503,headers});}
const publicPet=(p:Pet)=>({...p,notes:'',priority:false});
export async function GET(req:Request){try{
 const a=await admin(req);await takeBudget('admin-progress:'+a.id,60,60);const name=accountName(new URL(req.url).searchParams.get('username'));
 if(!await db().prepare('SELECT 1 FROM journals WHERE id=?').bind(name.toLowerCase()).first())throw new HttpError(404,'No saved journal for that player.');
 const journal=await readJournal(name);journal.pets=journal.pets.map(publicPet);
 const events=(await db().prepare("SELECT id,actor_name,action,detail,created_at FROM account_actions WHERE rsn=? AND action='progress corrected' ORDER BY id DESC LIMIT 30").bind(name.toLowerCase()).all()).results;
 return Response.json({journal,events},{headers});
}catch(e){return fail(e);}}
export async function POST(req:Request){try{
 if(req.headers.get('origin')!==new URL(req.url).origin)throw new HttpError(403,'Use the staff portal to correct progress.');
 const a=await admin(req);await takeBudget('admin-progress-write:'+a.id,20,60);const body=await requestJson(req,100000);
 if(body.confirmed!==true||typeof body.reason!=='string'||body.reason.trim().length<10||body.reason.length>2000)throw new HttpError(400,'Confirm the change and provide a reason of 10–2,000 characters.');
 const name=accountName(body.username),j=await readJournal(name);
 if(!Number.isInteger(body.revision)||body.revision!==j.revision)throw new HttpError(409,'Progress changed. Reload before editing.');
 const pet=body.pet as Pet,prior=j.pets.find(p=>p.id===pet?.id);if(!prior)throw new HttpError(400,'Choose a known pet.');
 const before=publicPet(prior);
 try{applyPetEdit(j,{...pet,notes:prior.notes,priority:prior.priority});}catch(e){throw new HttpError(400,publicMessage(e,'Check the pet fields and try again.'));}
 const updated=normalizeRates(j),after=publicPet(updated.pets.find(p=>p.id===prior.id)!);
 const token=crypto.randomUUID(),detail=JSON.stringify({reason:body.reason.trim(),pet:prior.name,before,after,revision:body.revision,token});
 const result=await db().batch([
  db().prepare(`INSERT INTO account_actions(rsn,actor_id,actor_name,action,detail,created_at) SELECT ?,?,?,'progress corrected',?,? WHERE EXISTS(SELECT 1 FROM journals WHERE id=? AND revision=?) AND EXISTS(SELECT 1 FROM staff_members WHERE discord_id=? AND role IN ('admin','owner'))`).bind(name.toLowerCase(),a.id,a.globalName||a.username,detail,new Date().toISOString(),name.toLowerCase(),body.revision,a.id),
  db().prepare(`UPDATE journals SET data=?,revision=revision+1 WHERE id=? AND revision=? AND EXISTS(SELECT 1 FROM account_actions WHERE rsn=? AND actor_id=? AND json_extract(detail,'$.token')=?)`).bind(JSON.stringify(updated),name.toLowerCase(),body.revision,name.toLowerCase(),a.id,token)
 ]);if(!result[0].meta.changes||!result[1].meta.changes)throw new HttpError(409,'Progress or staff access changed. Reload and review again.');
 return Response.json({ok:true},{headers});
}catch(e){return fail(e);}}
