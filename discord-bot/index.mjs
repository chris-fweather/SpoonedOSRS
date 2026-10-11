import {Client,Events,GatewayIntentBits,PermissionFlagsBits,Options} from 'discord.js';
import {createHmac} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {parseRoleMap,roleDiff,validateEntitlement} from './role-policy.mjs';
const guildId=process.env.DISCORD_GUILD_ID,token=process.env.DISCORD_BOT_TOKEN,secret=process.env.DISCORD_ROLE_SYNC_SECRET;
if(!/^\d{17,20}$/.test(guildId??'')||!token||!secret||secret.length<32)throw Error('Configure the bot token, guild and dedicated role-sync secret in .env.');
const origin=new URL(process.env.SPOONED_ORIGIN??'https://spoonedosrs.com');
if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search)throw Error('SPOONED_ORIGIN must be a trusted HTTPS origin.');
const roleMap=parseRoleMap(process.env.DISCORD_ROLE_MAP??'{}',guildId),apply=process.env.DISCORD_ROLE_SYNC_APPLY==='true';
if(!Object.keys(roleMap).length)throw Error('Configure at least one website-to-Discord role mapping.');
const client=new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMembers],makeCache:Options.cacheWithLimits({MessageManager:0,GuildMemberManager:200})});
const pending=new Set(),urgent=new Set(),observed=new Map(),retryAt=new Map();
let stopping=false,guild;
function report(event,error){console.error(JSON.stringify({event,code:String(error?.code??error?.status??'unavailable')}));}
function enqueue(id,priority=false){if(/^\d{17,20}$/.test(id)&&pending.size+urgent.size<50000)(priority?urgent:pending).add(id);}
async function website(params){
 const path='/api/discord/roles?'+new URLSearchParams({guild:guildId,...params}),timestamp=String(Math.floor(Date.now()/1000));
 const signature=createHmac('sha256',secret).update(`${timestamp}\nGET\n${path}`).digest('hex');
 const r=await fetch(new URL(path,origin),{headers:{'x-spooned-timestamp':timestamp,'x-spooned-signature':signature},redirect:'error',signal:AbortSignal.timeout(10000)});
 if(!r.ok){const e=new Error('Website unavailable');e.status=r.status;throw e;}
 if(Number(r.headers.get('content-length')??0)>100000)throw Error('Oversized entitlement response');
 const text=await r.text();if(text.length>100000)throw Error('Oversized entitlement response');const body=JSON.parse(text);
 if(!Array.isArray(body.members)||body.members.length>101||body.next!==null&&!/^\d{17,20}$/.test(body.next))throw Error('Invalid entitlement page');
 return {...body,members:body.members.map(validateEntitlement)};
}
async function reconcile(id){
 // Re-read at execution time: an old queued grant must not override a website revocation.
 const body=await website({id}),row=body.members.find(m=>m.id===id);if(!row)throw Error('Missing entitlement');
 let member;try{member=await guild.members.fetch({user:id,force:true});}catch(e){if(e.code===10007){observed.set(id,JSON.stringify(row));return;}throw e;}
 const me=await guild.members.fetchMe(),roles=await guild.roles.fetch();
 if(!me.permissions.has(PermissionFlagsBits.ManageRoles))throw Error('Manage Roles is required.');
 for(const [key,roleId] of Object.entries(roleMap)){
  const role=roles.get(roleId);if(!role||role.managed||role.comparePositionTo(me.roles.highest)>=0)throw Error('Mapped role is unavailable or above the bot.');
  if(key==='supporter'&&role.permissions.bitfield!==0n)throw Error('Supporter must be a cosmetic role without server permissions.');
 }
 const diff=roleDiff(roleMap,row.roles,[...member.roles.cache.keys()]);
 // Remove obsolete managed roles first. Never replace the member's whole role list.
 for(const roleId of diff.remove)if(apply)await member.roles.remove(roleId,'Website entitlement removed');
 for(const roleId of diff.add)if(apply)await member.roles.add(roleId,'Website entitlement granted');
 if(row.nickname!==null&&row.nickname!==member.nickname){
  if(!me.permissions.has(PermissionFlagsBits.ManageNicknames)||!member.manageable){console.warn('Nickname skipped: missing permission or member hierarchy.');}
  else if(apply)await member.setNickname(row.nickname,'Member opted in to linked-name nickname');
 }
 observed.set(id,JSON.stringify(row));retryAt.delete(id);
 if(diff.add.length||diff.remove.length)console.log(JSON.stringify({event:apply?'roles-updated':'roles-preview',add:diff.add.length,remove:diff.remove.length}));
}
async function drain(){while(!stopping){const queue=urgent.size?urgent:pending;const id=queue.values().next().value;if(id){queue.delete(id);pending.delete(id);urgent.delete(id);if((retryAt.get(id)??0)>Date.now()){pending.add(id);}else try{await reconcile(id);}catch(e){report('sync-retry',e);retryAt.set(id,Date.now()+60000);pending.add(id);}}await delay(1000);}}
async function poll(){while(!stopping){try{
 let after='',pages=0;const seen=new Set();do{const body=await website(after?{after}:{});for(const row of body.members){seen.add(row.id);if(observed.get(row.id)!==JSON.stringify(row))enqueue(row.id);}if(body.next&&body.next<=after)throw Error('Non-advancing cursor');after=body.next??'';if(++pages>1000)throw Error('Member page limit');if(after)await delay(750);}while(after&&!stopping);
 // Recheck previously managed identities that disappeared from the website user list.
 for(const id of observed.keys())if(!seen.has(id)){enqueue(id);observed.delete(id);}
 }catch(e){report('poll-retry',e);}await delay(60000);}}
async function audit(){while(!stopping){try{
 // Once on startup and every six hours, catch stale roles left during downtime.
 const members=await guild.members.fetch();for(const member of members.values())if([...member.roles.cache.keys()].some(id=>Object.values(roleMap).includes(id)))enqueue(member.id);
 }catch(e){report('audit-retry',e);}await delay(6*60*60*1000);}}
client.once(Events.ClientReady,async()=>{try{guild=await client.guilds.fetch(guildId);console.log(apply?'Role bridge connected.':'Role bridge connected in DRY RUN mode.');void drain();void poll();void audit();}catch(e){report('startup-failed',e);process.exitCode=1;client.destroy();}});
client.on(Events.GuildMemberAdd,member=>{if(member.guild.id===guildId)enqueue(member.id,true);});
client.on(Events.GuildMemberUpdate,(old,member)=>{if(member.guild.id!==guildId)return;const managed=Object.values(roleMap);if(managed.some(id=>old.roles.cache.has(id)!==member.roles.cache.has(id)))enqueue(member.id);});
client.on(Events.Error,e=>report('gateway-error',e));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{stopping=true;client.destroy();process.exit(0);});
try{await client.login(token);}catch(e){report('login-failed',e);process.exit(1);}
