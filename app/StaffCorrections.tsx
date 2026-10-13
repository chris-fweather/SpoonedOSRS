"use client";
import {useEffect,useState,type FormEvent,type ReactNode} from 'react';
import {CircleCheck,CircleX,Clock,ExternalLink,FileText,MessageSquare,Pencil,Search} from 'lucide-react';
import {Person,ProposedValue,REVIEW_STATES,changeTitle,correctionKind,payloadOf,timeAgo,type Change,type ReviewState} from './StaffWorkspace';
import {Empty,ListTools,PanelHead,ReviewRow,Step,Who,WorkspaceTabs} from './StaffReview';
import type {Observation} from './StaffPlanning';
import type {CorrectionSection} from './StaffNavigation';
import type {PlanningTarget} from '@/lib/planning-catalogue';
import type {RateTarget} from '@/lib/rate-catalogue';
import './staff-cases.css';
import type {StaffPermissions} from '@/lib/staff-permissions';
import {mayReviewProposal,STAFF_LABEL,type StaffRole} from '@/lib/staff-policy';
import {num} from '@/lib/ui';

type Viewer={id:string;role:StaffRole;permissions:StaffPermissions};
type Override={target:string;payload:string};
type Props={viewer:Viewer;changes:Change[];planningTargets:PlanningTarget[];overrides:Override[];observations:Observation[];pets:string[];busy:boolean;
 section:CorrectionSection;onSection:(s:CorrectionSection)=>void;onAction:(body:object,success:string)=>Promise<boolean>;
 historyQuery:string;setHistoryQuery:(q:string)=>void;historyState:ReviewState|'all';setHistoryState:(s:ReviewState|'all')=>void};

const petId=(key:string)=>{try{return (JSON.parse(key.slice('planning:'.length)) as [string,string])[0];}catch{return null;}};

const SECTIONS:{id:CorrectionSection;label:string;icon:string;text:string}[]=[
 {id:'queue',label:'Awaiting review',icon:'/icons/navigation/quest-list-icon.png',text:'Proposals to decide'},
 {id:'drops',label:'Drop rates',icon:'/icons/navigation/collection-log-icon.png',text:'Fixed drop-table rates'},
 {id:'paces',label:'Kill rates & XP',icon:'/icons/navigation/combat-achievements-icon.png',text:'Where new plans start'},
 {id:'records',label:'Dry-streak records',icon:'/icons/skills/firemaking.png',text:'Longest pet droughts'},
 {id:'history',label:'History',icon:'/icons/navigation/quest-point-icon.png',text:'Every submission'},
];
const KIND_ICON={rate:'/icons/navigation/collection-log-icon.png',planning:'/icons/navigation/combat-achievements-icon.png',record:'/icons/skills/firemaking.png'};

