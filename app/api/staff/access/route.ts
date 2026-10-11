import {readSession} from '@/lib/auth';
import {publicStaff} from '@/lib/staff-data';
export async function GET(req:Request){try{const user=await readSession(req);return Response.json({staff:user?await publicStaff(user.id):null},{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({staff:null},{headers:{'Cache-Control':'no-store'}});}}
