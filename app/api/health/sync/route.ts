import {env} from 'cloudflare:workers';
import {createProviderClient} from '@/lib/provider-client';
import {budgetKey,takeBudget} from '@/lib/request-controls';
import {publicMessage} from '@/lib/request-body';
import {verifySignedGet} from '@/lib/signed-request';
import {accountName,db,freshJournal} from '@/lib/storage';
import {syncJournal,type SyncSource} from '@/lib/sync-journal';

const headers={'Cache-Control':'no-store'};
const sources:SyncSource[]=['hiscores','runeprofile','temple','wom'];

/** Post-deploy check: fetch and parse every provider through the production client, exactly as a
 * player sync does, without saving a journal. Only requests signed with DEPLOY_CHECK_SECRET run. */
export async function GET(request:Request){
 if(!env.DEPLOY_CHECK_SECRET)return Response.json({error:'Deploy checks are not configured.'},{status:503,headers});
 if(!await verifySignedGet(request,env.DEPLOY_CHECK_SECRET))return Response.json({error:'Invalid signature.'},{status:401,headers});
 let player:string;
 try{player=accountName(new URL(request.url).searchParams.get('player')??'');}catch{return Response.json({error:'Choose a valid player.'},{status:400,headers});}
 // A run-specific cache key forces a real upstream request; provider pacing and the daily budget stay shared.
 const run=crypto.randomUUID();
 const fetcher=createProviderClient({database:db(),key:value=>budgetKey(`provider-check:${run}:${value}`),dailyBudget:()=>takeBudget('provider-daily',10_000,86_400),paused:env.SYNC_PAUSED==='true'});
 const results=await Promise.all(sources.map(async source=>{
  const started=Date.now();
  try{await syncJournal(source,freshJournal(player),null,fetcher);return {source,status:'ok',ms:Date.now()-started};}
  catch(error){
   // A message the app wrote means the provider answered (not tracked, busy, paused). Anything
   // else is a runtime fault in this deployment; the signed caller gets its details.
   const known=publicMessage(error,'');
   return {source,status:known?'unavailable':'error',message:known||(error instanceof Error?`${error.name}: ${error.message}`:'Unknown error'),ms:Date.now()-started};
  }
 }));
 return Response.json({player,results},{headers});
}
