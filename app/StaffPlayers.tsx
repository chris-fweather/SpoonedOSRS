"use client";
import {useContext,useState} from 'react';
import {ExternalLink,EyeOff,History,KeyRound,Search,ShieldCheck,Wrench} from 'lucide-react';
import {PersonName} from './StaffBadge';
import {StaffProgress} from './StaffProgress';
import {RsName,StaffPeople} from './StaffWorkspace';
import {AccountModeBadge} from './AccountModeBadge';
import {ACCOUNT_MODES,type AccountMode} from '@/lib/account-mode';
import {Empty,PanelHead} from './StaffReview';
import {DiscordMark} from './DiscordMark';
import {ChevronDown} from 'lucide-react';
import type {StaffRole} from '@/lib/staff-policy';
export type DirectoryPlayer={name:string;discordId:string;discordName:string;linkedAt:number;role:StaffRole|null;visibility:string;linked_names:string;pets:number|null;log:number|null;quests:number|null;accountMode:AccountMode|null;checkedAt:string|null;donationMinor:number|null;donationCurrency:string|null;donationShown:number};
const day=(t:number|string|null)=>{if(t==null||t===0)return '—';const n=typeof t==='number'?(t<1e12?t*1000:t):Date.parse(t);return Number.isFinite(n)&&n>0?new Date(n).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}):'—';};
/** Total donated, for admins: hidden amounts are shown but marked, since the player chose not to show them publicly. */
const donated=(p:DirectoryPlayer)=>p.donationMinor&&p.donationMinor>0?new Intl.NumberFormat('en-US',{style:'currency',currency:p.donationCurrency||'USD',maximumFractionDigits:p.donationMinor%100?2:0}).format(p.donationMinor/100):null;
/** Players: find a linked profile, see it the way the site shows it, and act on it (open the profile, start an ownership request,
 * manage staff access, fix progress or look up its correction history). */
export function StaffPlayers({players,total,owner,corrections,onSearch,onAccess,onHistory,onOwnership}:{players:DirectoryPlayer[];total:number;owner:boolean;corrections:boolean;onSearch:(q:string)=>void;onAccess:(name:string)=>void;onHistory:(name:string)=>void;onOwnership:(name:string)=>void}){
 const [query,setQuery]=useState(''),[open,setOpen]=useState<string|null>(()=>typeof window==='undefined'?null:new URLSearchParams(window.location.search).get('player')),[fixing,setFixing]=useState<string|null>(null);
 const people=useContext(StaffPeople);
 return <div className="staff-players">
  <section className="community-panel"><PanelHead icon="/icons/community/friends-list.png" title="Players" badge={total.toLocaleString()} text="Search a RuneScape name or a Discord username. Open a player for their profile, ownership and access."/>
   <form className="staff-player-search" onSubmit={e=>{e.preventDefault();onSearch(query);}}><label className="search ws-search"><Search size={16} aria-hidden="true"/><input aria-label="Search players or Discord names" value={query} maxLength={80} onChange={e=>setQuery(e.target.value)} placeholder="RuneScape name or Discord username…"/></label><button className="btn">Search</button></form>
   {players.length?<ol className="ws-list player-list">{players.map(p=>{const person=people.find(x=>x.id===p.discordId),names=(JSON.parse(p.linked_names) as string[]).filter(n=>n!==p.name),isOpen=open===p.name;
    // The name as this profile shows it: the main account's scimitar, Sir and title, on this RuneScape name.
    const shown=person?{...person,display:{...(person.display??{prefix:null,displayRole:null,generous:false,supporter:false,gilded:false}),rsn:p.name}}:null;
    return <li key={p.name} className={'ws-row'+(isOpen?' is-open':'')}>
     <button type="button" className="ws-row-head player-row" aria-expanded={isOpen} onClick={()=>{setOpen(isOpen?null:p.name);setFixing(null);}}>
      {person?.avatarUrl?<img className="player-avatar" src={person.avatarUrl} alt=""/>:<span className="player-avatar">{p.name.charAt(0).toUpperCase()}</span>}
      <span className="ws-row-main"><span className="ws-row-title"><PersonName person={shown} fallback={p.name} role={p.role}/></span><span className="ws-row-meta"><span className="player-discord"><DiscordMark/>@{p.discordName}</span>{names.length>0&&<span>also {names.join(', ')}</span>}</span></span>
      <span className="player-stats" aria-label="Progress"><span title="Pets"><img src="/brand/rocky-mascot.webp" alt=""/>{p.pets??'—'}</span><span title="Collection log slots"><img src="/icons/navigation/collection-log-icon.png" alt=""/>{p.log??'—'}</span><span title="Quest points"><img src="/icons/navigation/quest-point-icon.png" alt=""/>{p.quests??'—'}</span>{donated(p)&&<span className={'player-donation'+(p.donationShown?'':' is-hidden')} title={p.donationShown?'Donated':'Donated (hidden on their profile)'}><img src="/icons/community/sponsor-coin.png" alt=""/>{donated(p)}{!p.donationShown&&<EyeOff size={12} aria-label="Hidden"/>}</span>}</span>
      <span className={'staff-visibility is-'+p.visibility}>{p.visibility==='private'?'Private':'Public'}</span>
      <ChevronDown className="ws-row-chevron" size={16} aria-hidden="true"/>
     </button>
     {isOpen&&<div className="ws-row-body player-body">
      <dl className="player-facts"><div><dt>Account</dt><dd>{p.accountMode?<><AccountModeBadge mode={p.accountMode}/>{ACCOUNT_MODES[p.accountMode]??p.accountMode}</>:'Main'}</dd></div><div><dt>Linked</dt><dd>{day(p.linkedAt)}</dd></div><div><dt>Last full sync</dt><dd>{day(p.checkedAt)}</dd></div>{donated(p)&&<div><dt>Donated</dt><dd>{donated(p)}{!p.donationShown&&<small className="player-hidden-note">Hidden on their profile</small>}</dd></div>}<div><dt>Discord</dt><dd><DiscordMark/>@{p.discordName}</dd></div>{names.length>0&&<div><dt>Other names</dt><dd>{names.map(n=><RsName key={n} name={n}/>)}</dd></div>}</dl>
      <div className="player-actions">
      <a className="btn sm" href={'/player/'+encodeURIComponent(p.name)} target="_blank" rel="noreferrer"><ExternalLink size={14} aria-hidden="true"/>View profile</a>
      <button type="button" className="btn sm" onClick={()=>onOwnership(p.name)}><KeyRound size={14} aria-hidden="true"/>Ownership request</button>
      {owner&&<button type="button" className="btn sm" onClick={()=>onAccess(p.name)}><ShieldCheck size={14} aria-hidden="true"/>Staff access</button>}
      {corrections&&<button type="button" className="btn sm" onClick={()=>onHistory(p.name)}><History size={14} aria-hidden="true"/>Correction history</button>}
      <button type="button" className="btn sm ghost" aria-pressed={fixing===p.name} onClick={()=>setFixing(fixing===p.name?null:p.name)}><Wrench size={14} aria-hidden="true"/>Fix progress</button>
      </div>
      {fixing===p.name&&<div className="player-fix"><StaffProgress key={p.name} player={p.name}/></div>}
     </div>}
    </li>;})}</ol>
   :<Empty icon="/icons/community/friends-list.png" title="No players match" text="Try a RuneScape name or a Discord username."/>}
  </section>
 </div>;
}
