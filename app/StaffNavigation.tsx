'use client';
import {useEffect, useRef, type KeyboardEvent} from 'react';

export const STAFF_TABS = [
  {id:'overview',label:'Overview',icon:'/icons/navigation/stats-icon.png',title:'Overview',description:'What needs attention, recent review activity and quick links to your areas.'},
  {id:'requests',label:'Requests',icon:'/icons/navigation/quest-list-icon.png',title:'Account requests',description:'Ownership requests, evidence and account history.'},
  {id:'corrections',label:'Corrections',icon:'/items/2347.png',title:'Corrections',description:'Propose changes and review community submissions.'},
  {id:'history',label:'History',icon:'/icons/navigation/collection-log-icon.png',title:'Correction history',description:'Search past submissions and review decisions.'},
  {id:'planning',label:'Planning',icon:'/icons/navigation/combat-achievements-icon.png',title:'Planning references',description:'Acquisition records and shared planning references.'},
  {id:'guides',label:'Guides',icon:'/icons/navigation/quest-point-icon.png',title:'Guide workshop',description:'Write guides, insert requirements and build loadouts. Drafts stay separate from the published guide.'},
  {id:'players',label:'Players',icon:'/icons/community/friends-list.png',title:'Player directory',description:'Find players and inspect linked accounts.'},
  {id:'progress',label:'Progress',icon:'/icons/navigation/skills-icon.png',title:'Correct progress',description:'Admin corrections with evidence and account history.'},
  {id:'staff',label:'Permissions',icon:'/icons/community/settings-icon.png',title:'Permissions',description:'Ranks, custom access and what each rank can open.'},
  {id:'discord',label:'Discord bot',icon:'/icons/community/clan-chat.png',title:'Discord bot',description:'Manage community bot commands and connections.'},
] as const;
export type StaffTabId = (typeof STAFF_TABS)[number]['id'];
/** Accepts tab ids and the older `?tab=Progress` style labels. */
export function staffTabFrom(value:string|null|undefined):StaffTabId|null {
  const v=value?.trim().toLowerCase();
  return STAFF_TABS.find(t=>t.id===v||t.label.toLowerCase()===v||t.title.toLowerCase()===v)?.id??(v==='staff access'||v==='staff & permissions'?'staff':v==='guide workshop'?'guides':null);
}

/** Horizontal section tabs, styled like the profile and leaderboard tabs. Scrolls sideways on phones. */
export function StaffTabs({allowed,active,onSelect}:{allowed:StaffTabId[];active:StaffTabId;onSelect:(tab:StaffTabId)=>void}) {
  const list=useRef<HTMLDivElement>(null),tabs=STAFF_TABS.filter(t=>allowed.includes(t.id));
  // Keep the selected tab in view inside the scrolling row without moving the page.
  useEffect(()=>{const row=list.current,tab=row?.querySelector<HTMLElement>('[aria-selected=true]');if(row&&tab&&row.scrollWidth>row.clientWidth)row.scrollTo({left:tab.offsetLeft-(row.clientWidth-tab.offsetWidth)/2,behavior:'smooth'});},[active]);
  function keys(e:KeyboardEvent){
    const index=tabs.findIndex(t=>t.id===active),next=e.key==='ArrowRight'?index+1:e.key==='ArrowLeft'?index-1:e.key==='Home'?0:e.key==='End'?tabs.length-1:null;
    if(next===null)return;e.preventDefault();const tab=tabs[(next+tabs.length)%tabs.length];onSelect(tab.id);list.current?.querySelector<HTMLElement>('#staff-tab-'+tab.id)?.focus();
  }
  return <div ref={list} className="staff-tabs" role="tablist" aria-label="Staff portal sections" onKeyDown={keys}>
    {tabs.map(t=><button key={t.id} id={'staff-tab-'+t.id} type="button" role="tab" aria-selected={active===t.id} aria-controls="staff-panel" tabIndex={active===t.id?0:-1} onClick={()=>onSelect(t.id)}><img src={t.icon} alt=""/><span>{t.label}</span></button>)}
  </div>;
}
