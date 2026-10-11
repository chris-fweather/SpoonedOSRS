import {HttpError} from '@/lib/auth';
import {requestJson,RequestError} from '@/lib/request-body';
import {caseDashboard,caseAction} from '@/lib/moderation-store';
const headers={'Cache-Control':'private, no-store'};
function fail(e:unknown){return Response.json({error:e instanceof HttpError||e instanceof RequestError?e.message:'Case workspace is unavailable. Retry shortly.'},{status:e instanceof HttpError||e instanceof RequestError?e.status:503,headers});}
export async function GET(req:Request){try{return Response.json(await caseDashboard(req),{headers});}catch(e){return fail(e);}}
export async function POST(req:Request){try{return Response.json(await caseAction(req,await requestJson(req,10000)),{headers});}catch(e){return fail(e);}}
