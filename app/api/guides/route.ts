import {publicGuides} from '@/lib/guide-store';
export async function GET(){try{return Response.json({guides:await publicGuides()},{headers:{'Cache-Control':'public, max-age=30'}});}catch{return Response.json({error:'Guides are temporarily unavailable.'},{status:503});}}