/** One place for every shared-data change: what waits for review, the three proposal forms, and the history. */
export function StaffCorrections(p:Props){
 const {viewer,changes,section}=p,pending=changes.filter(c=>c.state==='pending');
 const allowed:Record<CorrectionSection,boolean>={queue:true,drops:viewer.permissions.corrections,paces:viewer.permissions.planning,records:viewer.permissions.corrections,history:true};
 const shown=SECTIONS.filter(s=>allowed[s.id]),active=shown.some(s=>s.id===section)?section:shown[0]?.id;
 return <div className="staff-corrections">
  <WorkspaceTabs label="Corrections" active={active} onSelect={p.onSection} tabs={shown.map(s=>({...s,count:s.id==='queue'?pending.length:s.id==='history'?changes.length:undefined,urgent:s.id==='queue'}))}/>
  {active==='queue'&&<section className="community-panel"><PanelHead icon="/icons/navigation/quest-list-icon.png" title="Awaiting review" badge={String(pending.length)} text={viewer.permissions.review?'A different reviewer approves each proposal. One approval updates everywhere the value is used.':'Staff with approval access decide these. Follow your proposals here.'}/>
   <ChangeList changes={pending} viewer={viewer} busy={p.busy} onAction={p.onAction} empty={<Empty icon="/icons/navigation/quest-point-icon.png" title="All caught up" text="No proposals are waiting for review."/>}/></section>}
  {active==='drops'&&<DropRateForm busy={p.busy} onAction={p.onAction}/>}
  {active==='paces'&&<PaceForm targets={p.planningTargets} overrides={p.overrides} observations={p.observations} busy={p.busy} onAction={p.onAction}/>}
  {active==='records'&&<RecordForm pets={p.pets} busy={p.busy} onAction={p.onAction}/>}
  {active==='history'&&<CorrectionHistory {...p}/>}
 </div>;
}
const payloadName=(c:Change)=>{try{return (JSON.parse(c.payload) as {username?:string}).username??'';}catch{return '';}};
/** Submissions as compact rows; a row opens to its reason, evidence and, for reviewers, the decision. */
function ChangeList({changes,viewer,busy,onAction,empty}:{changes:Change[];viewer?:Viewer;busy?:boolean;onAction?:Props['onAction'];empty:ReactNode}){
 const [open,setOpen]=useState<number|null>(null);
 if(!changes.length)return <>{empty}</>;
 return <ol className="ws-list">{changes.map(c=>{const kind=correctionKind(c),label=changeTitle(c).split(' · '),p=payloadOf(c),item=kind==='planning'?label.slice(1).join(' · ')||label[0]:label.at(-1),where=kind==='planning'?`${p.unit} per hour · ${label[0]}`:label.slice(0,-1).join(' · ');
  const outranked=!!viewer&&!mayReviewProposal(viewer.role,c.actor_role),review=!!viewer&&c.state==='pending'&&viewer.permissions.review&&c.actor_id!==viewer.id&&!outranked;
  return <ReviewRow key={c.id} state={c.state} when={c.reviewed_at??c.created_at} open={open===c.id} onToggle={()=>setOpen(open===c.id?null:c.id)}
   icon={<img src={c.image??KIND_ICON[kind]} alt=""/>}
   title={kind==='record'?<><b>{item}</b><small>dry-streak record · {payloadName(c)}</small></>:<><b>{item}</b>{where&&<small>{where}</small>}</>}
   value={<ProposedValue change={c} compact/>}
   meta={<><Who label="Proposed"><Person id={c.actor_id} fallback={c.actor_name} role={c.actor_role}/></Who>{c.reviewed_at&&<Who label={c.state==='approved'?'Approved':'Rejected'}><Person id={c.reviewer_id} fallback={c.reviewer_name??'a reviewer'} role={c.reviewer_role}/></Who>}</>}>
   <CorrectionBody change={c} viewer={viewer} review={review} outranked={outranked} busy={!!busy} onAction={onAction}/>
  </ReviewRow>;})}</ol>;
}

