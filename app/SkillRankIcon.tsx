import {rankTier} from '@/lib/rank-rewards';
import './skill-ranks.css';

/** The skill icon, plus a crown for the rank #1 record holder. The crown is a sibling so tiles can place it in their free space. */
export function SkillRankIcon({src,rank}:{src:string|undefined;rank:number|null}) {
 const tier=rank===null?null:rankTier(rank);
 return <><span className="skill-rank-art" aria-hidden="true"><img src={src} alt=""/></span>{tier==='champion'&&<img className="skill-rank-crown" src="/icons/ranks/crown-gold.png" alt=""/>}</>;
}
export function skillRankLabel(rank:number) {
 const tier=rankTier(rank);
 return tier==='champion'?'Rank #1 · Skill record holder':tier==='gold'?'Top 10 · Gold':tier==='silver'?'Top 100 · Silver':tier==='bronze'?'Top 1,000 · Bronze':null;
}
