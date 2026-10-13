import {HttpError} from '@/lib/auth';
import {requireStaffArea} from '@/lib/staff-store';
import {searchRateTargets} from '@/lib/rate-catalogue';
const headers={'Cache-Control':'no-store'};
/** Drop-rate targets as staff type, for the Corrections search. */
export async function GET(req:Request){try{
 await requireStaffArea(req,'corrections');
 return Response.json({targets:searchRateTargets(new URL(req.url).searchParams.get('q')??'')},{headers});
}catch(e){return Response.json({error:e instanceof HttpError?e.message:'Search is unavailable right now.'},{status:e instanceof HttpError?e.status:503,headers});}}
