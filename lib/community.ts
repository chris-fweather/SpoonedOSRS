import type {Journal} from './model';
import {bossArtwork} from './artwork';
import {DONATOR_TITLE, type BoardRow} from './flair';

export const COMMUNITY_NAME = 'SpoonedOSRS';
export type CommunityStats = {skillXp?:Record<string,number>;hidden?:string[];petsKnown?:boolean;petTotal: number; logTotal: number | null; questPoints: number | null; questTotal: number | null; combat: number | null; combatTotal: number | null; diaries: number | null; diaryTotal: number | null; xp: number | null; syncedAt: string | null};
export function journalStats(j: Journal): CommunityStats {
  const quests = j.details?.quests===false?undefined:j.profile?.quests;
  const tiers = j.details?.diaries===false?undefined:j.profile?.diaries.flatMap(d => d.tiers);
  const combat = j.details?.combat===false?undefined:j.profile?.combat;
  return {
    hidden: Object.entries({pets:'pets',log:'log',questPoints:'quests',combat:'combat',xp:'skills'}).filter(([,key])=>j.details?.[key as keyof NonNullable<Journal['details']>]===false).map(([metric])=>metric),
    petsKnown: !!j.logSyncedAt || !!j.log || j.pets.some(p=>p.obtained),
    petTotal: j.pets.length, logTotal: j.log?.total ?? null,
    questPoints: quests?.reduce((n, q) => n + (q.state === 'finished' ? q.points : 0), 0) ?? null,
    questTotal: quests?.reduce((n, q) => n + q.points, 0) ?? null,
    combat: combat?.reduce((n, c) => n + c.completed, 0) ?? null,
    combatTotal: combat?.reduce((n, c) => n + c.total, 0) ?? null,
    diaries: tiers?.reduce((n, t) => n + t.completed, 0) ?? null,
    diaryTotal: tiers?.reduce((n, t) => n + t.total, 0) ?? null,
    skillXp: j.details?.skills===false?{}:Object.fromEntries(j.hiscores.skills.filter(s=>s.name!=='Overall'&&Number.isFinite(s.xp)&&s.xp>=0).map(s=>[s.name,s.xp])),
    xp: j.hiscores.skills.find(s => s.name === 'Overall')?.xp ?? null,
    syncedAt: [j.statsSyncedAt, j.logSyncedAt, j.profile?.syncedAt].filter((d): d is string => !!d).sort().at(-1) ?? null,
  };
}
export type BoardMetric = 'pets' | 'log' | 'combat' | 'questPoints' | 'xp';
export const BOARD_METRICS: {id: BoardMetric; label: string; icon: string}[] = [
  {id: 'pets', label: 'Pets', icon: '/brand/rocky-mascot.webp'},
  {id: 'log', label: 'Collection log', icon: '/icons/navigation/collection-log-icon.png'},
  {id: 'combat', label: 'Combat achievements', icon: '/icons/navigation/combat-achievements.png'},
  {id: 'questPoints', label: 'Quest points', icon: '/icons/navigation/quest-point-icon.png'},
  {id: 'xp', label: 'Total XP', icon: '/icons/navigation/stats-icon.png'},
];
export function metricValue(row: BoardRow, metric: BoardMetric, skill?:string): number | null {
  if (row.hasJournal === false || row.stats?.hidden?.includes(metric)) return null;
  if(metric==='pets'&&row.stats?.petsKnown===false)return null;
  if(metric==='xp'&&skill)return row.stats?.skillXp?.[skill]??null;
  if (metric === 'pets' || metric === 'log') return metric === 'log' && row.stats?.logTotal === null ? null : row[metric];
  return row.stats?.[metric] ?? null;
}
export function metricAverage(rows: BoardRow[], metric: BoardMetric) {
  const values = rows.map(r => metricValue(r, metric)).filter((v): v is number => v !== null);
  return {count: values.length, value: values.length ? values.reduce((n, v) => n + v, 0) / values.length : null};
}

