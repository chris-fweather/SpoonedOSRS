"use client";
import {PageHero} from './PageHero';
import {useEffect, useState} from 'react';
import {Check, ChevronDown, Search} from 'lucide-react';
import './leaderboard-controls.css';
import {Select} from 'radix-ui';
import {BOARD_METRICS, BOARD_SKILLS, type BoardMetric} from '@/lib/community';
import {CollectorList, CommunityChat, CommunityStatus, HeroTotals, PublicHeader, SupporterList, useCommunity} from './Community';

const CATEGORIES=[...BOARD_METRICS,{id:'supporters' as const,label:'Supporters',icon:'/icons/community/supporters-heart.png'}];
const XP_OPTIONS=[{name:'Overall',icon:'/icons/navigation/stats-icon.png'},...BOARD_SKILLS];
export function Leaderboard() {
  const [category,setCategory]=useState<BoardMetric|'supporters'>('pets');
  const [skill,setSkill]=useState('Overall');
  const [query,setQuery]=useState('');
  const [page,setPage]=useState(0);
  const {rows,totals,paging,error,setError,retry}=useCommunity({metric:category,skill,query,page});
  const serverPaging={...paging,onPage:setPage};
  useEffect(()=>setPage(0),[category,skill,query]);
  useEffect(()=>{
    const params=new URLSearchParams(location.search),view=params.get('view');
    if(CATEGORIES.some(c=>c.id===view))setCategory(view as typeof category);
    const savedSkill=params.get('skill');if(XP_OPTIONS.some(s=>s.name===savedSkill))setSkill(savedSkill!);
  },[]);
  const supporters=category==='supporters',metric=supporters?'pets':category;
  const heading=supporters?'Supporters':category==='xp'&&skill!=='Overall'?`${skill} XP`:CATEGORIES.find(c=>c.id===category)!.label;
  function chooseCategory(next:typeof category){setCategory(next);const url=new URL(location.href);url.searchParams.set('view',next);if(next!=='xp')url.searchParams.delete('skill');else url.searchParams.set('skill',skill);history.replaceState(null,'',url.pathname+url.search);}
  function chooseSkill(next:string){setSkill(next);const url=new URL(location.href);url.searchParams.set('view','xp');url.searchParams.set('skill',next);history.replaceState(null,'',url.pathname+url.search);}
  return <div className="site"><PublicHeader page="leaderboard" onError={setError}/><main className="community-page leaderboard-page">
    <PageHero kicker="The community’s collection" icon="/icons/navigation/stats-icon.png" title="Leaderboard" text="Explore collectors. Compare milestones. Find your next goal." actions={<HeroTotals totals={totals}/>}/>
    {(error||rows)&&<CommunityStatus rows={rows} error={error} retry={retry}/>}
    <div className="leaderboard-window osrs-panel">
      <nav className="wtabs board-profile-tabs" aria-label="Leaderboard categories">{CATEGORIES.map(c=><button key={c.id} aria-pressed={category===c.id} onClick={()=>chooseCategory(c.id)}><img src={c.icon} alt=""/><span>{c.label}</span></button>)}</nav>
      <section className={`community-panel rankings-panel ${category==='xp'?'xp-rankings':''}`}>
        <div className="leaderboard-tools"><div><h2>{heading}</h2><p>{supporters?'Donation ranking · amounts may be hidden':'Highest recorded totals first'} · 10 players per page</p></div>
          <div className="board-controls"><label className="board-filter"><Search size={16}/><input aria-label={supporters?'Filter supporters':'Filter ranked players'} placeholder={supporters?'Find a supporter…':'Find a player on this board…'} value={query} onChange={e=>setQuery(e.target.value)}/></label>{category==='xp'&&<Select.Root value={skill} onValueChange={chooseSkill}>
            <Select.Trigger className="board-skill-trigger" aria-label={`Rank by skill: ${skill==='Overall'?'Total XP':skill}`} title={skill==='Overall'?'Total XP':skill}><Select.Value><img src={XP_OPTIONS.find(option=>option.name===skill)?.icon} alt=""/></Select.Value><Select.Icon><ChevronDown size={15}/></Select.Icon></Select.Trigger>
            <Select.Portal><Select.Content className="board-skill-menu" position="popper" sideOffset={6}><Select.ScrollUpButton className="board-skill-scroll">↑</Select.ScrollUpButton><Select.Viewport>{XP_OPTIONS.map(s=><Select.Item key={s.name} value={s.name} className="board-skill-option"><Select.ItemText><span><img src={s.icon} alt=""/>{s.name==='Overall'?'Total XP':s.name}</span></Select.ItemText><Select.ItemIndicator><Check size={14}/></Select.ItemIndicator></Select.Item>)}</Select.Viewport><Select.ScrollDownButton className="board-skill-scroll">↓</Select.ScrollDownButton></Select.Content></Select.Portal>
          </Select.Root>}</div>
        </div>
        <div className="board-column-head" aria-hidden="true"><span>#</span><span>Player</span><span>{supporters?'Amount':category==='xp'?'XP':'Total'}</span></div>
        {!rows&&!error&&<ol className="collector-list board-loading" aria-label="Loading leaderboard" aria-busy="true">{Array.from({length:10},(_,i)=><li className="board-loading-row" key={i} aria-hidden="true"><span className="bl-rank"/><span className="bl-identity"><i className="bl-badge"/><span><i/><i/></span></span><span className="bl-score"><i/><i/></span></li>)}</ol>}
        {rows&&(supporters?<SupporterList rows={rows} pageSize={10} serverPaging={serverPaging}/>:<CollectorList expandable rows={rows} metric={metric} skill={category==='xp'&&skill!=='Overall'?skill:undefined} pageSize={10} serverPaging={serverPaging}/>)}
      </section>
    </div><CommunityChat/>
  </main></div>;
}
