import {HttpError} from '@/lib/auth';
import {staffAction,staffDashboard} from '@/lib/staff-store';
const headers={'Cache-Control':'no-store'};
function fail(error:unknown){return Response.json({error:error instanceof HttpError?error.message:'Staff data is unavailable. Check that the staff migration has been applied.'},{status:error instanceof HttpError?error.status:503,headers});}
export async function GET(req:Request){try{return Response.json(await staffDashboard(req),{headers});}catch(e){return fail(e);}}
export async function POST(req:Request){try{
 const reader=req.body?.getReader();if(!reader)throw new HttpError(400,'Missing request body.');
 let size=0;const chunks:Uint8Array[]=[];
 while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>12000){await reader.cancel();throw new HttpError(413,'Request too large.');}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
 let body;try{body=JSON.parse(new TextDecoder().decode(bytes));}catch{throw new HttpError(400,'Invalid JSON.');}
 if(!body||typeof body!=='object'||Array.isArray(body))throw new HttpError(400,'Invalid staff action.');
 await staffAction(req,body);return Response.json({ok:true},{headers});
}catch(e){return fail(e);}}
