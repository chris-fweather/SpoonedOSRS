"use client";
import {useMemo,useState} from 'react';
import type {Journal} from '@/lib/model';
import {collectionEvents,type CollectionEvent} from '@/lib/collection-history';
import {timelineSpan,type TimelineRange} from '@/lib/collection-timeline';
import {collectedDate} from '@/lib/pet-presentation';
import {num} from '@/lib/ui';
import {SortMenu} from './Controls';
import {HoverTip} from './HoverTip';
import {CollectionLollipops} from './CollectionLollipops';
import './collection-timeline.css';

const RANGES:{value:TimelineRange;label:string}[]=[{value:'all',label:'All time'},{value:'year',label:'Past year'},{value:'month',label:'Past 30 days'}];
const KINDS=[['both','Both'],['pets','Pets'],['log','Collection log']] as const;

/** Every dated pet and log slot as a lollipop on a zoomable timeline; the chosen day's collections show below. */
export function CollectionTimeline({journal}:{journal:Journal}) {
 const [kind,setKind]=useState<'both'|'pets'|'log'>('both'),[range,setRange]=useState<TimelineRange>('all'),[chosen,setChosen]=useState<CollectionEvent[]|null>(null);
 const history=useMemo(()=>collectionEvents(journal),[journal]);
 const events=useMemo(()=>history.events.filter(e=>kind==='both'||e.kind===kind),[history,kind]);
 const full=useMemo(()=>timelineSpan(events.map(e=>Date.parse(e.date+'T12:00:00Z')),range),[events,range]);
 // The latest day's collections show until a lollipop is chosen.
 const lastDay=events.at(-1)?.date,shown=chosen??events.filter(e=>e.date===lastDay);
 return <section className="panel completion-panel collection-timeline">
  <div className="ph"><h2>Collection timeline</h2>
   <div className="timeline-controls">
    <div className="seg" aria-label="Collections shown">{KINDS.map(([value,label])=><button key={value} aria-pressed={kind===value} onClick={()=>{setKind(value);setChosen(null);}}>{label}</button>)}</div>
    <SortMenu label="Time range" value={range} onChange={value=>{setRange(value as TimelineRange);setChosen(null);}} options={RANGES}/>
   </div>
  </div>
  {events.length?<>
   <CollectionLollipops events={events} full={full} selected={chosen?.[0]?.id??null} onSelect={setChosen}/>
   <div className="timeline-period"><span>{dayRange(shown)}</span><small><b>{num(shown.length,0)}</b> collected</small></div>
   <div className="cl-items timeline-items">{shown.map(e=><HoverTip key={e.id} className="cl-item got" label={`${e.name}, ${collectedDate(e.date)}`} content={<span className="timeline-tip"><b>{e.name}</b><small>{collectedDate(e.date)}</small></span>}><img src={e.image} alt="" loading="lazy"/></HoverTip>)}</div>
  </>:<p className="fine timeline-empty">Add collection dates to see your timeline.</p>}
  {history.undated>0&&<p className="fine timeline-undated">{num(history.undated,0)} without a date</p>}
 </section>;
}

const dayRange=(items:CollectionEvent[])=>{const first=items[0]?.date??'',last=items.at(-1)?.date??first;return first===last?collectedDate(first):`${collectedDate(first)} – ${collectedDate(last)}`;};
