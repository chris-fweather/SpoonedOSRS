import {HttpError} from '@/lib/auth';
import {guideDashboard,writeGuide} from '@/lib/guide-store';
const headers={'Cache-Control':'no-store'};
const fail=(e:unknown)=>Response.json({error:e instanceof HttpError?e.message:'Guides are temporarily unavailable.'},{status:e instanceof HttpError?e.status:503,headers});
export async function GET(req:Request){try{return Response.json(await guideDashboard(req),{headers});}catch(e){return fail(e);}}
export async function POST(req:Request){try{const reader=req.body?.getReader();if(!reader)throw new HttpError(400,'Missing guide.');let size=0;const chunks:Uint8Array[]=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>128000){await reader.cancel();throw new HttpError(413,'Guide is too large.');}chunks.push(value);}const bytes=new Uint8Array(size);let n=0;for(const c of chunks){bytes.set(c,n);n+=c.length;}let body;try{body=JSON.parse(new TextDecoder().decode(bytes));}catch{throw new HttpError(400,'Invalid guide JSON.');}if(!body||typeof body!=='object'||Array.isArray(body))throw new HttpError(400,'Invalid guide.');return Response.json(await writeGuide(req,body),{headers});}catch(e){return fail(e);}}
