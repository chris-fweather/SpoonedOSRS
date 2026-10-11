import {syncJournal} from '@/lib/sync-journal';
import {readJournal,saveJournal} from '@/lib/storage';
import {HttpError,requireLinkedWriter,readSession} from '@/lib/auth';
import {publicMessage,requestJson,RequestError} from '@/lib/request-body';
import {acquireSync,providerFetch,takeBudget} from '@/lib/request-controls';
export async function POST(req:Request){
 let release:((saved?:boolean)=>Promise<void>)|undefined,saved=false;
 try{
  const {source,data,username}=await requestJson(req,2_000_000);
  if(!username)throw new RequestError(400,'Enter an account name.');
  const name=await requireLinkedWriter(req,username);
  if(!['hiscores','runeprofile','temple','wom','all','import'].includes(source))throw new RequestError(400,'Unknown sync source.');
  release=await acquireSync(name);
  const session=await readSession(req);
  await takeBudget('sync-user:'+session!.id,30,3600);
  const prior=await readJournal(name);
  const next=await syncJournal(source,prior,data,providerFetch);
  const result=await saveJournal(next,prior.revision,session!.id);saved=true;
  return Response.json(result,{headers:{'Cache-Control':'private, no-store'}});
 }catch(e){const status=e instanceof HttpError||e instanceof RequestError?e.status:400;return Response.json({error:publicMessage(e,'Sync failed. Your saved progress is unchanged.')},{status,headers:{'Cache-Control':'no-store',...(e instanceof RequestError&&e.retryAfter?{'Retry-After':String(e.retryAfter)}:{})}});}
 finally{if(release)await release(saved);}
}
