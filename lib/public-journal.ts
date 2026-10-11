import {initial,type Journal,type Pet} from './model';
/** v1 held official stats only; v2 also holds what the other public sources returned. */
export type PublicJournal=Journal & {storageFormat:'public-hiscores-v1'|'public-sources-v2';sourcesCheckedAt?:string|null};
export function isPublicJournal(j:Journal):j is PublicJournal{
 const format=(j as Partial<PublicJournal>).storageFormat;
 return format==='public-hiscores-v1'||format==='public-sources-v2';
}
/** When an unclaimed name last had every source checked. Older full-format journals record it too. */
export function sourcesCheckedAt(j:Journal|null|undefined){return (j as {sourcesCheckedAt?:string|null}|null|undefined)?.sourcesCheckedAt??null;}
/** Search stores provider facts only: stats, the collection log, RuneProfile progress and which pets the
 * log shows. Catalogue descriptions and rates are shared application data, so pets keep only their ID. */
export function discoveryData(j:Journal,previous?:Journal|null,checkedAt?:string|null):Journal {
 // Never silently discard an older journal's imports or manually entered progress; it keeps its full format.
 if(previous&&!isPublicJournal(previous)){const at=checkedAt??sourcesCheckedAt(previous);return at?{...j,sourcesCheckedAt:at} as Journal:j;}
 const compact:PublicJournal={storageFormat:'public-sources-v2',username:j.username,accountMode:j.accountMode,revision:j.revision,
  hiscores:structuredClone(j.hiscores),statsSyncedAt:j.statsSyncedAt,logSyncedAt:j.log?j.logSyncedAt:null,log:j.log?structuredClone(j.log):null,
  ...(j.profile?{profile:structuredClone(j.profile)}:{}),
  ...(j.collectionDates&&Object.keys(j.collectionDates).length?{collectionDates:{...j.collectionDates}}:{}),
  pets:j.pets.filter(p=>p.obtained).map(p=>({id:p.id,obtained:true}) as unknown as Pet),
  sourcesCheckedAt:checkedAt??sourcesCheckedAt(previous)};
 return compact;
}
/** Rebuild the normal UI catalogue. Only the collection log marks a pet obtained; public KC/XP never does.
 * Leaderboard summaries store `obtained` as SQLite's 1, so any truthy flag counts. */
export function hydratePublicJournal(j:Journal):Journal {
 if(!isPublicJournal(j))return j;
 const owned=new Set((Array.isArray(j.pets)?j.pets:[]).filter(p=>!!p?.obtained).map(p=>p.id));
 const pets=initial.pets.map(p=>({id:p.id,name:p.name,category:p.category,sourceRow:p.sourceRow,referenceHours:p.referenceHours,
  obtained:owned.has(p.id),priority:false,date:'',notes:'',source:owned.has(p.id)?'Collection log':'Public Hiscores',plannedMethod:0,
  recordedHours:null,historicalXph:null,obtainedCount:null,crateRolls:null,
  methods:p.methods.map(m=>{
   const activity=j.hiscores.activities.find(a=>a.name.toLowerCase()===m.activity?.toLowerCase());
   const kc=activity&&activity.score>=0&&['kills','games','raids','runs','completions','subdues'].includes(m.unit)?activity.score:null;
   return {...m,kc,...(p.name==='TzRek-Jad'?{kph:60/45,source:m.source.replace('your stated 30','example 45')}:{})};
  })}));
 return {username:j.username,accountMode:j.accountMode,revision:j.revision,hiscores:structuredClone(j.hiscores),statsSyncedAt:j.statsSyncedAt,
  logSyncedAt:j.log?j.logSyncedAt??null:null,log:j.log??null,pets,calculationVersion:initial.calculationVersion,
  ...(j.profile?{profile:j.profile}:{}),...(j.collectionDates?{collectionDates:j.collectionDates}:{})};
}
