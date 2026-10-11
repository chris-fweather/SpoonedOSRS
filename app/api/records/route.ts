import {db} from '@/lib/storage';
import {driestRecord} from '@/lib/petcord';
export async function GET(req:Request){
 const pet=new URL(req.url).searchParams.get('pet')??'';if(pet.length>100)return Response.json({error:'Invalid pet.'},{status:400});
 try {const row=await db().prepare("SELECT payload,source,revision FROM staff_overrides WHERE kind='record' AND target=?").bind(pet).first<{payload:string;source:string;revision:number}>();
  return Response.json(row?{record:JSON.parse(row.payload),source:row.source,review:row.revision}:{record:driestRecord(pet)},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({record:driestRecord(pet)},{headers:{'Cache-Control':'no-store'}});}
}
