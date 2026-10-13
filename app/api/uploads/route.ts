import {serveGuideImage} from '@/lib/guide-uploads';
export async function GET(req:Request){try{return await serveGuideImage(req);}catch{return new Response('Unavailable',{status:503,headers:{'Cache-Control':'no-store'}});}}
