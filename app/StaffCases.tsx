"use client";
import {useEffect,useState,type ReactNode} from 'react';
import {ArrowRight,CircleCheck,CircleX,Clock,FileText,History,Link2,Lock,LockOpen,MessageSquare,ShieldAlert} from 'lucide-react';
import {PersonName,RankIcon} from './StaffBadge';
import {StaffAccountLookup} from './StaffAccountLookup';
import {RsName,timeAgo} from './StaffWorkspace';
import {Empty,ListTools,PanelHead,ReviewRow,Step,Who,WorkspaceTabs} from './StaffReview';
import {DiscordMark} from './DiscordMark';
import type {StaffRole} from '@/lib/staff-policy';
import type {StaffPerson} from '@/lib/staff-people';
import './staff-cases.css';
type Action='relink'|'unlink'|'release';
type Case={id:string;rsn:string;action:Action;target_id:string|null;source_id:string|null;protected:number;reason:string;creator_id:string;creator_name:string;created_at:string;state:string;reviewer_id?:string|null;reviewed_at?:string|null};
type Lookup={rsn:string;linked:boolean;held?:boolean;owner?:StaffPerson|null;ownerId?:string|null;reasons?:string[]};
type Event={id:number;actor_name:string|null;actor_id:string|null;action:string;detail:string;created_at:string};
type Detail={item:Case;events:Event[];people:StaffPerson[];current:{owner:string|null;held:boolean};reasons:string[];canReview:boolean};
const isHold=(id:string|null)=>!!id?.startsWith('moderation-hold:');
/** Each request type: its pill, what it does, and what the reviewer confirms. */
const ACTIONS:Record<Action,{label:string;icon:ReactNode;title:string;text:string}>={
 relink:{label:'Relink',icon:<Link2 size={13} aria-hidden="true"/>,title:'Move or link',text:'Give the name to another Discord account, or link a held name to its proven owner.'},
 unlink:{label:'Hold',icon:<Lock size={13} aria-hidden="true"/>,title:'Hold',text:'Unlink the name and hold it, so nobody can link it while you check. With the Hold names permission it takes effect at once.'},
 release:{label:'Release',icon:<LockOpen size={13} aria-hidden="true"/>,title:'Release hold',text:'Free a held name so its owner can link it again.'},
};
const EVENTS:Record<string,{label:string;icon:ReactNode;tone?:string}>={
 'case opened':{label:'Request opened',icon:<FileText size={14}/>},'case-open':{label:'Request opened',icon:<FileText size={14}/>},
 note:{label:'Note added',icon:<MessageSquare size={14}/>},approved:{label:'Approved',icon:<CircleCheck size={14}/>,tone:'approved'},rejected:{label:'Rejected',icon:<CircleX size={14}/>,tone:'rejected'},
 'progress corrected':{label:'Progress corrected',icon:<History size={14}/>},linked:{label:'Name linked',icon:<Link2 size={14}/>},relinked:{label:'Name moved',icon:<Link2 size={14}/>},unlinked:{label:'Name unlinked',icon:<Lock size={14}/>},
};
const eventOf=(a:string)=>EVENTS[a]??{label:a.replace(/[-_]+/g,' ').replace(/^./,c=>c.toUpperCase()),icon:<Clock size={14}/>};
/** An event's detail in words: its reason when it carries one, otherwise the recorded text. */
/** The protection reasons recorded with a decision (why it needed an admin). */
function protectionOf(detail:string):string[]{try{const d=JSON.parse(detail) as {protection?:unknown};return Array.isArray(d?.protection)?d.protection.filter((x):x is string=>typeof x==='string'):[];}catch{return [];}}
function eventDetail(detail:string){try{const d=JSON.parse(detail) as {reason?:unknown};return typeof d?.reason==='string'?d.reason:null;}catch{return detail;}}
const ACTION_ICON:Record<Action,ReactNode>={relink:<Link2 size={17}/>,unlink:<Lock size={17}/>,release:<LockOpen size={17}/>};
/** Needs an admin: the admin scimitar, in the admin colour. */
function AdminOnly(){return <span className="case-needs-admin" title="Protected account: an admin must approve"><ShieldAlert size={12} aria-hidden="true"/>Needs admin</span>;}
/** A Discord account by its Discord name, with the Discord mark, so it never reads as a RuneScape name. */
function DiscordAccount({person,id}:{person?:StaffPerson;id:string|null}){return <span className="case-discord-name"><DiscordMark/><b>{person?.name??(id&&!isHold(id)?id:'New owner')}</b></span>;}
const findPerson=(people:StaffPerson[],id:string|null)=>id?people.find(p=>p.id===id):undefined;
/** One side of a request: a Discord account (avatar, site name, Discord names, ID and linked names), a hold, or a free name. */
function AccountCard({label,person,id,state}:{label:string;person?:StaffPerson;id:string|null;state?:'hold'|'free'}){
 if(state||isHold(id)||!id){const free=state==='free';return <div className={'case-account is-'+(free?'free':'hold')}><small>{label}</small><div className="case-account-body"><span className="case-avatar">{free?<LockOpen size={18} aria-hidden="true"/>:<Lock size={18} aria-hidden="true"/>}</span><span><b>{free?'Free to link':'On hold'}</b><small>{free?'Its owner can link it again':'Nobody can link this name'}</small></span></div></div>;}
 return <div className="case-account"><small>{label}</small><div className="case-account-body">{person?.avatarUrl?<img className="case-avatar" src={person.avatarUrl} alt=""/>:<span className="case-avatar">{(person?.name??'?').charAt(0).toUpperCase()}</span>}<span><DiscordAccount person={person} id={id}/><small>{person?`@${person.username}`:'Not signed in yet'}</small><small className="case-id">{id}</small></span></div>
  {person&&<div className="case-names"><small>RuneScape names</small>{person.names.length?person.names.map(n=><RsName key={n} name={n}/>):<em>None linked</em>}</div>}</div>;
}
type Tab='queue'|'new'|'all';
/** Account ownership in the same layout as Corrections: what waits for review, a stepped new request, and every request. */
export function StaffCases({role}:{role:StaffRole}){
 // A profile's staff panel and the Players tab link here with ?player=… to start a request for that name.
 const [player]=useState(()=>typeof window==='undefined'?'':new URLSearchParams(window.location.search).get('player')??'');
 const [tab,setTab]=useState<Tab>(player?'new':'queue'),[items,setItems]=useState<Case[]>([]),[people,setPeople]=useState<StaffPerson[]>([]),[next,setNext]=useState<string|null>(null);
 const [query,setQuery]=useState(''),[stateFilter,setStateFilter]=useState('all'),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [draft,setDraft]=useState<{rsn:string;op:Action}>({rsn:player,op:'relink'}),[opened,setOpened]=useState<string|null>(null);
 async function request(url:string,body?:object){const r=await fetch('/api/staff/cases'+url,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:undefined);const data=await r.json() as Detail & {error?:string;id:string;items:Case[];people:StaffPerson[];next:string|null;lookup:Lookup};if(!r.ok)throw Error(data.error||'Could not load requests.');return data;}
 async function load(before?:string){const d=await request('?q='+encodeURIComponent(query.trim().toLowerCase())+(before?'&before='+encodeURIComponent(before):''));setItems(old=>before?[...old,...d.items]:d.items);setPeople(old=>before?[...old,...d.people]:d.people);setNext(d.next);}
 useEffect(()=>{const t=setTimeout(()=>void load().catch(e=>setError(e.message)),query?250:0);return()=>clearTimeout(t);},[query]);// eslint-disable-line react-hooks/exhaustive-deps
 async function action(body:object){setBusy(true);setError('');try{const d=await request('',body);await load();return d.id;}catch(e){setError((e as Error).message);return null;}finally{setBusy(false);}}
 function start(rsn:string,op:Action){setDraft({rsn,op});setTab('new');window.scrollTo({top:0,behavior:'smooth'});}
 const pending=items.filter(c=>c.state==='pending'),shown=items.filter(c=>stateFilter==='all'||c.state===stateFilter);
 const rows=(list:Case[])=>list.length?<ol className="ws-list">{list.map(c=><CaseRow key={c.id} item={c} people={people} open={opened===c.id} onToggle={()=>setOpened(opened===c.id?null:c.id)} request={request} action={action} busy={busy} onStart={start}/>)}</ol>:null;
 return <div className="staff-cases">{error&&<p className="community-notice" role="alert">{error}</p>}
  <WorkspaceTabs label="Account ownership" active={tab} onSelect={setTab} tabs={[{id:'queue',label:'Awaiting review',icon:'/icons/navigation/quest-list-icon.png',text:'Requests to decide',count:pending.length,urgent:true},{id:'new',label:'New request',icon:'/items/983.png',text:'Move, hold or release a name'},{id:'all',label:'All requests',icon:'/icons/navigation/quest-point-icon.png',text:'Every request and outcome',count:items.length}]}/>
  {tab==='queue'&&<section className="community-panel"><PanelHead icon="/icons/navigation/quest-list-icon.png" title="Awaiting review" badge={String(pending.length)} text={role==='helper'?'You can open routine requests; staff review them.':'A second reviewer decides each request. Protected accounts need an admin.'}/>
   {rows(pending)??<Empty icon="/items/983.png" title="All caught up" text="No ownership requests are waiting."/>}</section>}
  {tab==='new'&&<NewRequest key={draft.rsn+draft.op} role={role} initial={draft} busy={busy} request={request} onSubmit={async body=>{const id=await action(body);if(id){setOpened(id);setTab('queue');}}}/>}
  {tab==='all'&&<section className="community-panel"><PanelHead icon="/icons/navigation/quest-point-icon.png" title="All requests" text="Search by RuneScape name, Discord ID or username."/>
   <ListTools states={[{id:'all',label:'All',count:items.length},{id:'pending',label:'Awaiting review',count:pending.length},{id:'approved',label:'Approved',count:items.filter(c=>c.state==='approved').length},{id:'rejected',label:'Rejected',count:items.filter(c=>c.state==='rejected').length}]} state={stateFilter} onState={setStateFilter} query={query} onQuery={setQuery} placeholder="RuneScape name, Discord ID or username…"/>
   {rows(shown)??<Empty icon="/items/983.png" title="No requests match" text="Try another filter, name or Discord ID."/>}
   {next&&<button type="button" className="btn sm ws-more" onClick={()=>void load(next).catch(e=>setError(e.message))}>Load older requests</button>}</section>}
 </div>;
}

