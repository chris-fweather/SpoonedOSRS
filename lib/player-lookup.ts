import {parseLog, type Journal} from './model';
import {publicHiscores} from './hiscores';
import type {SyncedJournal} from './sync-journal';
export type SourceState='found'|'not_found'|'unavailable';
export type PlayerLookup={username:string;state:SourceState;hiscores:SourceState;runeprofile:SourceState;temple?:SourceState;wom?:SourceState;checkedAt:string;persisted?:boolean;skills:Journal['hiscores']['skills']};
/** Bound public upstream JSON before parsing; an error page is never proof of a missing account. */
async function jsonBody(response:Response):Promise<Record<string,unknown>> {
 if(!response.body)throw Error('Empty response');
 const reader=response.body.getReader(),decoder=new TextDecoder();let bytes=0,text='';
 try{for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>2_000_000){await reader.cancel();throw Error('Response too large');}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();return JSON.parse(text);}finally{reader.releaseLock();}
}
export async function checkPlayer(username:string,fetcher:typeof fetch=fetch):Promise<PlayerLookup>{
 async function probe(kind:'hiscores'|'runeprofile'):Promise<{state:SourceState;skills?:Journal['hiscores']['skills']}> {
  try {
   const url=kind==='hiscores'?'https://secure.runescape.com/m=hiscore_oldschool/index_lite.json?player='+encodeURIComponent(username):'https://api.runeprofile.com/v1/accounts/'+encodeURIComponent(username)+'/full';
   const response=await fetcher(url,{signal:AbortSignal.timeout(8000),headers:{Accept:'application/json'}});
   if(!response.ok){await response.body?.cancel();return {state:response.status===404?'not_found':'unavailable'};}
   const data=await jsonBody(response);
   if(kind==='hiscores'){
    const hs=publicHiscores(data,false);
    return hs?{state:'found',skills:hs.skills}:{state:'not_found'};
   }
   parseLog(data);
   return {state:'found'};
  }catch{return {state:'unavailable'};}
 }
 const [hiscores,runeprofile]=await Promise.all([probe('hiscores'),probe('runeprofile')]);
 const state=hiscores.state==='found'||runeprofile.state==='found'?'found':hiscores.state==='not_found'&&runeprofile.state==='not_found'?'not_found':'unavailable';
 return {username,state,hiscores:hiscores.state,runeprofile:runeprofile.state,skills:hiscores.skills??[],checkedAt:new Date().toISOString()};
}

const providerHosts={hiscores:'secure.runescape.com',runeprofile:'api.runeprofile.com',temple:'templeosrs.com',wom:'api.wiseoldman.net'} as const;

/** A public search saves what the public sources say about a name. The first search (and at most one a day
 * while the name is unclaimed) asks all four sources at once, like Refresh all; other searches refresh
 * official stats only. A busy or missing source keeps any saved data. Claimed owners refresh through /api/sync. */
export async function discoverPlayer(username:string, original:Journal, fetcher:typeof fetch=fetch, allSources=false):Promise<{lookup:PlayerLookup;journal:Journal|null}> {
 const lookup:PlayerLookup={username,state:'unavailable',hiscores:'unavailable',runeprofile:'unavailable',skills:[],checkedAt:new Date().toISOString()};
 const {syncJournal}=await import('./sync-journal');
 if(allSources){
  const statuses=new Map<string,number>();
  const tracked:typeof fetch=async(input,init)=>{
   const response=await fetcher(input,init);
   statuses.set(new URL(input instanceof Request?input.url:String(input)).hostname,response.status);
   return response;
  };
  let journal:SyncedJournal|null=null;
  try{journal=await syncJournal('all',original,null,tracked);}catch{ /* No source answered; nothing is saved. */ }
  const updated=new Set(journal?.syncReport?.filter(r=>r.status==='updated').map(r=>r.source));
  const state=(source:keyof typeof providerHosts):SourceState=>updated.has(source)?'found':statuses.get(providerHosts[source])===404?'not_found':'unavailable';
  const sources={hiscores:state('hiscores'),runeprofile:state('runeprofile'),temple:state('temple'),wom:state('wom')};
  const found=Object.values(sources).includes('found');
  if(journal)delete journal.syncReport;
  return {lookup:{...lookup,...sources,state:found?'found':sources.hiscores==='not_found'?'not_found':'unavailable',skills:sources.hiscores==='found'?journal!.hiscores.skills:[]},journal:found?journal:null};
 }
 try{
  const response=await fetcher('https://secure.runescape.com/m=hiscore_oldschool/index_lite.json?player='+encodeURIComponent(username),{signal:AbortSignal.timeout(15000),headers:{Accept:'application/json'}});
  if(!response.ok){await response.body?.cancel();if(response.status===404)lookup.state=lookup.hiscores='not_found';return {lookup,journal:null};}
  const hs=publicHiscores(await jsonBody(response));
  if(!hs){lookup.state=lookup.hiscores='not_found';return {lookup,journal:null};}
  const journal=await syncJournal('hiscores',original,null,(async()=>Response.json(hs)) as typeof fetch);
  return {lookup:{...lookup,state:'found',hiscores:'found',skills:hs.skills},journal};
 }catch{return {lookup,journal:null};}
}
