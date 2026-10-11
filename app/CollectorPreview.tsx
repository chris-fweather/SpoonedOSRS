'use client';
import {useEffect,useRef,useState} from 'react';
import {ChevronLeft,ChevronRight} from 'lucide-react';
import {SkillRankIcon,skillRankLabel} from './SkillRankIcon';
import type {Journal} from '@/lib/model';
import {BOARD_SKILLS,type BoardMetric} from '@/lib/community';
import {loadCollectorPreview} from '@/lib/collector-preview-cache';
import {progressAvailability} from '@/lib/progress-availability';
import {collectedDate,companionDescription} from '@/lib/pet-presentation';
import {releaseOrder} from '@/lib/release-dates';
import {rankTier} from '@/lib/rank-rewards';
import {num} from '@/lib/ui';
import {pageIcon} from '@/lib/artwork';
import {FilterBar,IconBox,SearchBox,SortMenu} from './Controls';
import {TileProgress} from './TileProgress';
import {HoverTip} from './HoverTip';
import {ReleaseStamp} from './ReleaseStamp';
import {Count,Meter} from './Meter';
import {Pagination} from './Pagination';
import './collector-preview.css';

const CA_TIERS=['Easy','Medium','Hard','Elite','Master','Grandmaster'];

/** Every board shows the same three summary cards; only the board's own category opens in detail. */
export function CollectorPreview({name,id,metric='pets'}:{name:string;id:string;metric?:BoardMetric}){
 const [journal,setJournal]=useState<Journal|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{let active=true;setJournal(null);setError('');
  loadCollectorPreview(name,retry>0).then(j=>{if(active)setJournal(j);}).catch(()=>{if(active)setError('Could not load this preview.');});
  return()=>{active=false;};
 },[name,retry]);
 return <section id={id} className="collector-preview" aria-label={`${name} ${metric} preview`}>
  <header><a className="preview-profile-link" href={'/player/'+encodeURIComponent(name)}>View full profile<ChevronRight size={15} aria-hidden="true"/></a></header>
  {error?<p role="alert">{error} <button className="link" onClick={()=>setRetry(n=>n+1)}>Retry</button></p>:!journal?<p role="status">Loading public progress…</p>:journal.restricted?<p>This collection is private.</p>:<>
   <PreviewTotals journal={journal} metric={metric}/>
   {metric==='pets'?<PetPreview journal={journal}/>:metric==='log'?<LogPreview key={name} journal={journal}/>:metric==='xp'?<SkillPreview journal={journal}/>:metric==='combat'?<CombatPreview journal={journal}/>:<QuestPreview journal={journal}/>}
  </>}
 </section>;
}
/** The Combat achievements board swaps the collection log card for combat tasks; every other board shows the log. */
function PreviewTotals({journal:j,metric}:{journal:Journal;metric:BoardMetric}){
 const available=progressAvailability(j),overall=j.hiscores.skills.find(s=>s.name==='Overall'),combat=j.profile?.combat;
 const cards=[{metric:'pets',label:'Pets',icon:'/brand/rocky-mascot.webp',done:available.pets?j.pets.filter(p=>p.obtained).length:null,total:j.pets.length},
  metric==='combat'
   ?{metric:'combat',label:'Combat tasks',icon:'/icons/navigation/combat-achievements.png',done:available.combat?combat!.reduce((n,c)=>n+c.completed,0):null,total:combat?.reduce((n,c)=>n+c.total,0)??0}
   :{metric:'log',label:'Collection log',icon:'/icons/navigation/collection-log-icon.png',done:j.log?.obtained??null,total:j.log?.total??0},
  {metric:'xp',label:'Total level',icon:'/icons/navigation/stats-icon.png',done:overall&&overall.level>0?overall.level:null,total:BOARD_SKILLS.length*99}];
 return <div className="preview-totals" role="list" aria-label="Public progress summary">{cards.map(c=><div role="listitem" key={c.label} className={metric===c.metric?'current':undefined} aria-current={metric===c.metric?'true':undefined}>
  <img src={c.icon} alt=""/><small>{c.label}</small>
  <b>{c.done===null?'Not shared':c.metric==='xp'?num(c.done,0):<><Count done={c.done} total={c.total}>{num(c.done,0)}</Count><span className="preview-total-of"> / {num(c.total,0)}</span></>}</b>
  <Meter done={c.done??0} total={c.total||1} unknown={c.done===null}/>
 </div>)}</div>;
}
/** Every board's detail starts with the same row, in the same place: the section, then how much of it is complete. */
function SectionHead({title,done,total,unit}:{title:string;done:number;total:number;unit:string}){
 return <div className="preview-section-head"><span>{title}</span><small><Count done={done} total={total}>{num(done,0)}</Count> of {num(total,0)} {unit}</small></div>;
}
function PetPreview({journal}:{journal:Journal}){
 if(!progressAvailability(journal).pets)return <p>Pet collection data hasn’t been shared yet.</p>;
 return <><SectionHead title="Pets" done={journal.pets.filter(p=>p.obtained).length} total={journal.pets.length} unit="collected"/><div className="preview-slots">{[...journal.pets].sort(releaseOrder('pets')).map(p=>{
  const details=companionDescription(journal,p.id,p.name).split('\n').slice(1).filter(line=>!['Obtained','Not collected'].includes(line)&&!line.startsWith('Collected:'));
  return <HoverTip key={p.id} className={p.obtained?'preview-slot obtained':'preview-slot'} label={`${p.name} · ${p.obtained?'Obtained':'Not collected yet'}`} content={<span className="preview-hover"><strong>{p.name}</strong><ReleaseStamp name={p.name} kind="pets"/><span className="preview-hover-group"><b className={p.obtained?'good':'muted'}>{p.obtained?`Obtained${p.date?' · '+collectedDate(p.date):''}`:'Not collected yet'}</b></span>{details.length>0&&<span className="preview-hover-group">{details.map((line,i)=><span key={i}>{line}</span>)}</span>}</span>}><img src={`/pets/${p.id}.png`} alt={p.name} loading="lazy"/></HoverTip>;
 })}</div></>;
}
function LogPreview({journal:j}:{journal:Journal}){
 const [tab,setTab]=useState(j.log?.tabs[0]?.name??''),[page,setPage]=useState<string|null>(null),[slice,setSlice]=useState(0),[query,setQuery]=useState('');
 const heading=useRef<HTMLDivElement>(null),mounted=useRef(false);
 useEffect(()=>{if(mounted.current)heading.current?.focus({preventScroll:true});else mounted.current=true;},[page]);
 if(!j.log)return <p>Collection log data hasn’t been shared yet.</p>;
 const current=j.log.tabs.find(t=>t.name===tab)??j.log.tabs[0],selected=current?.pages.find(p=>p.name===page);
 if(!current)return <p>Collection log data hasn’t been shared yet.</p>;
 const filtered=current.pages.filter(p=>p.name.toLowerCase().includes(query.trim().toLowerCase()));
 const pages=Math.max(1,Math.ceil(filtered.length/6)),index=Math.min(slice,pages-1);
 // Same categories, counts, icons and tiles as the Collection log on a player's profile.
 const collections=j.log.tabs.flatMap(t=>t.pages),head=<SectionHead title="Collection log" done={collections.filter(p=>p.total>0&&p.obtained>=p.total).length} total={collections.length} unit="collections complete"/>;
 if(selected)return <div className="preview-log">{head}
  <div ref={heading} tabIndex={-1} className="preview-log-page">
   <button type="button" className="preview-back" onClick={()=>setPage(null)}><ChevronLeft size={15} aria-hidden="true"/>{current.name}</button>
   <div className="preview-log-page-head">
    <IconBox src={pageIcon(selected.name)} alt=""/>
    <div><strong>{selected.name}</strong><small><Count done={selected.obtained} total={selected.total}>{selected.obtained} / {selected.total}</Count> collected · {selected.total?Math.floor(selected.obtained/selected.total*100):0}%</small></div>
   </div>
   <Meter done={selected.obtained} total={selected.total}/>
  </div>
  <div className="preview-slots">{selected.items.map(item=><HoverTip key={item.id} className={item.quantity?'preview-slot obtained':'preview-slot'} label={`${item.name}, ${item.quantity?'collected':'not collected yet'}`} content={<span className="preview-hover"><strong>{item.name}</strong><span className="preview-hover-group">{item.quantity?`Collected · ${num(item.quantity,0)}`:'Not collected yet'}{item.quantity>0&&j.collectionDates?.[String(item.id)]&&<span>{collectedDate(j.collectionDates[String(item.id)])}</span>}</span></span>}>
   {item.quantity>1&&<em>{num(item.quantity,0)}</em>}<img src={`/items/${item.id}.png`} alt={item.name} loading="lazy"/>
  </HoverTip>)}</div>
 </div>;
 return <div className="preview-log">{head}
  <FilterBar>
   <SearchBox label={`Search ${current.name.toLowerCase()} collections`} placeholder="Search…" value={query} onChange={value=>{setQuery(value);setSlice(0);}}/>
   <SortMenu label="Collection log category" value={current.name} onChange={name=>{setTab(name);setSlice(0);}} options={j.log.tabs.map(t=>({value:t.name,label:t.name}))}/>
  </FilterBar>
  <div className="preview-tiles">{filtered.slice(index*6,index*6+6).map(p=><button type="button" className="cl-activity" key={p.name} onClick={()=>setPage(p.name)}>
   <IconBox src={pageIcon(p.name)} alt=""/><b>{p.name}</b><TileProgress done={p.obtained} total={p.total} unit="items"/>
  </button>)}</div>
  {!filtered.length&&<p>No matching collections in {current.name.toLowerCase()}.</p>}{pages>1&&<Pagination page={index} pages={pages} onPage={setSlice} label="Collections"/>}
 </div>;
}
function SkillPreview({journal:j}:{journal:Journal}){
 if(!j.hiscores.skills.length)return <p>Skill data hasn’t been shared yet.</p>;
 return <><SectionHead title="Skill levels" done={BOARD_SKILLS.filter(({name})=>(j.hiscores.skills.find(s=>s.name===name)?.level??0)>=99).length} total={BOARD_SKILLS.length} unit="skills maxed"/><div className="preview-skills">{BOARD_SKILLS.map(({name,icon})=>{
  const s=j.hiscores.skills.find(s=>s.name===name),known=!!s&&s.level>0&&s.xp>=0,tier=known&&s.xp>0?rankTier(s.rank):null;
  return <HoverTip key={name} className={`preview-skill ${tier?`skill-rank-${tier}`:''}`} label={`${name}${known&&s.rank>0?`, Hiscores rank #${num(s.rank,0)}`:''}${tier?`, ${skillRankLabel(s!.rank)}`:''}`} content={<span className="preview-hover"><strong>{name}</strong><span className="preview-hover-group"><span>{known?`Level ${s.level}`:'Not synced'}</span>{known&&<b>{num(s.xp,0)} XP</b>}</span><span className="preview-hover-group"><small>OSRS Hiscores</small><b>{known&&s.rank>0?`Rank #${num(s.rank,0)}`:'Unranked'}</b>{tier&&<small>{skillRankLabel(s!.rank)}</small>}</span></span>}><SkillRankIcon src={icon} rank={tier?s!.rank:null}/><span className="skill-name">{name}</span><b>{known?s.level:'—'}</b></HoverTip>;
 })}</div></>;
}
/** RuneProfile shares combat achievements per tier, so the preview shows the same tier tiles as a profile. */
function CombatPreview({journal:j}:{journal:Journal}){
 const tiers=CA_TIERS.flatMap(name=>j.profile?.combat.find(c=>c.name===name)??[]);
 if(!tiers.length)return <p>Combat achievements haven’t been shared yet.</p>;
 return <><SectionHead title="Combat achievements" done={tiers.filter(t=>t.total>0&&t.completed>=t.total).length} total={tiers.length} unit="tiers complete"/>
  <div className="preview-tiles">{tiers.map(t=><div className={t.total>0&&t.completed>=t.total?'cl-activity complete':'cl-activity'} key={t.name}>
   <IconBox src={`/icons/tiers/ca-${t.name.toLowerCase()}.png`} alt=""/><b>{t.name}</b><TileProgress done={t.completed} total={t.total} unit="tasks"/>
  </div>)}</div></>;
}
function QuestPreview({journal:j}:{journal:Journal}){
 const rows=j.profile?.quests.map(q=>({name:q.name,done:q.state==='finished'?q.points:0,total:q.points}));
 if(!rows?.length)return <p>This progress hasn’t been shared yet.</p>;
 return <><SectionHead title="Quests" done={j.profile!.quests.filter(q=>q.state==='finished').length} total={rows.length} unit="complete"/><div className="preview-progress-list">{rows.map(r=><div key={r.name}><span>{r.name}</span><Meter done={r.done} total={r.total}/><small>{r.done}/{r.total} QP</small></div>)}</div></>;
}
