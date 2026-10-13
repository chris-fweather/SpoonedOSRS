'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {RankIcon} from './StaffBadge';
import {DiscordMark} from './DiscordMark';
import {AchievementEmblem} from './AchievementEmblem';
import {ProfileIdentity,type IdentityProps} from './ProfileIdentity';
import {ChevronDown,Lock,Settings,X} from 'lucide-react';
import {STAFF_LABEL,STAFF_TONE,type StaffRole} from '@/lib/staff-policy';
import {titleEffect} from '@/lib/presentation';
import type {Mark} from '@/lib/flair';
import {lockPageScroll} from '@/lib/scroll-lock';
import './account-settings.css';
import './title-rarities.css';
import './profile-staff-controls.css';
type Title={id:string;label:string;requirement:string;unlocked:boolean};
type Panel={name:string;linkedNames:string[];role:StaffRole|null;allowed:(StaffRole|null)[];reason:string|null;manage:boolean;journal:boolean;
 account:{linked:boolean;discordName:string|null;username:string|null;hold:boolean;canUnlink:boolean;canRelink:boolean};
 profile:{visibility:'public'|'private';title:string|null;badge:string|null;titleId:string;badgeId:string|null;titles:Title[];badges:Mark[]}|null};
const RANKS:StaffRole[]=['helper','moderator','admin','owner'];
const rankWord=(r:StaffRole)=>`${r==='admin'?'an':'a'} ${STAFF_LABEL[r]}`;
async function load(username:string,signal?:AbortSignal){const r=await fetch('/api/staff/profile?username='+encodeURIComponent(username),{signal});return r.ok?await r.json() as Panel:null;}

export function ProfileStaffControls({username,viewerKey,identity}:{username:string;viewerKey:string;identity:IdentityProps}){
 const [panel,setPanel]=useState<Panel|null>(null),[open,setOpen]=useState(false);
 useEffect(()=>{setPanel(null);setOpen(false);if(viewerKey==='guest')return;const abort=new AbortController();
  load(username,abort.signal).then(data=>{if(!abort.signal.aborted)setPanel(data);}).catch(()=>{});
  return()=>abort.abort();
 },[username,viewerKey]);
 if(!panel)return null;
 return <><button className="portrait-settings" type="button" title="Staff controls" aria-label={`Staff controls for ${username}`} aria-haspopup="dialog" onClick={()=>setOpen(true)}><Settings size={19}/></button>{open&&<StaffDialog initial={panel} identity={identity} onClose={changed=>{setOpen(false);if(changed)window.location.reload();}}/>}</>;
}

