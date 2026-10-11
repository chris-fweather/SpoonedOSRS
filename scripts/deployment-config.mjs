import {existsSync,readFileSync} from 'node:fs';

/** Identifiers for one deployment. None are secrets (those stay Worker secrets), but they name our
 * database, Discord application, server and owners, so source code does not hard-code them.
 * Each value comes from an environment variable — in production, a Workers Builds variable. The private
 * working repository falls back to config/deployment.private.json, which public copies leave out. */
const fields={
 D1_DATABASE_ID:/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
 DISCORD_CLIENT_ID:/^\d{17,20}$/,
 DISCORD_GUILD_ID:/^\d{17,20}$/,
 DISCORD_PUBLIC_KEY:/^[0-9a-f]{64}$/,
 // Comma-separated. The first is the canonical owner identity; the rest are linked owner logins.
 OWNER_DISCORD_IDS:/^\d{17,20}(,\d{17,20})*$/,
};
export const PRIVATE_DEPLOYMENT_FILE=new URL('../config/deployment.private.json',import.meta.url);

export function deploymentConfig({env=process.env,file=PRIVATE_DEPLOYMENT_FILE,required=true}={}){
 const fallback=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):{};
 const values={};
 for(const [name,format] of Object.entries(fields)){
  const value=String(env[name]||fallback[name]||'').replace(/\s+/g,'');
  if(value&&!format.test(value))throw Error(`${name} has an unexpected format.`);
  if(!value&&required)throw Error(`Set ${name} for this build (a Workers Builds variable in production; see .env.example).`);
  values[name]=value;
 }
 return {
  d1DatabaseId:values.D1_DATABASE_ID,
  discord:{applicationId:values.DISCORD_CLIENT_ID,guildId:values.DISCORD_GUILD_ID,publicKey:values.DISCORD_PUBLIC_KEY},
  ownerDiscordIds:values.OWNER_DISCORD_IDS?values.OWNER_DISCORD_IDS.split(','):[],
 };
}
