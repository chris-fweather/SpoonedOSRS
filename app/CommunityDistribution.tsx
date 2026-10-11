import {useId} from 'react';
import type {BoardRow} from '@/lib/flair';
import {communityDistribution, BOARD_METRICS, type BoardMetric} from '@/lib/community';
import {compact, num} from '@/lib/ui';

type Series={key:string;label:string;value:number|null};
const tones:Record<string,string>={player:'#d2b97c',other:'#90b28b',average:'#9bc4d5'};
export function CommunityDistribution({rows,metric,series}:{rows:BoardRow[];metric:BoardMetric;series:Series[]}){
 const id=useId(),{count,ceiling,bins}=communityDistribution(rows,metric);
 if(!count)return <p className="distribution-empty">Sync progress to see the community spread.</p>;
 const peak=Math.max(1,...bins.map(b=>b.count)),left=32,right=584,top=28,bottom=134,width=right-left;
 const x=(value:number)=>left+Math.min(1,value/ceiling)*width;
 const label=BOARD_METRICS.find(m=>m.id===metric)!.label;
 return <div className="community-distribution">
  <svg viewBox="0 0 610 164" role="img" aria-labelledby={id+'-title '+id+'-desc'}>
   <title id={id+'-title'}>{label}: distribution of {count} synced accounts</title>
   <desc id={id+'-desc'}>{bins.map(b=>`${num(b.low,0)} to ${num(b.high-1,0)}: ${b.count} accounts`).join('; ')}. {series.filter(s=>s.value!==null).map(s=>`${s.label}: ${num(s.value!,1)}`).join('; ')}.</desc>
   <text x={left} y="13" className="distribution-axis-label">ACCOUNTS</text>
   {[0,peak].map(n=>{const y=bottom-n/peak*(bottom-top);return <g key={n}><line x1={left} x2={right} y1={y} y2={y} className="distribution-grid"/><text x="23" y={y+4} textAnchor="end">{n}</text></g>;})}
   {bins.map(b=><rect key={b.low} x={x(b.low)+2} y={bottom-b.count/peak*(bottom-top)} width={Math.max(1,width/bins.length-4)} height={b.count/peak*(bottom-top)} rx="2" className="distribution-bin"><title>{num(b.low,0)}–{num(b.high-1,0)}: {b.count} account{b.count===1?'':'s'}</title></rect>)}
   {series.filter(s=>s.value!==null).map((s,i)=><g key={s.key}><line x1={x(s.value!)} x2={x(s.value!)} y1={top-3} y2={bottom} stroke={tones[s.key]} strokeWidth="2" strokeDasharray={s.key==='average'?'4 3':undefined}/><circle cx={x(s.value!)} cy={top-3+i*7} r="3" fill={tones[s.key]}/></g>)}
   <text x={left} y="155">0</text><text x={left+width/2} y="155" textAnchor="middle">{compact(ceiling/2)}</text><text x={right} y="155" textAnchor="end">{compact(ceiling)}</text>
  </svg>
  <div className="distribution-legend">{series.map(s=><span key={s.key}><i className={'series-key '+s.key}/>{s.label}<b>{s.value===null?'Not synced':num(s.value,s.key==='average'?1:0)}</b></span>)}</div>
  {count<5&&<p className="fine distribution-note">Only {count} synced account{count===1?'':'s'} — a small sample, not a reliable picture of the wider community.</p>}
 </div>;
}
