import {HttpError} from '@/lib/auth';
import {requestJson,RequestError} from '@/lib/request-body';
import {staffProfileAction,staffProfileView} from '@/lib/staff-profile';
const headers={'Cache-Control':'private, no-store','Vary':'Cookie'};
const fail=(e:unknown)=>Response.json({error:e instanceof HttpError||e instanceof RequestError?e.message:'Staff controls are unavailable.'},{status:e instanceof HttpError||e instanceof RequestError?e.status:503,headers});
/** The profile cog's quick staff panel (admins and the owner). Rank changes go through POST /api/staff. */
export async function GET(req:Request){try{return Response.json(await staffProfileView(req),{headers});}catch(e){return fail(e);}}
/** Visibility, clearing a title or badge, unlink and relink: audited in the account history. */
export async function POST(req:Request){try{return Response.json(await staffProfileAction(req,await requestJson(req,4000)),{headers});}catch(e){return fail(e);}}
