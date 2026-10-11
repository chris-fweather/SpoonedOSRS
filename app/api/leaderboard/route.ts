import {db} from '@/lib/storage';
import {cachedBoard} from '@/lib/board-response-cache';
import {boardPage,communityTotals,homeBoard} from '@/lib/board-page';
import {RequestError} from '@/lib/request-body';
export async function GET(request:Request){
 try{
  const started=performance.now(),params=new URL(request.url).searchParams;
  if(params.toString().length>300)throw new RequestError(400,'Invalid leaderboard filter.');
  params.sort();
  const revision=await db().prepare('SELECT version FROM board_revision WHERE id=1').first<{version:number}>();
  const result=await cachedBoard(revision!.version,params.toString(),async()=>{if(!params.has('metric'))return homeBoard();const [page,totals]=await Promise.all([boardPage(params),communityTotals()]);return {...page,totals};});
  return new Response(result.data,{headers:{'Content-Type':'application/json','Cache-Control':'no-store','Server-Timing':`board;dur=${(performance.now()-started).toFixed(1)}, boardcache;desc="${result.hit?'hit':'miss'}"`}});
 }catch(e){return Response.json({error:e instanceof RequestError?e.message:'The leaderboard could not be loaded.'},{status:e instanceof RequestError?e.status:503,headers:{'Cache-Control':'no-store'}});}
}
