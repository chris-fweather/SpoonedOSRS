export type TimelineRange='all'|'year'|'month';
export type CalendarUnit='day'|'month'|'year';
export type CalendarCell={start:number;end:number;index:number;date:Date};

const DAY=86_400_000;
export const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const floor=(time:number,unit:CalendarUnit)=>{const d=new Date(time);return unit==='day'?Math.floor(time/DAY)*DAY:Date.UTC(d.getUTCFullYear(),unit==='month'?d.getUTCMonth():0,1);};
const next=(time:number,unit:CalendarUnit)=>{const d=new Date(time);return unit==='day'?time+DAY:Date.UTC(d.getUTCFullYear()+(unit==='year'?1:0),d.getUTCMonth()+(unit==='month'?1:0),1);};

/** The span the timeline opens on: from the first dated collection to today for all time, otherwise the past year or 30 days. */
export function timelineSpan(times:number[],range:TimelineRange,now=Date.now()):{start:number;end:number}{
 const end=floor(now,'day')+DAY;
 if(range==='month')return {start:end-30*DAY,end};
 if(range==='year')return {start:end-365*DAY,end};
 const first=times.length?Math.min(...times):end-30*DAY;
 return {start:Math.min(first-10*DAY,end-30*DAY),end};
}

/** Day, month or year cells covering [start, end], clipped to it. `index` counts from the epoch, so alternate
 * shading stays put while the view pans. */
export function calendarCells(start:number,end:number,unit:CalendarUnit):CalendarCell[]{
 const cells:CalendarCell[]=[];
 for(let t=floor(start,unit);t<end;t=next(t,unit)){
  const date=new Date(t),index=unit==='day'?Math.round(t/DAY):unit==='month'?date.getUTCFullYear()*12+date.getUTCMonth():date.getUTCFullYear();
  cells.push({start:Math.max(t,start),end:Math.min(next(t,unit),end),index,date});
 }
 return cells;
}

export type Lollipop<T>={x:number;level:number;items:T[]};
/** Lollipop placement: each head sits above its exact date on the lowest level with room for it. When every level
 * is taken, the collection joins the nearest head, which then shows a count. */
export function placeLollipops<T extends {time:number}>(items:T[],x:(time:number)=>number,spacing=34,levels=4):Lollipop<T>[]{
 const ends=Array<number>(levels).fill(-Infinity),out:Lollipop<T>[]=[];
 for(const item of items){
  const px=x(item.time),level=ends.findIndex(end=>px-end>=spacing);
  if(level>=0){ends[level]=px;out.push({x:px,level,items:[item]});continue;}
  let near=out[out.length-1];
  for(let i=out.length-2;i>=0&&out[i].x>px-spacing*2;i--)if(Math.abs(out[i].x-px)<Math.abs(near.x-px))near=out[i];
  near.items.push(item);
 }
 return out;
}
