import type {Journal} from './model';
/** Official unranked rows use -1 XP/rank, and an absent player has Overall level 0.
 * Never turn those unknown values into a recorded zero or discard a valid partial record. */
export function publicHiscores(raw:unknown, requireActivities=true):Journal['hiscores']|null {
 const hs=raw as Journal['hiscores'];
 if(!hs||!Array.isArray(hs.skills)||!hs.skills.length||hs.skills.length>100||
  hs.skills.some(s=>!s||typeof s.name!=='string'||!s.name.length||s.name.length>100||!Number.isInteger(s.level)||s.level<0||!Number.isInteger(s.xp)||s.xp< -1||!Number.isInteger(s.rank)||s.rank< -1)||
  (requireActivities&&!Array.isArray(hs.activities))||
  (hs.activities!==undefined&&(!Array.isArray(hs.activities)||hs.activities.length>1000||hs.activities.some(a=>!a||typeof a.name!=='string'||!a.name.length||a.name.length>100||!Number.isInteger(a.score)||a.score< -1||!Number.isInteger(a.rank)||a.rank< -1))))throw Error('Unexpected hiscores response.');
 const skills=hs.skills.filter(s=>s.level>=1&&s.xp>=0).map(({name,level,xp,rank})=>({name,level,xp,rank}));
 const activities=(hs.activities??[]).map(({name,score,rank})=>({name,score,rank}));
 if(!skills.some(s=>s.rank>0)&&!activities.some(a=>a.rank>0&&a.score>=0))return null;
 return {skills,activities};
}
