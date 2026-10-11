import {publicMessage,requestJson,RequestError} from '@/lib/request-body';
import {applyPetEdit} from '@/lib/pet-edit';
import {readJournal,saveJournal} from '@/lib/storage';
import {HttpError,readSession,requireLinkedWriter} from '@/lib/auth';
import {normalizeRates} from '@/lib/estimates';
import {profileJournal} from '@/lib/profile-store';
export async function GET(req:Request){try{return Response.json(await profileJournal(req,new URL(req.url).searchParams.get("username")),{headers:{'Cache-Control':'private, no-store','Vary':'Cookie'}});}catch{return Response.json({error:'Saved progress could not be loaded. Retry before making changes.'},{status:503,headers:{'Cache-Control':'no-store'}});}}
export async function POST(req:Request){
 try{
  const {pet,revision,username}=await requestJson(req);await requireLinkedWriter(req,username);
  if(!pet||!Number.isInteger(revision))throw Error('Check the pet fields and try again.');
  const j=await readJournal(username);
  if(revision!==j.revision)throw Error('Progress changed in another tab. Refresh before saving.');
  applyPetEdit(j,pet);
  return Response.json(await saveJournal(normalizeRates(j),revision,(await readSession(req))!.id));
 }catch(e){const status=e instanceof HttpError||e instanceof RequestError?e.status:400;return Response.json({error:publicMessage(e,'Could not save.')},{status});}
}