/** An opened correction: its timeline (proposal, notes, decision and reason) and a box for a note or the decision's reason. */
function CorrectionBody({change:c,viewer,review,outranked,busy,onAction}:{change:Change;viewer?:Viewer;review:boolean;outranked:boolean;busy:boolean;onAction?:Props['onAction']}){
 const [note,setNote]=useState('');
 const at=(t:string)=><time dateTime={t} title={new Date(t).toLocaleString()}>{timeAgo(t)}</time>;
 const notes=(c.notes??[]).filter(n=>n.kind==='note'),reason=(c.notes??[]).find(n=>n.kind==='reason');
 const text=note.trim();
 return <>
  <ol className="case-timeline corr-timeline">
   <li><span className="case-dot" aria-hidden="true"><FileText size={14}/></span><div><p><b>Proposed</b> by <Person id={c.actor_id} fallback={c.actor_name} role={c.actor_role}/>{at(c.created_at)}</p><p className="case-event-detail">{c.reason}</p></div></li>
   {notes.map((n,i)=><li key={i}><span className="case-dot" aria-hidden="true"><MessageSquare size={14}/></span><div><p><b>Note</b> by <Person id={n.actorId} fallback={n.actorName??'Staff'}/>{at(n.at)}</p><p className="case-event-detail">{n.text}</p></div></li>)}
   {c.reviewed_at?<li className={'is-'+c.state}><span className="case-dot" aria-hidden="true">{c.state==='approved'?<CircleCheck size={14}/>:<CircleX size={14}/>}</span><div><p><b>{c.state==='approved'?'Approved and published':'Rejected'}</b> by <Person id={c.reviewer_id} fallback={c.reviewer_name??'a reviewer'} role={c.reviewer_role}/>{at(c.reviewed_at)}</p>{reason&&<p className="case-event-detail">{reason.text}</p>}</div></li>
    :<li><span className="case-dot" aria-hidden="true"><Clock size={14}/></span><div><p><b>Waiting for a reviewer</b></p></div></li>}
  </ol>
  {onAction&&viewer&&<div className="corr-note">
   <textarea rows={2} maxLength={1000} value={note} onChange={e=>setNote(e.target.value)} aria-label={review?'Note or reason for your decision':'Note'} placeholder={review?'Add a note, or the reason for your decision (optional).':'Add a note for the reviewer or the record.'}/>
   <div className="ws-row-actions"><a className="link" href={c.source} target="_blank" rel="noreferrer">Evidence <ExternalLink size={13}/></a>
    <span className="row gap"><button className="btn sm ghost" disabled={busy||text.length<3} onClick={()=>void onAction({action:'correction-note',id:c.id,note:text},'Note added.').then(ok=>{if(ok)setNote('');})}>Add note</button>
     {review&&<><button className="btn sm danger" disabled={busy} onClick={()=>void onAction({action:'review',id:c.id,decision:'rejected',reason:text},'Correction rejected.')}>Reject</button><button className="btn sm primary" disabled={busy} onClick={()=>void onAction({action:'review',id:c.id,decision:'approved',reason:text},'Correction published.')}>Approve &amp; publish</button></>}</span></div>
   {!review&&c.state==='pending'&&<small className="fine">{c.actor_id===viewer.id?'Another reviewer decides your proposal.':outranked&&c.actor_role?`A ${STAFF_LABEL[c.actor_role]} or higher decides this proposal.`:'Waiting for a reviewer.'}</small>}
  </div>}
  {!(onAction&&viewer)&&<div className="ws-row-actions"><a className="link" href={c.source} target="_blank" rel="noreferrer">Evidence <ExternalLink size={13}/></a></div>}
 </>;
}

/** Evidence and reason, shared by every proposal form. */
function Evidence({source,setSource,reason,setReason,label}:{source:string;setSource:(v:string)=>void;reason:string;setReason:(v:string)=>void;label:string}){
 return <><label>{label}<input type="url" required placeholder="https://…" value={source} onChange={e=>setSource(e.target.value)}/></label><label>Why should this change?<textarea required minLength={10} maxLength={2000} rows={3} value={reason} onChange={e=>setReason(e.target.value)} placeholder="What changed, and how you checked it."/></label></>;
}
function Picked({icon,title,detail,onClear}:{icon:string;title:string;detail:ReactNode;onClear:()=>void}){
 return <div className="staff-picked"><img src={icon} alt=""/><span><b>{title}</b><small>{detail}</small></span><button type="button" className="link" onClick={onClear}>Change</button></div>;
}

