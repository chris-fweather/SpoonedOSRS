import {env} from 'cloudflare:workers';
import {HttpError} from '@/lib/auth';
import {requireStaff} from '@/lib/staff-store';
import {registerDiscordCommands} from '@/lib/discord-registration';
import {publicMessage} from '@/lib/request-body';
export async function POST(request:Request){
 const headers={'Cache-Control':'no-store'};
 try{
  if(request.headers.get('origin')!==new URL(request.url).origin)throw new HttpError(403,'Use the staff portal to configure the bot.');
  const actor=await requireStaff(request);if(actor.role!=='owner')throw new HttpError(403,'Only the site owner can configure the bot.');
  if(!env.DISCORD_CLIENT_SECRET||!env.DISCORD_CLIENT_ID)throw new HttpError(503,'Discord application credentials are not configured.');
  const commands=await registerDiscordCommands(env.DISCORD_CLIENT_SECRET,env.DISCORD_CLIENT_ID);
  return Response.json({commands},{headers});
 }catch(e){return Response.json({error:publicMessage(e,'Discord setup failed. Retry shortly.')},{status:e instanceof HttpError?e.status:502,headers});}
}
