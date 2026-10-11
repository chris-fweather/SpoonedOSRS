import {readSession,ensureAuthTables} from '@/lib/auth';
import {accountName,db} from '@/lib/storage';
const headers={'Cache-Control':'private, no-store','Vary':'Cookie'};
/** Explicit owner-only reveal; never changes the public visibility preference. */
export async function GET(request:Request){
 try{
  const session=await readSession(request);
  if(!session)return Response.json({error:'Sign in to reveal your donation.'},{status:401,headers});
  let name:string;
  try{name=accountName(new URL(request.url).searchParams.get('username')??'');}catch{return Response.json({error:'Choose a linked account.'},{status:400,headers});}
  await ensureAuthTables();
  const row=await db().prepare(`SELECT p.show_donation,COALESCE(pd.amount_minor,d.amount_minor) AS amount_minor,COALESCE(pd.currency,d.currency,'USD') AS currency
   FROM claimed_names c LEFT JOIN profile_presentation p ON p.rsn=c.rsn
   LEFT JOIN profile_supporter_totals pd ON pd.rsn=c.rsn LEFT JOIN supporter_totals d ON d.discord_id=c.discord_id
   WHERE c.rsn=? AND c.discord_id=?`).bind(name.toLowerCase(),session.id).first<{show_donation:number|null;amount_minor:number|null;currency:string}>();
  if(!row||row.show_donation!==0)return Response.json({error:'No hidden donation available for this linked account.'},{status:404,headers});
  return Response.json({amountMinor:row.amount_minor,currency:row.currency},{headers});
 }catch{return Response.json({error:'Your donation could not be revealed. Try again.'},{status:503,headers});}
}
