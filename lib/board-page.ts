import {db} from './storage';
import {leaderboard} from './profile-store';
import {BOARD_SKILLS} from './community';
import {RequestError} from './request-body';

// Only small numeric rows cross this query. Full journal JSON is never read to rank a board.
const visible=`FROM (SELECT rsn FROM journal_summaries UNION SELECT rsn FROM claimed_names) n
 LEFT JOIN journal_summaries j ON j.rsn=n.rsn LEFT JOIN claimed_names c ON c.rsn=n.rsn
 LEFT JOIN users u ON u.discord_id=c.discord_id LEFT JOIN profile_visibility v ON v.rsn=n.rsn
 LEFT JOIN profile_options o ON o.rsn=n.rsn
 LEFT JOIN supporter_totals d ON d.discord_id=c.discord_id LEFT JOIN profile_supporter_totals pd ON pd.rsn=n.rsn
 WHERE COALESCE(v.visibility,'public')='public'
 AND (c.rsn IS NOT NULL OR NOT EXISTS(SELECT 1 FROM profile_link_owners r WHERE r.rsn=n.rsn))`;
const shared=(key:string,value:string)=>`CASE WHEN COALESCE(json_extract(o.details,'$.${key}'),1)=0 THEN NULL ELSE ${value} END`;
const scores={pets:shared('pets',`CASE WHEN j.pets>0 OR json_extract(j.data,'$.logSyncedAt') IS NOT NULL OR j.log IS NOT NULL THEN j.pets END`),log:shared('log','j.log'),xp:shared('skills','j.xp'),questPoints:shared('quests','j.quest_points'),combat:shared('combat','j.combat'),supporters:'COALESCE(pd.amount_minor,d.amount_minor)'};
export async function boardPage(params:URLSearchParams,limit=10){
 const metric=params.get('metric')??'pets',query=(params.get('q')??'').trim().toLowerCase().replaceAll('_',' '),skill=params.get('skill')??'Overall';
 const page=Number(params.get('page')??0),currency=params.get('currency')??'USD';
 if(!Object.hasOwn(scores,metric)||!Number.isSafeInteger(page)||page<0||page>100_000||query.length>12||!/^\w{3}$/.test(currency)||!(skill==='Overall'||BOARD_SKILLS.some(s=>s.name===skill)))throw new RequestError(400,'Invalid leaderboard filter.');
 const bindings:(string|number)[]=[];
 let score=scores[metric as keyof typeof scores];
 if(metric==='xp'&&skill!=='Overall'){score=shared('skills',`(SELECT json_extract(value,'$.xp') FROM json_each(j.data,'$.hiscores.skills') WHERE json_extract(value,'$.name')=? LIMIT 1)`);bindings.push(skill);}
 const base=`WITH eligible AS (SELECT n.rsn,COALESCE(c.display_name,j.name) AS name,${score} AS score,${shared('pets','j.pets')} AS pets,${shared('log','j.log')} AS log ${visible}${metric==='supporters'?" AND (u.title='the Generous' OR COALESCE(pd.amount_minor,d.amount_minor,0)>0) AND COALESCE(pd.currency,d.currency,'USD')=?":''}), ranked AS (SELECT *,CASE WHEN score IS NOT NULL THEN ROW_NUMBER() OVER (ORDER BY score DESC,pets DESC,log DESC,rsn) END AS rank FROM eligible)`;
 if(metric==='supporters')bindings.push(currency);
 const filter=`WHERE instr(replace(lower(name),'_',' '),?)>0`;
 const count=await db().prepare(`${base} SELECT COUNT(*) AS count FROM ranked ${filter}`).bind(...bindings,query).first<{count:number}>();
 const total=count?.count??0,pages=Math.max(1,Math.ceil(total/limit)),current=Math.min(page,pages-1);
 const result=await db().prepare(`${base} SELECT rsn,rank FROM ranked ${filter} ORDER BY score DESC,pets DESC,log DESC,rsn LIMIT ? OFFSET ?`).bind(...bindings,query,limit,current*limit).all<{rsn:string;rank:number|null}>();
 const rows=await leaderboard(result.results.map(r=>r.rsn));
 const byName=new Map(rows.map(r=>[r.name.toLowerCase(),r]));
 return {rows:result.results.flatMap(r=>{const row=byName.get(r.rsn);return row?[{...row,boardRank:r.rank,...(metric==='supporters'?{supporterRank:r.rank}:{})}]:[];}),total,pages,page:current};
}
export async function communityTotals(){
 return await db().prepare(`SELECT COUNT(*) AS journals,COALESCE(SUM(${shared('pets','j.pets')}),0) AS pets,COALESCE(SUM(${shared('log','j.log')}),0) AS log ${visible}`).first<{journals:number;pets:number;log:number}>();
}
export async function homeBoard(){
 const [pets,supporters,totals]=await Promise.all([boardPage(new URLSearchParams(),25),boardPage(new URLSearchParams({metric:'supporters'}),25),communityTotals()]);
 return {rows:[...new Map([...supporters.rows,...pets.rows].map(r=>[r.name,r])).values()].map(({boardRank,...row})=>({...row,supporterRank:supporters.rows.find(s=>s.name===row.name)?.supporterRank??row.supporterRank})),totals};
}