/** Drop-table rate: search as you type; results group by item, with each boss or activity's own rate. Pick one, then propose its new rate. */
function DropRateForm({busy,onAction}:{busy:boolean;onAction:Props['onAction']}){
 const [query,setQuery]=useState(''),[results,setResults]=useState<RateTarget[]>([]),[loading,setLoading]=useState(false),[target,setTarget]=useState<RateTarget|null>(null),[pool,setPool]=useState<RateTarget[]>([]);
 // One group per item, each listing every boss or activity that drops it with its own rate.
 const groups=[...results.reduce((m,t)=>m.set(t.item,[...(m.get(t.item)??[]),t]),new Map<string,RateTarget[]>())];
 const others=target?pool.filter(t=>t.key!==target.key):[];
 const [denominator,setDenominator]=useState(''),[source,setSource]=useState(''),[reason,setReason]=useState('');
 useEffect(()=>{const q=query.trim();if(q.length<2){setResults([]);return;}let live=true;setLoading(true);const t=setTimeout(()=>fetch('/api/staff/targets?q='+encodeURIComponent(q)).then(r=>r.ok?r.json() as Promise<{targets:RateTarget[]}>:{targets:[]}).then(d=>{if(live)setResults(d.targets);}).catch(()=>{if(live)setResults([]);}).finally(()=>{if(live)setLoading(false);}),200);return()=>{live=false;clearTimeout(t);};},[query]);
 async function submit(e:FormEvent){e.preventDefault();if(!target)return;if(await onAction({action:'propose',kind:'rate',target:target.key,source,reason,denominator:Number(denominator)},'Submitted for another staff member to review.')){setDenominator('');setReason('');setTarget(null);}}
 return <section className="community-panel"><PanelHead icon="/icons/navigation/collection-log-icon.png" title="Change a drop rate" text="Pick the drop, set its new rate and link the source."/><form className="staff-form corr-form" onSubmit={submit}>
  <Step n={1} title="Choose the drop">{target?<><Picked icon={target.img?`/drops/${target.img}`:'/icons/navigation/collection-log-icon.png'} title={target.item} detail={<>{target.source} · {target.table} · now <b>{target.rarity}</b></>} onClear={()=>setTarget(null)}/>
   {others.length>0&&<div className="corr-others"><small>Also drops from</small>{others.map(t=><button type="button" key={t.key} onClick={()=>{setTarget(t);setSource(t.url);}}>{t.source}<em>{t.rarity}</em></button>)}</div>}</>
  :<><label className="search"><Search size={16} aria-hidden="true"/><input aria-label="Search a boss, activity or drop" placeholder="Search a boss, activity or drop…" value={query} onChange={e=>setQuery(e.target.value)}/></label>
   {query.trim().length>=2&&<div className="staff-results corr-groups" role="listbox" aria-label="Drops">{groups.map(([item,list])=><div key={item} className="corr-group"><div className="corr-group-head"><img src={list[0].img?`/drops/${list[0].img}`:'/icons/navigation/collection-log-icon.png'} alt=""/><b>{item}</b><small>{list.length===1?'1 source':`${list.length} sources`}</small></div>
     {list.map(t=><button type="button" role="option" aria-selected={false} key={t.key} onClick={()=>{setTarget(t);setSource(t.url);setPool(list);setQuery('');}}><span>{t.source}<small>{t.table}</small></span><em>{t.rarity}</em><Pencil size={13} aria-hidden="true"/></button>)}</div>)}
    {!results.length&&<p className="fine">{loading?'Searching…':<>Not on any drop table the site shows. The site keeps rates for its collection-log bosses and activities. <a className="link" href={'https://oldschool.runescape.wiki/w/Special:Search?search='+encodeURIComponent(query.trim())} target="_blank" rel="noreferrer">Search the Wiki ↗</a></>}</p>}</div>}</>}</Step>
  <Step n={2} title="New rate"><label className="corr-rate"><span>1 in</span><input type="number" min={1} max={1e12} step="any" required value={denominator} onChange={e=>setDenominator(e.target.value)} aria-label="New rate, 1 in"/></label><p className="fine">Fixed per-roll rates only. Raid, skilling and conditional pet formulas need a code change.</p></Step>
  <Step n={3} title="Evidence"><Evidence label="OSRS Wiki source" source={source} setSource={setSource} reason={reason} setReason={setReason}/></Step>
  <div className="corr-submit"><button className="btn primary" disabled={busy||!target}>Submit for review</button></div>
 </form></section>;
}