type Request=(url:string,body?:object)=>Promise<Detail & {lookup:Lookup}>;
/** One request as a compact row; opening it loads the accounts, evidence, decision and timeline. */
function CaseRow({item:c,people,open,onToggle,request,action,busy,onStart}:{item:Case;people:StaffPerson[];open:boolean;onToggle:()=>void;request:Request;action:(body:object)=>Promise<string|null>;busy:boolean;onStart:(rsn:string,op:Action)=>void}){
 const [detail,setDetail]=useState<Detail|null>(null),[error,setError]=useState('');
 const refresh=()=>request('?id='+encodeURIComponent(c.id)).then(setDetail).catch(e=>setError((e as Error).message));
 useEffect(()=>{if(open&&!detail)void refresh();},[open]);// eslint-disable-line react-hooks/exhaustive-deps
 const target=findPerson(people,c.target_id);
 return <ReviewRow state={c.state} when={c.reviewed_at??c.created_at} open={open} onToggle={onToggle}
  icon={<span className={'case-icon is-'+c.action}>{ACTION_ICON[c.action]}</span>}
  title={<><RsName name={c.rsn}/><small className="case-what">{c.action==='relink'?<>{isHold(c.source_id)?'from hold':<>from <DiscordAccount person={findPerson(people,c.source_id)} id={c.source_id}/></>}<ArrowRight size={12} aria-hidden="true"/><DiscordAccount person={target} id={c.target_id}/></>:c.action==='unlink'?'put on hold':'hold released'}</small></>}
  meta={<><Who label="Opened"><PersonName person={findPerson(people,c.creator_id)} fallback={c.creator_name}/></Who>{c.reviewed_at&&<Who label={c.state==='approved'?'Approved':'Rejected'}><PersonName person={findPerson(people,c.reviewer_id??null)} fallback="a reviewer"/></Who>}{c.protected&&c.state==='pending'?<AdminOnly/>:null}</>}>
  {error?<p className="community-notice" role="alert">{error}</p>:detail?<CaseDetail detail={detail} busy={busy} onAction={async body=>{if(await action(body))await refresh();}} onStart={onStart}/>:<p className="fine">Loading…</p>}
 </ReviewRow>;
}

