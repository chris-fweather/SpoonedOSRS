'use client';
import {useEffect,useState} from 'react';
type Person={discord_id:string;username:string;global_name:string|null;accounts:string};

/** This directory stays behind the existing moderator/admin API permission. */
export function StaffAccountLookup({onSelect}:{onSelect:(id:string)=>void}) {
 const [query,setQuery]=useState(''),[people,setPeople]=useState<Person[]>([]),[state,setState]=useState<'idle'|'loading'|'ready'|'error'>('idle');
 useEffect(()=>{
  setPeople([]);
  if(query.trim().length<2){setState('idle');return;}
  const controller=new AbortController();setState('loading');
  const timer=setTimeout(async()=>{try{
   const response=await fetch('/api/staff/cases?q='+encodeURIComponent(query.trim()),{signal:controller.signal});
   if(!response.ok)throw Error();
   const data=await response.json() as {users:Person[]};
   if(!controller.signal.aborted){setPeople(data.users);setState('ready');}
  }catch{if(!controller.signal.aborted)setState('error');}},350);
  return()=>{clearTimeout(timer);controller.abort();};
 },[query]);
 return <div className="staff-account-lookup"><label>Find the destination account<input value={query} maxLength={80} onChange={e=>setQuery(e.target.value)} placeholder="Discord username, ID or linked RuneScape name"/></label>
  <div aria-live="polite">{state==='loading'&&<p>Searching accounts…</p>}{state==='error'&&<p>Search is unavailable. Retry or paste the verified Discord ID below.</p>}{state==='ready'&&!people.length&&<p>No saved match. For someone who has not signed in, paste their Discord ID below.</p>}</div>
  <div className="case-directory">{people.map(person=><button type="button" className="case-person" key={person.discord_id} onClick={()=>{onSelect(person.discord_id);setQuery('');}}><b>{person.global_name||person.username}</b><small>@{person.username} · {person.discord_id}</small><span>{JSON.parse(person.accounts).join(' · ')||'No linked profiles'}</span><strong>Select account →</strong></button>)}</div>
 </div>;
}
