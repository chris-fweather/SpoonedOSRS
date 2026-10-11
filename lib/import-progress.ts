import type {Profile} from './model';
const text=(v:unknown,max=200)=>{if(typeof v!=='string'||v.length>max)throw Error('Invalid progress label.');return v;};
const count=(v:unknown)=>{if(!Number.isSafeInteger(v)||Number(v)<0||Number(v)>1e9)throw Error('Invalid progress count.');return Number(v);};
const rows=(v:unknown,max:number)=>{if(!Array.isArray(v)||v.length>max)throw Error('Invalid progress list.');return v;};
export function parseProfileProgress(raw:Record<string,unknown>):Profile{
 return {
  quests:rows(raw.quests,1000).map(q=>({id:count(q.id),name:text(q.name),points:count(q.points),type:text(q.type??'',30),state:text(q.state,30)})),
  diaries:rows(raw.achievementDiaries,100).map(d=>({areaId:count(d.areaId),area:text(d.area),tiers:rows(d.tiers,20).map(t=>({tier:text(t.tier,30),completed:count(t.completed),total:count(t.total)}))})),
  combat:rows(raw.combatAchievements,100).map(c=>({id:count(c.id),name:text(c.name),completed:count(c.completed),total:count(c.total)})),
  syncedAt:new Date().toISOString(),
 };
}
