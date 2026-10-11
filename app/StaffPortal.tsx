'use client';
import {StaffProgress} from './StaffProgress';
import {StaffCases} from './StaffCases';
import {StaffOverview,CorrectionCard,StateLabel,REVIEW_STATES,type Change,type ReviewState} from './StaffWorkspace';
import {StaffAccess,type StaffMember,type AuditEntry} from './StaffAccess';
import type {EditableStaffRole,StaffPermissions} from '@/lib/staff-permissions';
import './staff-workspace.css';
import {StaffDiscord} from './StaffDiscord';
import {StaffPlanning,type Observation} from './StaffPlanning';
import {GuideWorkshop} from './GuideStudio';
import type {PlanningTarget} from '@/lib/planning-catalogue';
import {useCallback,useEffect,useState,type FormEvent} from 'react';
import {StaffTabs,STAFF_TABS,staffTabFrom,type StaffTabId} from './StaffNavigation';
import {PublicHeader} from './Community';
import {StaffBadge} from './StaffBadge';
import {mayReview,type StaffRole} from '@/lib/staff-policy';
import type {RateTarget} from '@/lib/rate-catalogue';
type Dashboard={planningTargets:PlanningTarget[];observations:Observation[];viewer:{id:string;name:string;role:StaffRole;prefix:'Sir'|null;permissions:StaffPermissions};players:{name:string;discordName:string;linkedAt:number;role:StaffRole|null;visibility:string;linked_names:string}[];changes:Change[];targets:RateTarget[];pets:string[];members:StaffMember[];audit:AuditEntry[];rolePermissions:Record<EditableStaffRole,StaffPermissions>|null};
function allowedTabs(v:Dashboard['viewer']):StaffTabId[]{
 const manager=v.role==='admin'||v.role==='owner';
 return ['overview','requests',...(v.permissions.corrections?['corrections','history'] as const:[]),...(v.permissions.planning?['planning'] as const:[]),...(v.permissions.guides?['guides'] as const:[]),...(manager?['players','progress'] as const:[]),...(v.role==='owner'?['staff','discord'] as const:[])];
}
export function StaffPortal({initialTab}:{initialTab?:StaffTabId}={}){
 const [data,setData]=useState<Dashboard|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const [tab,setTab]=useState<StaffTabId>(()=>typeof window==='undefined'?initialTab??'overview':staffTabFrom(new URLSearchParams(window.location.search).get('tab'))??initialTab??'overview');
 const [visitedGuides,setVisitedGuides]=useState(false);
 const [q,setQ]=useState(''),[kind,setKind]=useState<'rate'|'record'>('rate'),[target,setTarget]=useState('');
 const [source,setSource]=useState(''),[reason,setReason]=useState(''),[denominator,setDenominator]=useState(''),[pet,setPet]=useState(''),[username,setUsername]=useState(''),[count,setCount]=useState(''),[unit,setUnit]=useState('kills');
 const [historyQuery,setHistoryQuery]=useState(''),[historyState,setHistoryState]=useState<ReviewState|'all'>('all'),[playerQuery,setPlayerQuery]=useState('');
 const [grantName,setGrantName]=useState('');
 const load=useCallback(async(query:string)=>{const r=await fetch('/api/staff?'+new URLSearchParams({q:query}));const body=await r.json() as Dashboard & {error?:string};if(!r.ok)throw Error(body.error||'Could not load staff data.');setData(body);},[]);
 useEffect(()=>{load('').catch(e=>setError(e.message));},[load]);
 const allowed=data?allowedTabs(data.viewer):[],active:StaffTabId=allowed.includes(tab)?tab:'overview';
 // Once opened, the guide editor stays mounted (hidden) so an unsaved draft survives switching tabs.
 const showGuides=visitedGuides||active==='guides';
 function navigate(next:StaffTabId){
  if(active==='guides'||next==='guides')setVisitedGuides(true);
  setTab(next);setNotice('');setError('');
  // Deep links: /staff?tab=history. The guide editor keeps its own address.
  const url=new URL(window.location.href);url.pathname=next==='guides'?'/staff/guides':'/staff';url.searchParams.delete('tab');if(next!=='guides'&&next!=='overview')url.searchParams.set('tab',next);if(next!=='progress')url.searchParams.delete('player');
  window.history.replaceState(window.history.state,'',url.pathname+url.search);
 }
 async function action(body:object,success:string){setBusy(true);setError('');setNotice('');try{const r=await fetch('/api/staff',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const result=await r.json() as {error?:string};if(!r.ok)throw Error(result.error||'Could not save.');await load(q);setNotice(success);return true;}catch(e){setError((e as Error).message);return false;}finally{setBusy(false);}}
 async function propose(e:FormEvent){e.preventDefault();const ok=await action({action:'propose',kind,target,source,reason,denominator:Number(denominator),pet,username,count:Number(count),unit},'Submitted for another authorised staff member to review.');if(ok){setReason('');setDenominator('');setCount('');}}
 const viewer=data?.viewer,canManage=viewer?.role==='admin'||viewer?.role==='owner',meta=STAFF_TABS.find(t=>t.id===active)!;
 const history=data?.changes.filter(c=>(historyState==='all'||c.state===historyState)&&`${c.actor_name} ${c.reviewer_name??''} ${c.target} ${c.payload} ${c.reason}`.toLowerCase().includes(historyQuery.toLowerCase()))??[];
 return <div className="site"><PublicHeader onError={setError}/><main className="community-page staff-page">
 <header className="staff-page-heading"><div><span className="kicker">Community management</span><h1><img src="/icons/skills/defence.png" alt=""/> Staff portal</h1></div>{viewer&&<div className="staff-viewer"><StaffBadge staff={{role:viewer.role,prefix:null}}/><span>{viewer.name}</span></div>}</header>
 {error&&<div className="community-notice staff-alert" role="alert">{error} {!data&&<button className="link" onClick={()=>load(q).then(()=>setError('')).catch(e=>setError(e.message))}>Retry</button>}</div>}{notice&&<div className="community-notice staff-alert is-good" role="status">{notice}</div>}
 {!data?(error?<section className="community-panel staff-access-state"><img src="/icons/skills/defence.png" alt=""/><h2>Staff sign-in required</h2><p>Use the Discord account with staff access to open your workspace.</p><a className="btn sm" href="/api/auth/discord">Sign in with Discord</a></section>
  :<div className="staff-loading" role="status" aria-live="polite"><span className="loading-spinner"/><span className="sr-only">Opening the staff portal…</span></div>)
 :<div className="staff-window">
  <StaffTabs allowed={allowed} active={active} onSelect={navigate}/>
  <section id="staff-panel" className="staff-window-body" role="tabpanel" aria-labelledby={'staff-tab-'+active}>
   <header className="staff-area-heading"><h2>{meta.title}</h2><p>{meta.description}</p></header>
   {active==='overview'&&viewer&&<StaffOverview changes={data.changes} memberCount={viewer.role==='owner'?data.members.length:null} viewer={viewer} onNavigate={navigate} onFilter={state=>{setHistoryState(state);navigate('history');}}/>}
   {active==='requests'&&viewer&&<StaffCases role={viewer.role}/>}
   {active==='players'&&canManage&&<section className="community-panel"><p className="fine">Find a linked profile or Discord name. Private notes and imports are not exposed here.</p><form className="staff-player-search" onSubmit={e=>{e.preventDefault();load(playerQuery).catch(e=>setError(e.message));}}><input aria-label="Search players or Discord names" value={playerQuery} maxLength={80} onChange={e=>setPlayerQuery(e.target.value)} placeholder="Search players or Discord names…"/><button className="btn sm">Search</button></form><div className="staff-player-directory">{data.players.map(p=><details key={p.name}><summary><span><b>{p.name}</b><small>{p.discordName}</small></span>{p.role&&<StaffBadge staff={{role:p.role,prefix:null}}/>}<small>{p.visibility}</small></summary><div><p>Linked {new Date(p.linkedAt<1e12?p.linkedAt*1000:p.linkedAt).toLocaleDateString()}</p><b>Profiles on this Discord account</b><div className="staff-linked-names">{(JSON.parse(p.linked_names) as string[]).map(n=><a key={n} href={'/player/'+encodeURIComponent(n)}>{n} ↗</a>)}</div>{data.viewer.role==='owner'&&<button className="btn sm" onClick={()=>{setGrantName(p.name);navigate('staff');}}>Manage staff access</button>}{data.viewer.permissions.corrections&&<button className="btn sm ghost" onClick={()=>{setHistoryQuery(p.name);setHistoryState('all');navigate('history');}}>Search review history</button>}</div></details>)}{!data.players.length&&<p>No linked accounts match this search.</p>}</div></section>}
   {active==='corrections'&&viewer?.permissions.corrections&&<div className="staff-columns"><section className="community-panel"><h3>Propose a correction</h3><form className="staff-form" onSubmit={propose}><label>Correction type<select value={kind} onChange={e=>setKind(e.target.value as 'rate'|'record')}><option value="rate">Drop-table rate</option><option value="record">Dry-streak record</option></select></label>
   {kind==='rate'?<><label>Find a source or item<div className="row gap"><input value={q} onChange={e=>setQ(e.target.value)} placeholder="e.g. Kraken" minLength={2}/><button type="button" className="btn sm" disabled={busy||q.trim().length<2} onClick={()=>{setTarget('');load(q).catch(e=>setError(e.message));}}>Find</button></div></label><label>Source · table · item<select value={target} required onChange={e=>{setTarget(e.target.value);const found=data.targets.find(t=>t.key===e.target.value);if(found)setSource(found.url);}}><option value="">Select a result</option>{data.targets.map(t=><option key={t.key} value={t.key}>{t.source} · {t.table} · {t.item} ({t.rarity})</option>)}</select></label><label>New rate: 1 in…<input type="number" min={1} max={1e12} step="any" required value={denominator} onChange={e=>setDenominator(e.target.value)}/></label><p className="fine">Fixed per-roll rates only. Variable raid, skilling and conditional pet formulas need a code review. One approval updates the matching table, item tile and supported pet method together.</p></>:<><label>Pet<select required value={pet} onChange={e=>setPet(e.target.value)}><option value="">Select a pet</option>{data.pets.map(p=><option key={p}>{p}</option>)}</select></label><label>Player<input required maxLength={12} value={username} onChange={e=>setUsername(e.target.value)}/></label><div className="staff-two"><label>Recorded count<input required type="number" min={0} max={1e12} value={count} onChange={e=>setCount(e.target.value)}/></label><label>Unit<select value={unit} onChange={e=>setUnit(e.target.value)}>{['kills','runs','raids','rolls','XP','catches','pickpockets','clues','harvests'].map(u=><option key={u}>{u}</option>)}</select></label></div></>}
   <label>{kind==='rate'?'OSRS Wiki source':'Public evidence link'}<input type="url" required placeholder="https://…" value={source} onChange={e=>setSource(e.target.value)}/></label><label>Why should this change?<textarea required minLength={10} maxLength={2000} rows={3} value={reason} onChange={e=>setReason(e.target.value)}/></label><button className="btn primary" disabled={busy}>Submit for review</button></form></section><section className="community-panel"><div className="staff-queue-head"><h3>Awaiting review</h3><StateLabel state="pending" label={String(data.changes.filter(c=>c.state==='pending').length)}/></div><p className="fine">Moderators and admins maintain shared rates and records. Proposals need a different reviewer.</p><div className="review-queue">{data.changes.filter(c=>c.state==='pending').map(c=><CorrectionCard key={c.id} change={c} review={mayReview(viewer.role,c.kind)&&c.actor_id!==viewer.id} busy={busy} onDecision={decision=>void action({action:'review',id:c.id,decision},decision==='approved'?'Correction published.':'Correction rejected.')}/>)}{!data.changes.some(c=>c.state==='pending')&&<p className="staff-empty">The review queue is clear.</p>}</div></section></div>}
   {active==='discord'&&viewer?.role==='owner'&&<StaffDiscord/>}
   {active==='planning'&&viewer?.permissions.planning&&<StaffPlanning targets={data.planningTargets} observations={data.observations} busy={busy} onPropose={action}/>}
   {active==='history'&&viewer?.permissions.corrections&&<section className="community-panel staff-history"><div className="staff-filter" role="group" aria-label="Filter by outcome"><button type="button" aria-pressed={historyState==='all'} onClick={()=>setHistoryState('all')}>All <b>{data.changes.length}</b></button>{REVIEW_STATES.map(({state,label})=><button type="button" key={state} className={'state-'+state} aria-pressed={historyState===state} onClick={()=>setHistoryState(state)}><i aria-hidden="true"/>{label} <b>{data.changes.filter(c=>c.state===state).length}</b></button>)}</div><input className="staff-history-search" aria-label="Search correction history" placeholder="Search players, staff, activities or reasons…" value={historyQuery} onChange={e=>setHistoryQuery(e.target.value)}/><p className="fine">Latest 100 submissions and every open proposal. Approved changes keep their proposal, evidence, author and review time.</p><div className="review-queue">{history.map(c=><CorrectionCard key={c.id} change={c}/>)}{!history.length&&<p className="staff-empty">No submissions match.</p>}</div></section>}
   {active==='staff'&&viewer?.role==='owner'&&data.rolePermissions&&<StaffAccess members={data.members} audit={data.audit} rolePermissions={data.rolePermissions} viewer={viewer} busy={busy} onSave={action} grantName={grantName} setGrantName={setGrantName}/>}
   {active==='progress'&&canManage&&<StaffProgress/>}
   {showGuides&&viewer?.permissions.guides&&<div hidden={active!=='guides'}><GuideWorkshop/></div>}
  </section>
 </div>}</main></div>;
}