/** Quick staff panel: rank, profile settings and the Discord link for this name. Every change is audited server-side. */
function StaffDialog({initial,identity,onClose}:{initial:Panel;identity:IdentityProps;onClose:(changed:boolean)=>void}){
 const dialog=useRef<HTMLDialogElement>(null),[data,setData]=useState(initial),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[changed,setChanged]=useState(false);
 const [rank,setRank]=useState<StaffRole|null>(null),[removing,setRemoving]=useState(false),[confirm,setConfirm]=useState<'unlink'|'relink'|null>(null),[picker,setPicker]=useState<'title'|'badge'|null>(null);
 useEffect(()=>{const previous=document.activeElement instanceof HTMLElement?document.activeElement:null,restore=lockPageScroll();dialog.current?.showModal();return()=>{dialog.current?.close();restore();previous?.focus({preventScroll:true});};},[]);
 const send=useCallback(async(url:string,body:object,message:string)=>{
  setBusy(true);setError('');setNotice('');
  try{const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const result=await r.json() as {error?:string};if(!r.ok)throw Error(result.error??'Could not save.');
   setChanged(true);setNotice(message);setRank(null);setRemoving(false);setConfirm(null);setPicker(null);const next=await load(data.name);if(next)setData(next);
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 },[data.name]);
 const profile=(body:object,message:string)=>send('/api/staff/profile',{username:data.name,...body},message);
 const close=()=>{if(!busy)onClose(changed);};
 const a=data.account,p=data.profile,titles=p?.titles??[];
 // The header follows changes made here: the rank's scimitar and the achievement title.
 const header={...identity,staff:data.role?{role:data.role,prefix:identity.staff?.prefix??null}:null,earnedTitle:p?p.title:identity.earnedTitle};
 return createPortal(<dialog ref={dialog} className="profile-staff-dialog" aria-label={`Staff controls for ${data.name}`} onCancel={e=>{e.preventDefault();close();}}>
  <header><div className="psc-heading"><span className="kicker">Staff controls</span><ProfileIdentity {...header}/></div><button type="button" className="icon-btn" aria-label="Close staff controls" disabled={busy} onClick={close}><X size={20}/></button></header>
  <div className="psc-body">
   <section aria-labelledby="psc-rank">
    <div className="psc-section-head"><h3 id="psc-rank">Rank</h3>{data.role&&data.allowed.includes(null)&&!removing&&<button type="button" className="link psc-remove" disabled={busy} onClick={()=>{setRemoving(true);setRank(null);}}>Remove rank</button>}</div>
    <div className="psc-ranks" role="radiogroup" aria-label={`Rank for ${data.name}`}>
     {RANKS.map(r=><label key={r} className="account-choice" title={r==='owner'?'Not assignable':undefined}>
      <input className="sr-only" type="radio" name="psc-rank" checked={(rank??data.role)===r} disabled={busy||(r!==data.role&&(r==='owner'||!data.allowed.includes(r)))} onChange={()=>{setRank(r===data.role?null:r);setRemoving(false);setNotice('');setError('');}}/>
      <RankIcon staff={{role:r,prefix:null}}/><span className={STAFF_TONE[r]}>{STAFF_LABEL[r]}</span>
     </label>)}
    </div>
    {rank&&<div className="psc-confirm" role="group" aria-label="Confirm rank"><span>Make {data.name} {rankWord(rank)}?</span><button type="button" className="btn sm primary" disabled={busy} onClick={()=>void send('/api/staff',{action:'grant',username:data.name,role:rank},`${data.name} is now ${STAFF_LABEL[rank]}.`)}>Confirm</button><button type="button" className="btn sm ghost" disabled={busy} onClick={()=>setRank(null)}>Cancel</button></div>}
    {removing&&data.role&&<div className="psc-confirm" role="group" aria-label="Confirm removing the rank"><span>Remove {data.name}&apos;s {STAFF_LABEL[data.role]} rank?</span><button type="button" className="btn sm danger" disabled={busy} onClick={()=>void send('/api/staff',{action:'grant',username:data.name,role:null},`${data.name} no longer has a rank.`)}>Remove</button><button type="button" className="btn sm ghost" disabled={busy} onClick={()=>setRemoving(false)}>Cancel</button></div>}
    {!data.allowed.length&&data.reason&&<p className="psc-note">{data.reason}</p>}
   </section>
   {p&&<section aria-labelledby="psc-profile">
    <h3 id="psc-profile">Profile</h3>
    <div className="psc-row"><span className="psc-label">Visibility</span>
     <div className="psc-choice" role="radiogroup" aria-label="Profile visibility">{(['public','private'] as const).map(v=><label key={v} className="account-choice"><input type="radio" name="psc-visibility" checked={p.visibility===v} disabled={busy||!data.manage} onChange={()=>void profile({action:'visibility',visibility:v},v==='private'?'Profile is private and off the leaderboards.':'Profile is public.')}/>{v==='public'?'Public':'Private'}</label>)}</div>
    </div>
    <p className="psc-note">Private also hides it from leaderboards.</p>
    <div className="psc-row"><span className="psc-label">Title</span>
     <button type="button" className="psc-pick" aria-expanded={picker==='title'} disabled={busy||!data.manage} onClick={()=>setPicker(picker==='title'?null:'title')}>{p.title?<span className={'achievement-text '+titleEffect(p.title)}>{p.title}</span>:<span className="is-none">None</span>}<ChevronDown size={16} aria-hidden="true"/></button>
    </div>
    {picker==='title'&&<ul className="psc-options" role="listbox" aria-label="Achievement titles">
     <li><button type="button" role="option" aria-selected={p.titleId==='none'} disabled={busy} onClick={()=>void profile({action:'set-title',title:'none'},'Title removed.')}><span className="is-none">None</span></button></li>
     {titles.map(t=><li key={t.id}><button type="button" role="option" aria-selected={p.titleId===t.id} disabled={busy||!t.unlocked} title={t.requirement} onClick={()=>void profile({action:'set-title',title:t.id},`Title set to ${t.label}.`)}><span className={'achievement-text '+titleEffect(t.label)}>{t.label}</span>{!t.unlocked&&<Lock size={13} aria-label="Not unlocked"/>}</button></li>)}
    </ul>}
    <div className="psc-row"><span className="psc-label">Badge</span>
     <button type="button" className="psc-pick" aria-expanded={picker==='badge'} disabled={busy||!data.manage} onClick={()=>setPicker(picker==='badge'?null:'badge')}>{p.badge?<span>{p.badge}</span>:<span className="is-none">None</span>}<ChevronDown size={16} aria-hidden="true"/></button>
    </div>
    {picker==='badge'&&<ul className="psc-options" role="listbox" aria-label="Display badges">
     <li><button type="button" role="option" aria-selected={!p.badgeId} disabled={busy} onClick={()=>void profile({action:'set-badge',badge:null},'Badge removed.')}><span className="is-none">None</span></button></li>
     {p.badges.map(b=><li key={b.id}><button type="button" role="option" aria-selected={p.badgeId===b.id} disabled={busy} title={b.detail} onClick={()=>void profile({action:'set-badge',badge:b.id},`Badge set to ${b.name}.`)}><AchievementEmblem mark={b} className="psc-emblem"/><span>{b.name}</span></button></li>)}
     {!p.badges.length&&<li className="psc-note">No badges earned yet.</li>}
    </ul>}
   </section>}
   <section aria-labelledby="psc-account">
    <h3 id="psc-account">Account</h3>
    {a.hold?<p className="psc-note">On moderation hold. <a className="link" href="/staff?tab=ownership">Open requests →</a></p>
     :<div className="psc-row psc-account"><DiscordMark/><span className="psc-discord"><b>{a.linked?a.discordName:'Not linked'}</b>{a.username&&<small>{a.linked?'@':'Reserved to @'}{a.username}</small>}</span>
      <span className="psc-actions">{a.canUnlink&&<button type="button" className="btn sm ghost" disabled={busy} onClick={()=>setConfirm('unlink')}>Unlink</button>}{a.canRelink&&<button type="button" className="btn sm ghost" disabled={busy} onClick={()=>setConfirm('relink')}>Relink</button>}{(a.linked||a.canRelink)&&<a className="btn sm ghost" href={'/staff?tab=requests&player='+encodeURIComponent(data.name)}>Move to another account</a>}</span>
     </div>}
    {confirm&&<div className="psc-confirm" role="group" aria-label={confirm==='unlink'?'Confirm unlink':'Confirm relink'}><span>{confirm==='unlink'?`Unlink ${data.name} from @${a.username}?`:`Relink ${data.name} to @${a.username}?`}</span><button type="button" className="btn sm primary" disabled={busy} onClick={()=>void profile({action:confirm,confirmed:true},confirm==='unlink'?`${data.name} is unlinked and stays reserved to @${a.username}.`:`${data.name} is linked to @${a.username} again.`)}>Confirm</button><button type="button" className="btn sm ghost" disabled={busy} onClick={()=>setConfirm(null)}>Cancel</button></div>}
   </section>
   {error&&<p className="psc-status is-bad" role="alert">{error}</p>}{notice&&<p className="psc-status" role="status">{notice}</p>}
  </div>
  <footer>{data.journal&&<a className="link" href={'/staff?tab=players&player='+encodeURIComponent(data.name)}>Edit progress →</a>}<a className="link" href="/staff">Open staff portal →</a><button type="button" className="btn" disabled={busy} onClick={close}>{changed?'Close and refresh':'Close'}</button></footer>
 </dialog>,document.body);
}
