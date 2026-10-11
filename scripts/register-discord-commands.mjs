import {readFileSync} from 'node:fs';
import {DISCORD_COMMANDS} from '../lib/discord-config.ts';
import {deploymentConfig} from './deployment-config.mjs';
const {applicationId:DISCORD_APPLICATION_ID,guildId:DISCORD_GUILD_ID,publicKey:DISCORD_PUBLIC_KEY}=deploymentConfig().discord;
// Read only the app-specific secret; never print tokens, credentials or raw OAuth responses.
const vars=(()=>{try{return readFileSync('.dev.vars','utf8');}catch{return '';}})();
const clientSecret=process.env.DISCORD_CLIENT_SECRET??vars.match(/^DISCORD_CLIENT_SECRET\s*=\s*["']?([^\r\n"']+)/m)?.[1];
if(!clientSecret)throw Error('Set DISCORD_CLIENT_SECRET in the local environment or ignored .dev.vars.');
const response=await fetch('https://discord.com/api/v10/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'client_credentials',client_id:DISCORD_APPLICATION_ID,client_secret:clientSecret,scope:'applications.commands.update'}),signal:AbortSignal.timeout(15000)});
if(!response.ok)throw Error('Discord command authorisation failed: HTTP '+response.status);
const {access_token}=await response.json();if(typeof access_token!=='string')throw Error('Discord did not return a command token.');
const infoResponse=await fetch('https://discord.com/api/v10/oauth2/@me',{headers:{Authorization:'Bearer '+access_token},signal:AbortSignal.timeout(15000)});
if(!infoResponse.ok)throw Error('Could not verify Discord application identity: HTTP '+infoResponse.status);
const info=await infoResponse.json();
if(info.application?.id!==DISCORD_APPLICATION_ID||info.application?.verify_key!==DISCORD_PUBLIC_KEY)throw Error('The supplied public key does not match the configured Discord application. No commands were changed.');
for(const command of DISCORD_COMMANDS){
 const r=await fetch(`https://discord.com/api/v10/applications/${DISCORD_APPLICATION_ID}/guilds/${DISCORD_GUILD_ID}/commands`,{method:'POST',headers:{Authorization:'Bearer '+access_token,'Content-Type':'application/json'},body:JSON.stringify(command),signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error(`Registering /${command.name} failed: HTTP ${r.status}. Check the app is installed in this server.`);
 console.log('Registered /'+command.name);
}
