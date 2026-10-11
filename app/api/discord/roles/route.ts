import {env} from 'cloudflare:workers';
import {db} from '@/lib/storage';
import {accountIdentity,OWNER_DISCORD_IDS} from '@/lib/account-identity';
import {DISCORD_GUILD_ID} from '@/lib/discord-config';
import {discordEntitlement,verifyRoleSync} from '@/lib/discord-role-sync';
const headers={'Cache-Control':'private, no-store','Vary':'x-spooned-signature'};
export async function GET(req:Request){
 if(!env.DISCORD_ROLE_SYNC_SECRET)return Response.json({error:'Role sync is not configured.'},{status:503,headers});
 if(!await verifyRoleSync(req,env.DISCORD_ROLE_SYNC_SECRET))return Response.json({error:'Invalid service signature.'},{status:401,headers});
 const url=new URL(req.url),id=url.searchParams.get('id'),after=url.searchParams.get('after')??'';
 if(url.searchParams.get('guild')!==DISCORD_GUILD_ID||id&&!/^\d{17,20}$/.test(id)||after&&!/^\d{17,20}$/.test(after))return Response.json({error:'Invalid server or member.'},{status:400,headers});
 try{
  const ids=id?[id]:(await db().prepare('SELECT discord_id FROM users WHERE discord_id>? ORDER BY discord_id LIMIT 100').bind(after).all<{discord_id:string}>()).results.map(r=>r.discord_id);
  if(!ids.length)return Response.json({members:[],next:null},{headers});
  // Bind the explicit owner alias; never infer ownership from names or Discord roles.
  const rows=await db().prepare(`WITH targets(id,identity) AS (VALUES ${ids.map(()=>'(?,?)').join(',')}) SELECT t.id,s.role,
   CASE WHEN COALESCE(p.supporter_role,1)=1 AND (u.title='the Generous' OR COALESCE(d.amount_minor,0)>0 OR EXISTS(SELECT 1 FROM claimed_names c JOIN profile_supporter_totals ps ON ps.rsn=c.rsn WHERE c.discord_id=t.identity AND ps.amount_minor>0)) THEN 1 ELSE 0 END AS supporter,
   (SELECT c.display_name FROM claimed_names c WHERE c.discord_id=t.identity AND c.rsn=p.nickname_rsn) AS nickname
   FROM targets t LEFT JOIN users u ON u.discord_id=t.identity LEFT JOIN staff_members s ON s.discord_id=t.identity LEFT JOIN supporter_totals d ON d.discord_id=t.identity LEFT JOIN discord_sync_preferences p ON p.discord_id=t.identity`).bind(...ids.flatMap(value=>[value,accountIdentity(value)])).all<{id:string;role:string|null;supporter:number;nickname:string|null}>();
  const members=rows.results.map(discordEntitlement);
  // Every explicitly linked owner login shares authority, even if only one has a users row.
  const [owner,...aliases]=OWNER_DISCORD_IDS,primary=!id&&owner?members.find(m=>m.id===owner):undefined;
  if(primary)for(const alias of aliases)if(!ids.includes(alias))members.push({...primary,id:alias});
  return Response.json({members,next:!id&&ids.length===100?ids.at(-1):null},{headers});
 }catch{return Response.json({error:'Role sync is temporarily unavailable.'},{status:503,headers});}
}
