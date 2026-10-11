'use client';
import {useEffect,useState} from 'react';
import {ExternalLink} from 'lucide-react';
import {driestRecord, PETCORD_SHEET} from '@/lib/petcord';
import type {DriestRecord as RecordData} from '@/lib/petcord';
import {num,shortNumber} from '@/lib/ui';
import {initial} from '@/lib/model';

/** Community driest streak for one pet. Renders nothing when Petcord has no record. */
export function DriestRecord({name, activity}: {name: string; activity?: string}) {
  const [reviewed,setReviewed]=useState<{pet:string;record:RecordData|null;source?:string;review?:number}|null>(null);
  useEffect(()=>{const abort=new AbortController();fetch('/api/records?'+new URLSearchParams({pet:name}),{signal:abort.signal}).then(async r=>r.ok?await r.json() as {record:RecordData|null;source?:string;review?:number}:null).then(data=>{if(data&&!abort.signal.aborted)setReviewed({...data,pet:name});}).catch(()=>{});return()=>abort.abort();},[name]);
  const current=reviewed?.pet===name?reviewed:null;
  const record = current?.record ?? driestRecord(name);
  if (!record) return null;
  const pet=initial.pets.find(p=>p.name===name);
  const img=pet?`/pets/${pet.id}.png`:null;
  return <div className="pop-block driest-record">
    <span className="kicker">Driest recorded</span>
    <div className="driest-person">{img && <img src={img} alt={name}/>}<div>
      <p className="driest-line"><a href={'/player/'+encodeURIComponent(record.username)}>{record.username}</a><span title={`${num(record.count,0)} ${record.unit}`}>{shortNumber(record.count)} {record.unit}</span></p>
      {record.date && <time>{record.date}</time>}
    </div></div>
    {record.note && <p>{record.note}</p>}
    {record.likelihood && <p>Likelihood {record.likelihood}</p>}
    {(record.proof || record.clog) && <div className="pop-links">
      {record.proof && <a className="btn ghost sm" href={record.proof} target="_blank" rel="noreferrer">Pet proof <ExternalLink size={13}/></a>}
      {record.clog && <a className="btn ghost sm" href={record.clog} target="_blank" rel="noreferrer">Collection log proof <ExternalLink size={13}/></a>}
    </div>}
    <p className="fine">{current?.review ? <>Staff-reviewed record · review #{current.review}. <a href={current.source} target="_blank" rel="noreferrer">Evidence</a></> : <>Community record from <a href={PETCORD_SHEET} target="_blank" rel="noreferrer">Petcord</a>.</>}</p>
  </div>;
}