/** Default kill rate (actions per hour) and average XP for a pet method, with what players have recorded beside it. */
function PaceForm({targets,overrides,observations,busy,onAction}:{targets:PlanningTarget[];overrides:Override[];observations:Observation[];busy:boolean;onAction:Props['onAction']}){
 const [query,setQuery]=useState(''),[key,setKey]=useState(''),[pace,setPace]=useState(''),[xp,setXp]=useState(''),[rate,setRate]=useState(''),[source,setSource]=useState(''),[reason,setReason]=useState('');
 const selected=targets.find(t=>t.key===key),q=query.trim().toLowerCase(),xpMethod=selected?.unit==='XP';
 const list=q?targets.filter(t=>`${t.pet} ${t.method}`.toLowerCase().includes(q)).slice(0,40):[];
 const current=(t:PlanningTarget)=>{const o=overrides.find(x=>x.target===t.key);try{const p=o?JSON.parse(o.payload) as {pace?:number|null;averageXp?:number|null;rate?:number}:null;return {pace:p?.pace??t.pace,xp:p?.averageXp??null,rate:p?.rate??t.rate,reviewed:!!o};}catch{return {pace:t.pace,xp:null,rate:t.rate,reviewed:false};}};
 const seen=selected?observations.filter(o=>o.pet===selected.pet):[];
 async function submit(e:FormEvent){e.preventDefault();if(!selected)return;if(await onAction({action:'propose',kind:'rate',mode:'planning',target:selected.key,pace:pace===''?null:Number(pace),averageXp:xpMethod&&xp!==''?Number(xp):null,rate:!xpMethod&&rate!==''?Number(rate):null,source,reason},'Submitted for another admin to review.')){setPace('');setXp('');setRate('');setReason('');setKey('');}}
 const now=selected?current(selected):null;
 return <section className="community-panel"><PanelHead icon="/icons/navigation/combat-achievements-icon.png" title="Default kill rates & XP" text="The pace every new plan starts from. Players who set their own keep it."/><form className="staff-form corr-form" onSubmit={submit}>
  <Step n={1} title="Choose the pet and method">{selected&&now?<Picked icon={`/pets/${petId(selected.key)}.png`} title={selected.pet} detail={<>{selected.method} · now <b>{now.pace!=null?`${num(now.pace,1)} ${selected.unit}/h`:'no default'}</b>{now.rate!=null&&<> · pet <b>1/{num(now.rate,0)}</b></>}{now.xp!=null&&<> · ~{num(now.xp,0)} XP</>}{now.reviewed&&' · reviewed'}</>} onClear={()=>setKey('')}/>
  :<><label className="search"><Search size={16} aria-hidden="true"/><input aria-label="Search a pet or method" placeholder="Search a pet or method…" value={query} onChange={e=>setQuery(e.target.value)}/></label>
   {q&&<div className="staff-results" role="listbox" aria-label="Pet methods">{list.map(t=>{const c=current(t);return <button type="button" role="option" aria-selected={false} key={t.key} onClick={()=>{setKey(t.key);setQuery('');setPace(c.pace!=null?String(c.pace):'');setXp(c.xp!=null?String(c.xp):'');setRate(c.rate!=null?String(c.rate):'');}}><img src={`/pets/${petId(t.key)}.png`} alt=""/><span><b>{t.pet}</b><small>{t.method}</small></span><em>{c.pace!=null?`${num(c.pace,1)}/h`:'no pace'}{c.rate!=null&&` · 1/${num(c.rate,0)}`}</em></button>;})}{!list.length&&<p className="fine">No pet methods match.</p>}</div>}</>}</Step>
  <Step n={2} title={xpMethod?'New pace and average XP':'New pace and pet rate'}>{seen.length>0&&<div className="staff-observed"><b>Recorded by players</b>{seen.map((o,i)=><span key={i}>{o.method}: average {num(o.average,0)} {o.unit} from {o.samples} {o.samples===1?'record':'records'}</span>)}</div>}
  <div className="staff-two"><label>{selected?selected.unit.charAt(0).toUpperCase()+selected.unit.slice(1):'Actions'} per hour<input type="number" min="0.001" max="1000000000" step="any" required={xpMethod||rate===''} value={pace} onChange={e=>setPace(e.target.value)}/></label>
   {xpMethod?<label>Average XP per pet (optional)<input type="number" min="1" max="1000000000000" step="any" value={xp} onChange={e=>setXp(e.target.value)}/></label>
    :<label>Pet rate: 1 in, per {selected?.unit.replace(/s$/,'')??'action'}<input type="number" min="1" max="1000000000" step="any" value={rate} onChange={e=>setRate(e.target.value)} placeholder="e.g. 1000"/></label>}</div>
   <p className="fine">{xpMethod?'Leave average XP blank if unsure.':`How many ${selected?.unit??'actions'} the pet takes on average. Leave the pace blank to change only the rate.`}</p></Step>
  <Step n={3} title="Evidence"><Evidence label="Evidence link" source={source} setSource={setSource} reason={reason} setReason={setReason}/></Step>
  <div className="corr-submit"><button className="btn primary" disabled={busy||!selected}>Submit for review</button></div>
 </form></section>;
}

