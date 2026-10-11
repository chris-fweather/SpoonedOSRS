import {DISCORD_APPLICATION_ID,DISCORD_GUILD_ID,DISCORD_PUBLIC_KEY,DISCORD_COMMANDS} from './discord-config';
/** Uses only the app's narrow command-update scope; secrets never reach the browser or logs. */
export async function registerDiscordCommands(secret:string,clientId:string,send:typeof fetch=fetch){
 if(clientId!==DISCORD_APPLICATION_ID)throw Error('Discord application ID does not match the configured bot.');
 const tokenResponse=await send('https://discord.com/api/v10/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'client_credentials',client_id:clientId,client_secret:secret,scope:'applications.commands.update'}),signal:AbortSignal.timeout(10000)});
 if(!tokenResponse.ok)throw Error('Discord command authorisation failed. Check the configured client secret.');
 const token=await tokenResponse.json() as {access_token?:string};if(!token.access_token)throw Error('Discord command authorisation failed.');
 const headers={Authorization:'Bearer '+token.access_token,'Content-Type':'application/json'};
 const infoResponse=await send('https://discord.com/api/v10/oauth2/@me',{headers,signal:AbortSignal.timeout(10000)});
 if(!infoResponse.ok)throw Error('Discord application identity could not be verified.');
 const info=await infoResponse.json() as {application?:{id?:string;verify_key?:string}};
 if(info.application?.id!==clientId||info.application?.verify_key!==DISCORD_PUBLIC_KEY)throw Error('The supplied bot public key does not match this Discord application. No commands were changed.');
 const registered:string[]=[];
 for(const command of DISCORD_COMMANDS){
  const r=await send(`https://discord.com/api/v10/applications/${clientId}/guilds/${DISCORD_GUILD_ID}/commands`,{method:'POST',headers,body:JSON.stringify(command),signal:AbortSignal.timeout(10000)});
  if(!r.ok)throw Error(`Could not register /${command.name} (Discord HTTP ${r.status}). Install the application into this server first, then retry.`);
  await r.body?.cancel();registered.push(command.name);
 }
 return registered;
}
