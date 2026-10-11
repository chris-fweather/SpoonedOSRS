import {ArrowLeft,ArrowRight} from 'lucide-react';
export function Pagination({page,pages,onPage,label='Results'}:{page:number;pages:number;onPage:(page:number)=>void;label?:string}) {
 const total=Math.max(1,pages),current=Math.max(0,Math.min(page,total-1));
 return <nav className="slim-pagination" aria-label={`${label} pages`}><span aria-live="polite">Page {current+1} of {total}</span><div><button type="button" disabled={current===0} onClick={()=>onPage(current-1)} aria-label={`Previous ${label.toLowerCase()} page`} title="Previous page"><ArrowLeft size={25} strokeWidth={1.25}/></button><button type="button" disabled={current>=total-1} onClick={()=>onPage(current+1)} aria-label={`Next ${label.toLowerCase()} page`} title="Next page"><ArrowRight size={25} strokeWidth={1.25}/></button></div></nav>;
}