/** A dry-streak record: the pet, player and count, with public evidence. */
function RecordForm({pets,busy,onAction}:{pets:string[];busy:boolean;onAction:Props['onAction']}){
 const [pet,setPet]=useState(''),[username,setUsername]=useState(''),[count,setCount]=useState(''),[unit,setUnit]=useState('kills'),[source,setSource]=useState(''),[reason,setReason]=useState('');
 async function submit(e:FormEvent){e.preventDefault();if(await onAction({action:'propose',kind:'record',pet,username,count:Number(count),unit,source,reason},'Submitted for another staff member to review.')){setCount('');setReason('');}}
 return <section className="community-panel"><PanelHead icon="/icons/skills/firemaking.png" title="Dry-streak record" text="A player's longest wait for a pet, with public proof."/><form className="staff-form corr-form" onSubmit={submit}>
  <Step n={1} title="Pet and player"><label>Pet<select required value={pet} onChange={e=>setPet(e.target.value)}><option value="">Select a pet</option>{pets.map(p=><option key={p}>{p}</option>)}</select></label>
  <label>Player<input required maxLength={12} value={username} onChange={e=>setUsername(e.target.value)}/></label></Step>
  <Step n={2} title="Count"><div className="staff-two"><label>Recorded count<input required type="number" min={0} max={1e12} value={count} onChange={e=>setCount(e.target.value)}/></label><label>Unit<select value={unit} onChange={e=>setUnit(e.target.value)}>{['kills','runs','raids','rolls','XP','catches','pickpockets','clues','harvests'].map(u=><option key={u}>{u}</option>)}</select></label></div></Step>
  <Step n={3} title="Evidence"><Evidence label="Public evidence link" source={source} setSource={setSource} reason={reason} setReason={setReason}/></Step>
  <div className="corr-submit"><button className="btn primary" disabled={busy}>Submit for review</button></div>
 </form></section>;
}

/** Every past submission as compact rows, filtered by outcome and searchable. */
function CorrectionHistory({changes,historyQuery,setHistoryQuery,historyState,setHistoryState}:Props){
 const list=changes.filter(c=>(historyState==='all'||c.state===historyState)&&`${c.actor_name} ${c.reviewer_name??''} ${c.target} ${c.payload} ${c.reason}`.toLowerCase().includes(historyQuery.toLowerCase()));
 return <section className="community-panel"><PanelHead icon="/icons/navigation/quest-point-icon.png" title="History" text="The latest 100 submissions and every open proposal, with evidence, author and review."/>
  <ListTools states={[{id:'all',label:'All',count:changes.length},...REVIEW_STATES.map(({state,label})=>({id:state,label,count:changes.filter(c=>c.state===state).length}))]} state={historyState} onState={s=>setHistoryState(s as ReviewState|'all')} query={historyQuery} onQuery={setHistoryQuery} placeholder="Search players, staff, activities or reasons…"/>
  <ChangeList changes={list} empty={<Empty icon="/icons/navigation/quest-point-icon.png" title="No submissions match" text="Try another filter or search."/>}/></section>;
}
