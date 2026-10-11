 'use client';
import {useEffect,useState} from 'react';
import {PlayerCard,type ProfileFlair} from './Profile';
import type {Journal} from '@/lib/model';
import {PlayerComparison} from './Community';
import {HomeBoards} from './Home';
import type {BoardRow} from '@/lib/flair';
const examples:BoardRow[]=Array.from({length:25},(_,i)=>({name:i===0?'WWWWWWWWWWWW':`Example ${String(i+1).padStart(2,'0')}`,title:'the Generous',pets:60-i*2,log:1400-i*35,hasJournal:true,stats:{petTotal:71,logTotal:1717,questPoints:343-i*8,questTotal:343,combat:655-i*20,combatTotal:655,diaries:492-i*12,diaryTotal:492,xp:450000000-i*15000000,syncedAt:'2026-10-05T00:00:00Z'},achievementTitle:i===0?'the Completionist':'the Pet Collector',staff:i<4?{role:(['owner','admin','moderator','helper'] as const)[i],prefix:null,displayPrefix:i<2?'Sir':null}:null,donation:{amountMinor:50000-i*1800,currency:'USD',hidden:false}}));
export function CommunityPreview(){return <main className="community-page home-page" onClick={e=>{const link=(e.target as HTMLElement).closest('a');if(link?.getAttribute('href')?.startsWith('/player/'))e.preventDefault();}}><section className="community-preview-note"><h1>Community layout preview</h1><p>25 fictional profiles and sample donations, shown five at a time. Use the arrows to page through both lists. These examples do not change the live community or open player profiles.</p><a href="/">Back to the real homepage →</a></section><HomeBoards rows={examples}/><ReputationPreview/><PlayerComparison rows={examples}/></main>;}

function ReputationPreview(){
 const [sample,setSample]=useState<{journal:Journal;flair:ProfileFlair}|null>(null),[count,setCount]=useState(1250),[error,setError]=useState(false);
 useEffect(()=>{const abort=new AbortController();void Promise.all(['/api/journal?username=Obifloat','/api/profile?username=Obifloat'].map(async url=>{const r=await fetch(url,{signal:abort.signal});if(!r.ok)throw Error('Preview unavailable');return r.json();})).then(([journal,flair])=>{if(!abort.signal.aborted)setSample({journal:journal as Journal,flair:{...flair as ProfileFlair,canEdit:false,preview:false}});}).catch(()=>{if(!abort.signal.aborted)setError(true);});return()=>abort.abort();},[]);
 return <section className="community-panel reputation-preview"><div className="reputation-example">{sample?<PlayerCard journal={sample.journal} flair={sample.flair} onFlair={async()=>false} reputationPreview={count}/>:<p>{error?'Could not load the profile preview. Reload to retry.':'Loading portrait…'}</p>}</div><div><span className="kicker">Display preview only</span><h2>Respect on your profile</h2><p>Sample counts on the same portrait control. These do not create or change any votes.</p><div className="rep-samples" role="group" aria-label="Sample reputation count">{[0,25,1250,12500].map(n=><button className="btn" type="button" key={n} aria-pressed={count===n} onClick={()=>setCount(n)}>{n.toLocaleString('en-US')}</button>)}</div></div></section>;
}
