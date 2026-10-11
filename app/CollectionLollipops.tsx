"use client";
import {useEffect,useMemo,useRef,useState} from 'react';
import {Minus,Plus} from 'lucide-react';
import type {CollectionEvent} from '@/lib/collection-history';
import {calendarCells,MONTHS,placeLollipops} from '@/lib/collection-timeline';
import {collectedDate} from '@/lib/pet-presentation';

type Span={start:number;end:number};
type Dated=CollectionEvent&{time:number};
const DAY=86_400_000,LEFT=22,RIGHT=34,BASE=196,STRIP=18,R=16,headY=(level:number)=>BASE-46-level*42;
const clamp=(view:Span,full:Span):Span=>{const span=Math.min(full.end-full.start,Math.max(3*DAY,view.end-view.start)),start=Math.max(full.start,Math.min(view.start,full.end-span));return {start,end:start+span};};
const zoom=(view:Span,full:Span,factor:number,anchor=.5)=>{const span=(view.end-view.start)*factor,at=view.start+(view.end-view.start)*anchor;return clamp({start:at-span*anchor,end:at+span*(1-anchor)},full);};

/** Every dated collection as a lollipop: a stem from its day on the axis up to a head showing the item or pet.
 * Scroll or pinch to zoom, drag to move; nearby collections share a head with a count until zoomed apart. */
