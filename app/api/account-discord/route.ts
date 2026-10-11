import {env} from 'cloudflare:workers';
import {readSession,HttpError} from '@/lib/auth';
import {db,sameOrigin} from '@/lib/storage';
import {requestJson,RequestError} from '@/lib/request-body';
const headers={'Cache-Control':'private, no-store','Vary':'Cookie'};
function failure(e:unknown){return Response.json({error:e instanceof HttpError||e instanceof RequestError?e.message:'Discord preferences are unavailable.'},{status:e instanceof HttpError||e instanceof RequestError?e.status:503,headers});}
export async function GET(req:Request){try{const user=await readSession(req);if(!user)throw new HttpError(401,'Sign in to manage Discord preferences.');const row=await db().prepare('SELECT nickname_rsn,supporter_role FROM discord_sync_preferences WHERE discord_id=?').bind(user.id).first<{nickname_rsn:string|null;supporter_role:number}>();return Response.json({nickname:row?.nickname_rsn??null,supporterRole:row?.supporter_role!==0,configured:!!env.DISCORD_ROLE_SYNC_SECRET},{headers});}catch(e){return failure(e);}}
export async function POST(req:Request){try{
 try{sameOrigin(req);}catch{throw new HttpError(403,'Use account settings to change Discord preferences.');}
 const user=await readSession(req);if(!user)throw new HttpError(401,'Sign in to manage Discord preferences.');const body=await requestJson(req,2000);
 if(typeof body.supporterRole!=='boolean'||body.nickname!==null&&(typeof body.nickname!=='string'||!/^[A-Za-z0-9 _-]{1,12}$/.test(body.nickname)))throw new HttpError(400,'Choose a linked name or leave your nickname unchanged.');
 const nickname=typeof body.nickname==='string'?body.nickname.toLowerCase():null;
 const result=await db().prepare(`INSERT INTO discord_sync_preferences(discord_id,nickname_rsn,supporter_role) SELECT ?,?,? WHERE ? IS NULL OR EXISTS(SELECT 1 FROM claimed_names WHERE rsn=? AND discord_id=?) ON CONFLICT(discord_id) DO UPDATE SET nickname_rsn=excluded.nickname_rsn,supporter_role=excluded.supporter_role`).bind(user.id,nickname,+body.supporterRole,nickname,nickname,user.id).run();
 if(!result.meta.changes)throw new HttpError(403,'Choose an account linked to you.');return Response.json({saved:true},{headers});
 }catch(e){return failure(e);}}