/** Inside an open request: the two accounts, evidence, protection, hold actions, the decision and the timeline. */
function CaseDetail({detail,busy,onAction,onStart}:{detail:Detail;busy:boolean;onAction:(body:object)=>Promise<void>;onStart:(rsn:string,op:Action)=>void}){
 const item=detail.item,who=(id:string|null)=>findPerson(detail.people,id);
 const [note,setNote]=useState(''),[confirm,setConfirm]=useState<'approved'|'rejected'|null>(null);
 const confirmText=item.action==='release'?`Release the hold on ${item.rsn}? Its owner can link it again and the profile is public again.`:item.action==='unlink'?`Hold ${item.rsn}? It is unlinked from its Discord account and kept private until it is linked or released.`:`Link ${item.rsn} to ${who(item.target_id)?.name??item.target_id}? Any current owner loses editing access, the profile becomes private, and private notes and donor perks do not move with it.`;
 return <div className="case-detail">
  {item.state==='pending'&&detail.reasons.length>0&&<div className="case-callout"><ShieldAlert size={18} aria-hidden="true"/><div><b>Needs an admin to approve</b><span className="case-reasons">{detail.reasons.map(r=><span key={r}>{r}</span>)}</span></div></div>}
  <div className="case-transfer"><AccountCard label="From" person={who(item.source_id)} id={item.source_id}/><ArrowRight className="case-arrow" size={20} aria-hidden="true"/>
   {item.action==='relink'?<AccountCard label="To" person={who(item.target_id)} id={item.target_id}/>:<AccountCard label="To" id={null} state={item.action==='release'?'free':'hold'}/>}</div>
  <div className="case-section"><h4>Evidence<span className="case-section-meta">Added by <PersonName person={who(item.creator_id)} fallback={item.creator_name}/> · <time dateTime={item.created_at} title={new Date(item.created_at).toLocaleString()}>{new Date(item.created_at).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'})}</time></span></h4><p className="ws-reason">{item.reason}</p></div>
  {detail.current.held&&<div className="case-callout is-hold"><Lock size={18} aria-hidden="true"/><div><b>{item.rsn} is on hold</b><p>Nobody can link it. Link it to its owner’s Discord ID once ownership is proven, or release the hold.</p><div className="row gap"><button type="button" className="btn sm primary" onClick={()=>onStart(item.rsn,'relink')}><Link2 size={14} aria-hidden="true"/>Link to a Discord ID</button><button type="button" className="btn sm" onClick={()=>onStart(item.rsn,'release')}><LockOpen size={14} aria-hidden="true"/>Release hold</button></div></div></div>}
  <div className="case-section case-decision"><h4>{item.state==='pending'?'Decision':'Add a note'}</h4>
   <textarea rows={3} value={note} onChange={e=>setNote(e.target.value)} minLength={10} maxLength={2000} aria-label="Note or decision reason" placeholder="What you checked and why. Leave out passwords and unrelated personal details."/>
   <div className="case-decision-row"><small className="fine">{item.state!=='pending'?'Notes join the timeline below.':detail.canReview?'Your reason is saved with the decision.':'Another authorised reviewer decides this request.'}</small><div className="row gap"><button className="btn sm ghost" disabled={busy||note.trim().length<10} onClick={()=>void onAction({action:'note',id:item.id,reason:note}).then(()=>setNote(''))}>Add note</button>{detail.canReview&&<><button className="btn sm danger" disabled={busy||note.trim().length<10} onClick={()=>setConfirm('rejected')}>Reject</button><button className="btn sm primary" disabled={busy||note.trim().length<10} onClick={()=>setConfirm('approved')}>Approve</button></>}</div></div>
   {confirm&&<div className="case-confirm" role="alertdialog" aria-label="Confirm account decision"><b>{confirm==='approved'?'Confirm this change':'Reject this request?'}</b><p>{confirm==='approved'?confirmText:'Nothing changes on the account.'}</p><p className="fine">Reason: {note}</p><div className="row gap"><button className="btn sm primary" disabled={busy} onClick={()=>void onAction({action:'review',id:item.id,decision:confirm,reason:note,confirmed:true}).then(()=>{setConfirm(null);setNote('');})}>Confirm {confirm==='approved'?'change':'rejection'}</button><button className="btn sm ghost" disabled={busy} onClick={()=>setConfirm(null)}>Cancel</button></div></div>}
  </div>
  <div className="case-section"><h4>Timeline</h4><ol className="case-timeline">{detail.events.map(e=>{const ev=eventOf(e.action),text=eventDetail(e.detail);return <li key={e.id} className={ev.tone?'is-'+ev.tone:''}><span className="case-dot" aria-hidden="true">{ev.icon}</span><div><p><b>{ev.label}</b>{(e.actor_id||e.actor_name)&&<> by <PersonName person={who(e.actor_id)} fallback={e.actor_name??''}/></>}<time dateTime={e.created_at} title={new Date(e.created_at).toLocaleString()}>{timeAgo(e.created_at)}</time></p>{text&&<p className="case-event-detail">{text}</p>}{protectionOf(e.detail).length>0&&<p className="case-event-detail case-event-admin"><ShieldAlert size={12} aria-hidden="true"/>Needed an admin: {protectionOf(e.detail).join(' · ')}</p>}</div></li>;})}</ol></div>
 </div>;
}

/** A new request in steps, like the correction forms: the name (and who owns it now), what should happen, the new owner, then the evidence. */
function NewRequest({role,initial,busy,request,onSubmit}:{role:StaffRole;initial:{rsn:string;op:Action};busy:boolean;request:Request;onSubmit:(body:object)=>Promise<void>}){
 const [name,setName]=useState(initial.rsn),[found,setFound]=useState<Lookup|null>(null),[lookError,setLookError]=useState(''),[op,setOp]=useState<Action>(initial.op),[target,setTarget]=useState(''),[reason,setReason]=useState('');
 useEffect(()=>{const q=name.trim();setFound(null);setLookError('');if(q.length<1)return;let live=true;const t=setTimeout(()=>request('?lookup='+encodeURIComponent(q)).then(d=>{if(live)setFound(d.lookup);}).catch(e=>{if(live)setLookError((e as Error).message);}),350);return()=>{live=false;clearTimeout(t);};},[name]);// eslint-disable-line react-hooks/exhaustive-deps
 const options:Action[]=found?.held?['relink','release']:['relink','unlink'];
 const choice=options.includes(op)?op:options[0];
 return <section className="community-panel"><PanelHead icon="/items/983.png" title="New request" text="Another authorised staff member reviews it before anything changes."/>
  <form className="staff-form case-form" onSubmit={e=>{e.preventDefault();void onSubmit({action:'create',username:name,operation:choice,targetId:target,reason});}}>
   <Step n={1} title="RuneScape name"><input required maxLength={12} value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Obifloat" aria-label="RuneScape name"/>
    {lookError?<p className="community-notice" role="alert">{lookError}</p>:found&&(found.linked?<div className="case-now">{found.held?<AccountCard label="Now" id={null} state="hold"/>:<AccountCard label="Now owned by" person={found.owner??undefined} id={found.ownerId??null}/>}{(found.reasons?.length??0)>0&&<span className="case-reasons"><small>Needs an admin:</small>{found.reasons!.map(r=><span key={r}>{r}</span>)}</span>}</div>:<p className="fine">Nobody has linked {name.trim()} yet, so there is nothing to move or hold.</p>)}</Step>
   <Step n={2} title="What should happen"><div className="case-operations" role="radiogroup" aria-label="What should happen">{options.map(o=><button key={o} type="button" role="radio" aria-checked={choice===o} className={'is-'+o} onClick={()=>setOp(o)}><span className={'case-icon is-'+o}>{ACTION_ICON[o]}</span><span><b>{o==='relink'&&found?.held?'Link to a Discord ID':ACTIONS[o].title}</b><small>{o==='relink'&&found?.held?'Give the held name to its proven owner.':ACTIONS[o].text}</small></span></button>)}</div></Step>
   {choice==='relink'&&<Step n={3} title="New owner">{role!=='helper'&&<StaffAccountLookup onSelect={setTarget}/>}<label>Discord ID<input required inputMode="numeric" pattern="[0-9]{17,20}" value={target} onChange={e=>setTarget(e.target.value)} placeholder="17 to 20 digits"/></label><p className="fine">An ID works before its owner has signed in. Check it against the evidence.</p></Step>}
   <Step n={choice==='relink'?4:3} title="Evidence"><textarea required minLength={10} maxLength={2000} rows={4} value={reason} onChange={e=>setReason(e.target.value)} placeholder="What you checked, and why this is the right outcome." aria-label="Evidence and reason"/></Step>
   <div className="corr-submit"><button className="btn primary" disabled={busy||!found?.linked}>Submit for review</button></div>
  </form></section>;
}
