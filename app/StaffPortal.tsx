'use client';
import {StaffPlayers,type DirectoryPlayer} from './StaffPlayers';
import {StaffCorrections} from './StaffCorrections';
import {StaffCases} from './StaffCases';
import {StaffOverview,StaffPeople,type Change,type OwnershipCase,type ReviewState} from './StaffWorkspace';
import type {StaffPerson} from '@/lib/staff-people';
import {StaffAccess,type StaffMember,type AuditEntry} from './StaffAccess';
import type {EditableStaffRole,StaffPermissions} from '@/lib/staff-permissions';
import './staff-workspace.css';
import {StaffDiscord} from './StaffDiscord';
import type {Observation} from './StaffPlanning';
import {GuideWorkshop} from './GuideStudio';
import type {PlanningTarget} from '@/lib/planning-catalogue';
import {useCallback,useEffect,useState} from 'react';
import {StaffTabs,STAFF_TABS,staffTabFrom,correctionSectionFrom,type CorrectionSection,type StaffTabId} from './StaffNavigation';
import {PublicHeader} from './Community';
import {PersonName} from './StaffBadge';
import {STAFF_LABEL,type StaffRole} from '@/lib/staff-policy';
type Dashboard={planningTargets:PlanningTarget[];observations:Observation[];viewer:{id:string;name:string;role:StaffRole;prefix:'Sir'|null;permissions:StaffPermissions};players:DirectoryPlayer[];playerCount?:number;changes:Change[];overrides:{target:string;payload:string}[];pets:string[];members:StaffMember[];audit:AuditEntry[];rolePermissions:Record<EditableStaffRole,StaffPermissions>|null;cases?:OwnershipCase[];people?:StaffPerson[]};
function allowedTabs(v:Dashboard['viewer']):StaffTabId[]{
 const manager=v.role==='admin'||v.role==='owner';
 return ['overview',...(manager?['players'] as const:[]),'ownership',...(v.permissions.corrections||v.permissions.planning||v.permissions.review?['corrections'] as const:[]),...(v.permissions.guides?['guides'] as const:[]),...(manager?['permissions'] as const:[]),...(v.role==='owner'?['discord'] as const:[])];
}
export function StaffPortal({initialTab}:{initialTab?:StaffTabId}={}){
 const [data,setData]=useState<Dashboard|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const [tab,setTab]=useState<StaffTabId>(()=>typeof window==='undefined'?initialTab??'overview':staffTabFrom(new URLSearchParams(window.location.search).get('tab'))??initialTab??'overview');
 const [visitedGuides,setVisitedGuides]=useState(false);
 const [section,setSection]=useState<CorrectionSection>(()=>{if(typeof window==='undefined')return 'queue';const p=new URLSearchParams(window.location.search);return correctionSectionFrom(p.get('section'))??correctionSectionFrom(p.get('tab'))??'queue';});
 const [q,setQ]=useState('');
 const [historyQuery,setHistoryQuery]=useState(''),[historyState,setHistoryState]=useState<ReviewState|'all'>('all');
 const [grantName,setGrantName]=useState('');
 const load=useCallback(async(query:string)=>{const r=await fetch('/api/staff?'+new URLSearchParams({q:query}));const body=await r.json() as Dashboard & {error?:string};if(!r.ok)throw Error(body.error||'Could not load staff data.');setData(body);},[]);
 useEffect(()=>{load('').catch(e=>setError(e.message));},[load]);
 const allowed=data?allowedTabs(data.viewer):[],active:StaffTabId=allowed.includes(tab)?tab:'overview';
 // Once opened, the guide editor stays mounted (hidden) so an unsaved draft survives switching tabs.
 const showGuides=visitedGuides||active==='guides';
 function navigate(next:StaffTabId,nextSection?:CorrectionSection){
  if(nextSection)setSection(nextSection);
  if(active==='guides'||next==='guides')setVisitedGuides(true);
  setTab(next);setNotice('');setError('');
  // Deep links: /staff?tab=history. The guide editor keeps its own address.
  const url=new URL(window.location.href);url.pathname=next==='guides'?'/staff/guides':'/staff';url.searchParams.delete('tab');url.searchParams.delete('section');if(next!=='guides'&&next!=='overview')url.searchParams.set('tab',next);if(next==='corrections'&&nextSection&&nextSection!=='queue')url.searchParams.set('section',nextSection);if(next!=='players'&&next!=='ownership')url.searchParams.delete('player');
  window.history.replaceState(window.history.state,'',url.pathname+url.search);
 }
 async function action(body:object,success:string){setBusy(true);setError('');setNotice('');try{const r=await fetch('/api/staff',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const result=await r.json() as {error?:string};if(!r.ok)throw Error(result.error||'Could not save.');await load(q);setNotice(success);return true;}catch(e){setError((e as Error).message);return false;}finally{setBusy(false);}}
 const viewer=data?.viewer,canManage=viewer?.role==='admin'||viewer?.role==='owner',meta=STAFF_TABS.find(t=>t.id===active)!;
 return <div className="site"><PublicHeader onError={setError}/><main className="community-page staff-page">
 <header className="staff-page-heading"><div><span className="kicker">Community management</span><h1><img src="/icons/skills/defence.png" alt=""/> Staff portal</h1></div>{viewer&&<div className="staff-viewer"><PersonName person={data?.people?.find(p=>p.id===viewer.id)} fallback={viewer.name} role={viewer.role}/><small>{STAFF_LABEL[viewer.role]}</small></div>}</header>
 {error&&<div className="community-notice staff-alert" role="alert">{error} {!data&&<button className="link" onClick={()=>load(q).then(()=>setError('')).catch(e=>setError(e.message))}>Retry</button>}</div>}{notice&&<div className="community-notice staff-alert is-good" role="status">{notice}</div>}
 {!data?(error?<section className="community-panel staff-access-state"><img src="/icons/skills/defence.png" alt=""/><h2>Staff sign-in required</h2><p>Use the Discord account with staff access to open your workspace.</p><a className="btn sm" href="/api/auth/discord">Sign in with Discord</a></section>
  :<div className="staff-loading" role="status" aria-live="polite"><span className="loading-spinner"/><span className="sr-only">Opening the staff portal…</span></div>)
 :<StaffPeople.Provider value={data.people??[]}><div className="staff-window">
  <StaffTabs allowed={allowed} active={active} onSelect={navigate}/>
  <section id="staff-panel" className="staff-window-body" role="tabpanel" aria-labelledby={'staff-tab-'+active}>
   <header className="staff-area-heading"><h2>{meta.title}</h2><p>{meta.description}</p></header>
   {active==='overview'&&viewer&&<StaffOverview changes={data.changes} cases={data.cases??[]} memberCount={viewer.role==='owner'?data.members.length:null} viewer={viewer} onNavigate={navigate} onFilter={state=>{setHistoryState(state);navigate('corrections','history');}}/>}
   {active==='players'&&canManage&&<StaffPlayers players={data.players} total={data.playerCount??data.players.length} owner={canManage} corrections={viewer.permissions.corrections} onSearch={query=>{setQ(query);load(query).catch(e=>setError(e.message));}} onAccess={name=>{setGrantName(name);navigate('permissions');}} onHistory={name=>{setHistoryQuery(name);setHistoryState('all');navigate('corrections','history');}} onOwnership={name=>{const u=new URL(window.location.href);u.searchParams.set('player',name);window.history.replaceState(window.history.state,'',u.pathname+u.search);navigate('ownership');}}/>}
   {active==='ownership'&&viewer&&<StaffCases role={viewer.role}/>}
   {active==='corrections'&&viewer&&<StaffCorrections viewer={viewer} changes={data.changes} planningTargets={data.planningTargets} overrides={data.overrides??[]} observations={data.observations} pets={data.pets} busy={busy} section={section} onSection={next=>navigate('corrections',next)} onAction={action} historyQuery={historyQuery} setHistoryQuery={setHistoryQuery} historyState={historyState} setHistoryState={setHistoryState}/>}
   {active==='permissions'&&canManage&&data.rolePermissions&&<StaffAccess members={data.members} audit={data.audit} rolePermissions={data.rolePermissions} viewer={viewer} busy={busy} onSave={action} grantName={grantName} setGrantName={setGrantName}/>}
   {active==='discord'&&viewer?.role==='owner'&&<StaffDiscord/>}
   {showGuides&&viewer?.permissions.guides&&<div hidden={active!=='guides'}><GuideWorkshop/></div>}
  </section>
 </div></StaffPeople.Provider>}</main></div>;
}
