"use client";
import {useState} from 'react';
import {JournalLoading} from './JournalLoading';
import {CollectionTimeline} from './CollectionTimeline';
import {initial} from '@/lib/model';
const journal=structuredClone(initial);journal.username='Layout preview';journal.pets.forEach((p,i)=>{p.obtained=i<6;p.date=i<6?`2025-${String(i+1).padStart(2,'0')}-10`:'';p.notes='';});
journal.collectionDates={};for(const tab of journal.log?.tabs??[])for(const page of tab.pages)for(const item of page.items)if(item.quantity>0&&!journal.pets.some(p=>p.id===String(item.id)))journal.collectionDates[String(item.id)]='2025-04-15';
export function ProgressPreview(){const [view,setView]=useState('loading');return <div className="site"><div className="row gap" style={{padding:16}}><b>Development layout fixture</b><button className="btn sm" onClick={()=>setView('loading')}>Loading profile</button><button className="btn sm" onClick={()=>setView('timeline')}>Collection timeline</button></div>{view==='loading'?<JournalLoading username="Preview" failed={false}/>:<main style={{padding:16}}><CollectionTimeline journal={journal}/></main>}</div>;}
