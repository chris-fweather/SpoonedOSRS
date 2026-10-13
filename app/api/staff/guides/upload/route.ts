import {HttpError} from '@/lib/auth';
import {uploadGuideImage} from '@/lib/guide-uploads';
const headers={'Cache-Control':'no-store'};
export async function POST(req:Request){try{return Response.json(await uploadGuideImage(req),{headers});}catch(e){return Response.json({error:e instanceof HttpError?e.message:'Uploads are temporarily unavailable.'},{status:e instanceof HttpError?e.status:503,headers});}}
