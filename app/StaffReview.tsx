"use client";
import type {ReactNode} from 'react';
import {ChevronDown,Search} from 'lucide-react';
import {StateLabel,timeAgo} from './StaffWorkspace';

/** Shared building blocks for the review workspaces (Corrections and Ownership), so both read the same way:
 * section tabs with counts, a panel heading, numbered form steps, and compact rows that open in place. */
export type WorkspaceTab<T extends string>={id:T;label:string;icon:string;text:string;count?:number;urgent?:boolean};
export function WorkspaceTabs<T extends string>({label,tabs,active,onSelect}:{label:string;tabs:WorkspaceTab<T>[];active:T;onSelect:(id:T)=>void}){
 return <nav className="ws-tabs" aria-label={label}>{tabs.map(t=><button key={t.id} type="button" aria-pressed={active===t.id} onClick={()=>onSelect(t.id)}><img src={t.icon} alt=""/><span><b>{t.label}</b><small>{t.text}</small></span>{t.count!=null&&t.count>0&&<em className={t.urgent?'is-urgent':''}>{t.count}</em>}</button>)}</nav>;
}
/** A panel's heading: icon tile, title, one line of help, and optional actions on the right. */
export function PanelHead({icon,title,text,badge,actions}:{icon:string;title:string;text:string;badge?:string;actions?:ReactNode}){
 return <header className="ws-head"><span className="ws-head-icon"><img src={icon} alt=""/></span><div><h3>{title}{badge!=null&&<em>{badge}</em>}</h3><p>{text}</p></div>{actions&&<div className="ws-head-actions">{actions}</div>}</header>;
}
/** A numbered step in a form. */
export function Step({n,title,children}:{n:number;title:string;children:ReactNode}){
 return <fieldset className="ws-step"><legend><i>{n}</i>{title}</legend>{children}</fieldset>;
}
/** Who did what, as small labelled steps: "Proposed · name", "Approved · name". */
export function Who({label,children}:{label:string;children:ReactNode}){return <span className="ws-who"><small>{label}</small>{children}</span>;}
/** A compact row: icon, title and who, the value, state and time. Opens in place to show the details. */
export function ReviewRow({icon,title,meta,value,state,when,open,onToggle,children}:{icon:ReactNode;title:ReactNode;meta:ReactNode;value?:ReactNode;state:string;when:string;open:boolean;onToggle:()=>void;children?:ReactNode}){
 return <li className={'ws-row state-'+state+(open?' is-open':'')}>
  <button type="button" className="ws-row-head" aria-expanded={open} onClick={onToggle}>
   <span className="ws-row-icon" aria-hidden="true">{icon}</span>
   <span className="ws-row-main"><span className="ws-row-title">{title}</span><span className="ws-row-meta">{meta}</span></span>
   {value!=null&&<span className="ws-row-value">{value}</span>}
   <span className="ws-row-side"><StateLabel state={state}/><time dateTime={when} title={new Date(when).toLocaleString()}>{timeAgo(when)}</time></span>
   <ChevronDown className="ws-row-chevron" size={16} aria-hidden="true"/>
  </button>
  {open&&<div className="ws-row-body">{children}</div>}
 </li>;
}
/** State filter chips and a search box above a list. */
export function ListTools({states,state,onState,query,onQuery,placeholder}:{states:{id:string;label:string;count:number}[];state:string;onState:(id:string)=>void;query:string;onQuery:(q:string)=>void;placeholder:string}){
 return <div className="ws-tools"><div className="staff-filter" role="group" aria-label="Filter by state">{states.map(s=><button type="button" key={s.id} className={'state-'+s.id} aria-pressed={state===s.id} onClick={()=>onState(s.id)}>{s.id!=='all'&&<i aria-hidden="true"/>}{s.label} <b>{s.count}</b></button>)}</div>
  <label className="search ws-search"><Search size={16} aria-hidden="true"/><input aria-label={placeholder} placeholder={placeholder} value={query} onChange={e=>onQuery(e.target.value)}/></label></div>;
}
/** An empty list, with an icon and a line of help. */
export function Empty({icon,title,text}:{icon:string;title:string;text:string}){return <div className="staff-empty-state ws-empty"><img src={icon} alt=""/><b>{title}</b><p>{text}</p></div>;}
