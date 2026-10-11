import {parseProfileProgress} from './import-progress';
import {accountMode} from './account-mode';
import {templeLog,womHiscores,sourceJson} from './import-sources';
import {mergeLog,parseLog,type Journal} from './model';
import {normalizeRates} from './estimates';
import {publicHiscores} from './hiscores';
import {publicMessage} from './request-body';
export type SyncSource='hiscores'|'runeprofile'|'temple'|'wom';
export type SyncResult={source:SyncSource;status:'updated'|'unavailable';message:string};
export type SyncedJournal=Journal & {syncReport?:SyncResult[]};
const sourceNames:Record<SyncSource,string>={hiscores:'OSRS Hiscores',runeprofile:'RuneProfile',temple:'TempleOSRS',wom:'Wise Old Man'};
const sourceUrl=(source:SyncSource,name:string)=>({hiscores:'https://secure.runescape.com/m=hiscore_oldschool/index_lite.json?player=',runeprofile:'https://api.runeprofile.com/v1/accounts/',temple:'https://templeosrs.com/api/collection-log/player_collection_log.php?player=',wom:'https://api.wiseoldman.net/v2/players/'}[source]+encodeURIComponent(name)+(source==='runeprofile'?'/full':source==='temple'?'&categories=all&includecount=1':''));
export async function syncJournal(source:string,original:Journal,data:unknown,fetch:typeof globalThis.fetch=globalThis.fetch):Promise<SyncedJournal>{
const j:SyncedJournal=structuredClone(original);
delete j.syncReport;
if(!['hiscores','runeprofile','import','all','temple','wom'].includes(source))throw Error('Unknown sync source.');
const hiscores=()=>fetch('https://secure.runescape.com/m=hiscore_oldschool/index_lite.json?player='+encodeURIComponent(j.username),{signal:AbortSignal.timeout(15000)});
const runeprofile=()=>fetch('https://api.runeprofile.com/v1/accounts/'+encodeURIComponent(j.username)+'/full',{signal:AbortSignal.timeout(15000)});
if(source==='all'){
 // Start all requests together, then merge in deterministic order: current official
 // stats win over WOM, and Temple can add unlocks to RuneProfile's catalogue.
 const sources:SyncSource[]=['wom','hiscores','runeprofile','temple'];
 const responses=await Promise.allSettled(sources.map(async s=>{
  const response=await fetch(sourceUrl(s,j.username),{signal:AbortSignal.timeout(15000)});
  return {status:response.status,raw:await sourceJson(response)};
 }));
 let merged:SyncedJournal=j;
 const report:SyncResult[]=[];
 for(let i=0;i<sources.length;i++){
  const s=sources[i],result=responses[i];
  try{
   if(result.status==='rejected')throw result.reason;
   merged=await syncJournal(s,merged,null,(async()=>Response.json(result.value.raw,{status:result.value.status})) as typeof globalThis.fetch);
   report.push({source:s,status:'updated',message:s==='wom'?'Tracked snapshot imported.':'Updated.'});
  }catch(error){report.push({source:s,status:'unavailable',message:publicMessage(error,'Source unavailable.')});}
 }
 if(!report.some(r=>r.status==='updated'))throw Error('No sources could be refreshed. Your saved journal is unchanged. '+report.map(r=>sourceNames[r.source]+': '+r.message).join(' '));
 if(report.some(r=>r.source==='hiscores'&&r.status==='updated')){
  const wom=report.find(r=>r.source==='wom'&&r.status==='updated');if(wom)wom.message='Snapshot checked; current OSRS Hiscores used for XP and KC.';
 }
 merged.syncReport=report.sort((a,b)=>['hiscores','runeprofile','temple','wom'].indexOf(a.source)-['hiscores','runeprofile','temple','wom'].indexOf(b.source));
 return merged;
}
if(source==='hiscores'){const response=await hiscores();if(response.status===404)throw Error('No public OSRS HiScores record for '+j.username+'. Check the spelling; the player may be unranked.');if(!response.ok)throw Error('OSRS hiscores are unavailable. Try again shortly.');const hs=publicHiscores(await sourceJson(response));if(!hs)throw Error('No public OSRS HiScores record for '+j.username+'. The player may be unranked.');j.hiscores=hs;for(const p of j.pets)for(const m of p.methods){const a=hs.activities.find(a=>a.name.toLowerCase()===m.activity?.toLowerCase());if(a&&a.score>=0&&['kills','games','raids','runs','completions','subdues'].includes(m.unit)){m.kc=a.score;}}j.statsSyncedAt=new Date().toISOString();}
if(source==='runeprofile'){const response=await runeprofile();if(response.status===404)throw Error(j.username+' has no RuneProfile yet. Open your Collection Log in RuneLite and sync with the RuneProfile plugin, then retry.');if(!response.ok)throw Error('RuneProfile is unavailable or rate limited. Try again shortly.');const raw=await sourceJson(response) as Record<string,unknown>;const mode=accountMode(raw.accountType);if(mode)j.accountMode=mode;mergeLog(j,parseLog(raw));const quests=Array.isArray(raw.quests)?raw.quests:[];const diaries=Array.isArray(raw.achievementDiaries)?raw.achievementDiaries:[];const combat=Array.isArray(raw.combatAchievements)?raw.combatAchievements:[];if(quests.every(q=>typeof q.name==='string'&&Number.isFinite(q.points)&&typeof q.state==='string')&&diaries.every(d=>typeof d.area==='string'&&Array.isArray(d.tiers)&&d.tiers.every((t:{completed:number;total:number;tier:string})=>Number.isFinite(t.completed)&&Number.isFinite(t.total)&&typeof t.tier==='string'))&&combat.every(c=>typeof c.name==='string'&&Number.isFinite(c.completed)&&Number.isFinite(c.total)))j.profile=parseProfileProgress({quests,achievementDiaries:diaries,combatAchievements:combat});}
else if(source==='temple'){
 const raw=await sourceJson(await fetch('https://templeosrs.com/api/collection-log/player_collection_log.php?player='+encodeURIComponent(j.username)+'&categories=all&includecount=1',{signal:AbortSignal.timeout(15000)}));mergeLog(j,templeLog(raw,j));
}else if(source==='wom'){
 const raw=await sourceJson(await fetch('https://api.wiseoldman.net/v2/players/'+encodeURIComponent(j.username),{signal:AbortSignal.timeout(15000)}));j.hiscores=womHiscores(raw,j);j.statsSyncedAt=new Date().toISOString();
 for(const p of j.pets)for(const m of p.methods){const a=j.hiscores.activities.find(a=>a.name.toLowerCase()===m.activity?.toLowerCase());if(a&&a.score>=0&&['kills','games','raids','runs','completions','subdues'].includes(m.unit))m.kc=a.score;}
}else if(source==='import'){
 const raw=data as Record<string,unknown>;
 if(raw?.data&&typeof raw.data==='object'&&'items' in raw.data)mergeLog(j,templeLog(raw,j));
 else if(raw?.latestSnapshot){j.hiscores=womHiscores(raw,j);j.statsSyncedAt=new Date().toISOString();for(const p of j.pets)for(const m of p.methods){const a=j.hiscores.activities.find(a=>a.name.toLowerCase()===m.activity?.toLowerCase());if(a&&a.score>=0&&['kills','games','raids','runs','completions','subdues'].includes(m.unit))m.kc=a.score;}}
 else {const mode=accountMode(raw?.accountType);if(mode)j.accountMode=mode;mergeLog(j,parseLog(data));if(Array.isArray(raw?.quests)&&Array.isArray(raw?.achievementDiaries)&&Array.isArray(raw?.combatAchievements)){
  return syncJournal('runeprofile',j,null,(async()=>Response.json(raw)) as typeof globalThis.fetch);
 }}
}
return normalizeRates(j);
}
