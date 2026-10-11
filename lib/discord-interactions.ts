import {DISCORD_APPLICATION_ID,DISCORD_GUILD_ID,DISCORD_PUBLIC_KEY} from './discord-config';
const ORIGIN='https://spoonedosrs.com';
const LIMIT=32_768;
const hex=(s:string)=>Uint8Array.from(s.match(/../g)??[],n=>parseInt(n,16));
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const privateMessage=(content:string)=>json({type:4,data:{content,flags:64,allowed_mentions:{parse:[]}}});
const record=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
export async function verifyDiscordSignature(body:string,timestamp:string,signature:string,key:string,now=Date.now()):Promise<boolean>{
 if(!/^\d{10,13}$/.test(timestamp)||Math.abs(now/1000-Number(timestamp))>300||!/^([a-f0-9]{2}){64}$/i.test(signature)||!/^([a-f0-9]{2}){32}$/i.test(key))return false;
 try{const imported=await crypto.subtle.importKey('raw',hex(key),{name:'Ed25519'},false,['verify']);return await crypto.subtle.verify('Ed25519',imported,hex(signature),new TextEncoder().encode(timestamp+body));}catch{return false;}
}
/** Responds directly within Discord's deadline; all profile data comes from the anonymous share image. */
export async function discordInteraction(request:Request,config={applicationId:DISCORD_APPLICATION_ID,guildId:DISCORD_GUILD_ID,publicKey:DISCORD_PUBLIC_KEY}):Promise<Response>{
 if(request.method!=='POST')return json({error:'Method not allowed'},405);
 const signature=request.headers.get('x-signature-ed25519')??'',timestamp=request.headers.get('x-signature-timestamp')??'';
 if(!signature||!timestamp)return json({error:'Invalid request signature'},401);
 const reader=request.body?.getReader();if(!reader)return json({error:'Missing body'},400);
 const chunks:Uint8Array[]=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>LIMIT){await reader.cancel();return json({error:'Request too large'},413);}chunks.push(value);}}catch{return json({error:'Invalid body'},400);}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 const body=new TextDecoder().decode(bytes);
 if(!await verifyDiscordSignature(body,timestamp,signature,config.publicKey))return json({error:'Invalid request signature'},401);
 let interaction:unknown;try{interaction=JSON.parse(body);}catch{return json({error:'Invalid JSON'},400);}
 if(!record(interaction))return json({error:'Invalid interaction'},400);
 if(interaction.type===1)return json({type:1});
 if(interaction.application_id!==config.applicationId||interaction.guild_id!==config.guildId)return privateMessage('This bot is available in the Spooned OSRS server.');
 if(interaction.type!==2||!record(interaction.data))return privateMessage('Use /profile, /leaderboard or /spooned.');
 const command=interaction.data.name;
 if(command==='profile'){
  const options=Array.isArray(interaction.data.options)?interaction.data.options:[];
  const option=options.find(x=>record(x)&&x.name==='name');const name=record(option)&&typeof option.value==='string'?option.value.trim():'';
  if(!/^[A-Za-z0-9 _-]{1,12}$/.test(name))return privateMessage('Enter a RuneScape name of 1–12 letters, numbers, spaces, underscores or hyphens.');
  const encoded=encodeURIComponent(name),url=ORIGIN+'/player/'+encoded;
  return json({type:4,data:{allowed_mentions:{parse:[]},embeds:[{title:name+' · Spooned OSRS',url,description:'Public character, pets and collection. Open the journal for the latest progress.',color:0xff981f,image:{url:ORIGIN+'/api/share?username='+encoded+'&v=2'},footer:{text:'Profile privacy settings apply. Shared snapshots may be cached by Discord.'}}],components:[{type:1,components:[{type:2,style:5,label:'Open journal',url}]}]}});
 }
 if(command==='leaderboard')return json({type:4,data:{allowed_mentions:{parse:[]},embeds:[{title:'Spooned OSRS leaderboard',url:ORIGIN+'/leaderboard',description:'Compare public pet collections, collection logs, achievements, XP and supporters.',color:0xff981f}],components:[{type:1,components:[{type:2,style:5,label:'View leaderboard',url:ORIGIN+'/leaderboard'}]}]}});
 return privateMessage('**Spooned OSRS**\n/profile name:Obifloat — share a public player card\n/leaderboard — explore public rankings\nIn-game Friends Chat / Clan: **SpoonedOSRS**\nhttps://spoonedosrs.com · https://discord.gg/spoonedosrs');
}