export function CollectionLollipops({events,full,onSelect,selected}:{events:CollectionEvent[];full:Span;onSelect:(items:CollectionEvent[])=>void;selected:string|null}) {
 const host=useRef<HTMLDivElement>(null),[width,setWidth]=useState(640),[view,setView]=useState<Span>(full);
 const drag=useRef<{x:number;view:Span}|null>(null),touches=useRef(new Map<number,number>()),pinch=useRef<{distance:number;view:Span}|null>(null);
 const latest=useRef({view,full});latest.current={view,full};
 useEffect(()=>setView(full),[full]);
 useEffect(()=>{const el=host.current;if(!el)return;const observer=new ResizeObserver(()=>setWidth(Math.max(260,el.clientWidth)));observer.observe(el);return()=>observer.disconnect();},[]);
 useEffect(()=>{const el=host.current;if(!el)return;const wheel=(e:WheelEvent)=>{e.preventDefault();const rect=el.getBoundingClientRect(),anchor=Math.max(0,Math.min(1,(e.clientX-rect.left-LEFT)/(rect.width-LEFT-RIGHT)));setView(zoom(latest.current.view,latest.current.full,Math.exp(Math.max(-.5,Math.min(.5,e.deltaY*.003))),anchor));};el.addEventListener('wheel',wheel,{passive:false});return()=>el.removeEventListener('wheel',wheel);},[]);
 const x=(time:number)=>LEFT+(time-view.start)/(view.end-view.start)*(width-LEFT-RIGHT);
 const dated=useMemo(()=>events.map(e=>({...e,time:Date.parse(e.date+'T12:00:00Z')})),[events]);
 const visible=dated.filter(e=>e.time>=view.start&&e.time<=view.end);
 // Pets lead their head so the picture shows the rarest thing collected there.
 const heads=placeLollipops(visible,x).map(h=>({...h,items:[...h.items].sort((a,b)=>(a.kind==='pets'?0:1)-(b.kind==='pets'?0:1))}));
 // Calendar strip under the axis: months (days once zoomed in), with years (or month names) beneath.
 const perDay=(width-LEFT-RIGHT)/((view.end-view.start)/DAY),days=perDay>=16;
 const cells=calendarCells(view.start,view.end,days?'day':'month'),groups=calendarCells(view.start,view.end,days?'month':'year');
 const cellLabel=(c:{date:Date},w:number)=>days?String(c.date.getUTCDate()):w>=30?MONTHS[c.date.getUTCMonth()]:w>=8?MONTHS[c.date.getUTCMonth()][0]:'';
 const zoomed=view.end-view.start<full.end-full.start-1;
 const pan=(direction:number)=>{const shift=(view.end-view.start)*.25*direction;setView(clamp({start:view.start+shift,end:view.end+shift},full));};
 return <div className="lollipop-timeline">
  <div className="lollipop-tools"><span>{collectedDate(new Date(view.start).toISOString().slice(0,10))} – {collectedDate(new Date(view.end).toISOString().slice(0,10))}</span>
   <div><button className="btn ghost sm" aria-label="Zoom out" disabled={!zoomed} onClick={()=>setView(zoom(view,full,2))}><Minus size={15}/></button><button className="btn ghost sm" aria-label="Zoom in" disabled={view.end-view.start<=3*DAY} onClick={()=>setView(zoom(view,full,.5))}><Plus size={15}/></button><button className="btn ghost sm" disabled={!zoomed} onClick={()=>setView(full)}>Fit</button></div></div>
  <div ref={host} className="lollipop-stage" tabIndex={0} role="group" aria-label="Collection timeline. Drag to move, scroll or pinch to zoom, or use the arrow, plus and minus keys."
   onKeyDown={e=>{if(e.target!==e.currentTarget)return;const keys:Record<string,()=>void>={ArrowLeft:()=>pan(-1),ArrowRight:()=>pan(1),'+':()=>setView(zoom(view,full,.5)),'=':()=>setView(zoom(view,full,.5)),'-':()=>setView(zoom(view,full,2)),Home:()=>setView(full)};if(keys[e.key]){e.preventDefault();keys[e.key]();}}}
   onPointerDown={e=>{if(e.button!==0)return;e.currentTarget.setPointerCapture(e.pointerId);touches.current.set(e.pointerId,e.clientX);if(touches.current.size===2){const [a,b]=[...touches.current.values()];pinch.current={distance:Math.max(1,Math.abs(b-a)),view};drag.current=null;}else drag.current={x:e.clientX,view};}}
   onPointerMove={e=>{if(!touches.current.has(e.pointerId))return;touches.current.set(e.pointerId,e.clientX);if(touches.current.size===2&&pinch.current){const [a,b]=[...touches.current.values()];setView(zoom(pinch.current.view,full,pinch.current.distance/Math.max(1,Math.abs(b-a))));}else if(drag.current){const shift=(drag.current.x-e.clientX)/(width-LEFT-RIGHT)*(drag.current.view.end-drag.current.view.start);setView(clamp({start:drag.current.view.start+shift,end:drag.current.view.end+shift},full));}}}
   onPointerUp={e=>{touches.current.delete(e.pointerId);drag.current=null;pinch.current=null;}} onPointerCancel={()=>{touches.current.clear();drag.current=null;pinch.current=null;}}>
   <svg width="100%" height="246" viewBox={`0 0 ${width} 246`}>
    <line x1={LEFT} x2={width-RIGHT} y1={BASE} y2={BASE} className="lollipop-axis"/>
    {cells.map(c=>{const a=x(c.start),w=x(c.end)-a,label=cellLabel(c,w);return <g key={c.index}><rect x={a} y={BASE+5} width={Math.max(0,w)} height={STRIP} className={c.index%2?'calendar-cell odd':'calendar-cell'}/>{label&&<text x={a+w/2} y={BASE+5+STRIP/2+3.5} textAnchor="middle" className="calendar-label">{label}</text>}</g>;})}
    {groups.map(g=>{const a=x(g.start),w=x(g.end)-a,label=days?`${MONTHS[g.date.getUTCMonth()]} ${g.date.getUTCFullYear()}`:String(g.date.getUTCFullYear());return <g key={'g'+g.index}><line x1={a} x2={a} y1={BASE+5} y2={BASE+STRIP+24} className="calendar-divider"/>{w>=34&&<text x={a+5} y={BASE+STRIP+20} className="calendar-group">{label}</text>}</g>;})}
    {heads.map(h=>{const pet=h.items.some(e=>e.kind==='pets');return <g key={'stem'+h.items[0].id} className={`lollipop-stalk ${pet?'is-pet':''}`}><line x1={h.x} x2={h.x} y1={BASE} y2={headY(h.level)+R} className="lollipop-stem"/><circle cx={h.x} cy={BASE} r="2.5" className="lollipop-foot"/></g>;})}
    {heads.map(h=>{const top=h.items[0] as Dated,y=headY(h.level),pet=h.items.some(e=>e.kind==='pets'),on=selected===top.id;
     return <g key={top.id} className={`lollipop ${pet?'is-pet':''} ${on?'is-on':''}`} role="button" tabIndex={0} aria-label={h.items.length>1?`${h.items.length} collections from ${collectedDate(top.date)}`:`${top.name}, ${collectedDate(top.date)}`} onPointerDown={e=>e.stopPropagation()} onClick={()=>onSelect(h.items)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(h.items);}}}>
      <title>{h.items.length>1?`${h.items.length} collections`:`${top.name} · ${collectedDate(top.date)}`}</title>
      <circle cx={h.x} cy={y} r={R} className="lollipop-head"/>
      <image href={top.image} x={h.x-12} y={y-12} width="24" height="24"/>
      {h.items.length>1&&<><rect x={h.x+7} y={y-R-6} rx="7" width={h.items.length>9?24:18} height="14" className="lollipop-count"/><text x={h.x+7+(h.items.length>9?12:9)} y={y-R+4.5} textAnchor="middle" className="lollipop-count-text">{h.items.length}</text></>}
     </g>;})}
   </svg>
  </div>
 </div>;
}