/** Rank the whole board before filtering. Cosmetic ranks never affect scores. */
export function rankedPlayers(rows: BoardRow[], metric: BoardMetric, query = '', skill?:string) {
  return [...rows].sort((a, b) => (metricValue(b, metric, skill) ?? -1) - (metricValue(a, metric, skill) ?? -1) || b.pets - a.pets || b.log - a.log || a.name.localeCompare(b.name))
    .map((row, index) => ({row, rank: row.boardRank!==undefined?row.boardRank:metricValue(row, metric, skill) === null ? null : index + 1}))
    .filter(({row}) => row.name.toLowerCase().replace(/_/g, ' ').includes(query.trim().toLowerCase().replace(/_/g, ' ')));
}

/** Paginate after applying the homepage cap, retaining original ranking order. */
export function communityPage<T>(rows:T[],page:number,size=20,limit?:number){
 const eligible=limit===undefined?rows:rows.slice(0,limit);
 const pages=Math.max(1,Math.ceil(eligible.length/size)),current=Math.max(0,Math.min(page,pages-1));
 return {items:eligible.slice(current*size,(current+1)*size),pages,current,total:eligible.length,start:eligible.length?current*size+1:0,end:Math.min((current+1)*size,eligible.length)};
}
/** Server positions include hidden donations; the client never needs their amounts. */
export function rankedSupporters(rows:BoardRow[],currency='USD'){
 const amount=(r:BoardRow)=>r.donation?.hidden?null:r.donation?.amountMinor??null;
 const eligible=rows.filter(r=>(r.supporter??r.title===DONATOR_TITLE)&&(!r.donation||r.donation.currency===currency));
 // Older/local preview rows can still rank their visible amounts.
 const fallback=new Map([...eligible].filter(r=>amount(r)!==null)
  .sort((a,b)=>amount(b)!-amount(a)!||a.name.localeCompare(b.name)).map((r,i)=>[r.name,i+1]));
 return eligible.map(row=>({row,rank:row.supporterRank!==undefined?row.supporterRank:fallback.get(row.name)??null}))
  .sort((a,b)=>(a.rank??Infinity)-(b.rank??Infinity)||a.row.name.localeCompare(b.row.name));
}
export function comparisonSeries(rows:BoardRow[],metric:BoardMetric,player:BoardRow,other?:BoardRow){
 const average=metricAverage(rows,metric);
 const series=[{key:'player',label:player.name,value:metricValue(player,metric)},
  ...(other?[{key:'other',label:other.name,value:metricValue(other,metric)}]:[]),
  {key:'average',label:'Community average',value:average.value}];
 const top=Math.max(1,...series.map(s=>s.value??0));
 const magnitude=10**Math.floor(Math.log10(top));
 const step=magnitude/2, ceiling=Math.ceil(top/step)*step;
 return {series,average,ceiling};
}
/** Equal-width integer buckets of actual public totals; never fit a normal curve. */
export function communityDistribution(rows:BoardRow[],metric:BoardMetric){
 const values=rows.map(r=>metricValue(r,metric)).filter((v):v is number=>v!==null&&Number.isFinite(v)&&v>=0);
 if(!values.length)return {count:0,ceiling:1,bins:[] as {low:number;high:number;count:number}[]};
 const maximum=Math.max(...values),slots=Math.min(8,Math.ceil(Math.sqrt(values.length)));
 const width=Math.max(1,Math.ceil((maximum+1)/slots));
 const bins=Array.from({length:Math.ceil((maximum+1)/width)},(_,i)=>({low:i*width,high:(i+1)*width,count:0}));
 for(const value of values)bins[Math.min(bins.length-1,Math.floor(value/width))].count++;
 return {count:values.length,ceiling:bins.length*width,bins};
}

export const BOARD_SKILLS = ['Attack','Strength','Defence','Ranged','Prayer','Magic','Runecraft','Construction','Hitpoints','Agility','Herblore','Thieving','Crafting','Fletching','Slayer','Hunter','Mining','Smithing','Fishing','Cooking','Firemaking','Woodcutting','Farming','Sailing'].map(name=>({name,icon:bossArtwork(name)!}));
