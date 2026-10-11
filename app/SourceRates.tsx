import {rateDescription} from '@/lib/rate-description';
import type {ItemRate} from '@/lib/ui';
import './drop-details.css';
export function RateText({text}:{text:string}){
 return <span className="source-rate-text">{rateDescription(text).parts.map((part,i)=>part.fraction?<strong className="source-fraction" key={i}>{part.text}</strong>:<span key={i}>{part.text}</span>)}</span>;
}
export function SourceRates({rate}:{rate:ItemRate}){
 const rows=rate.sourceDetails??rate.all?.map(([source,value])=>({source,rate:value,quantity:undefined,conditions:undefined}))??[];
 if(!rows.length)return null;
 return <details className="rate-explanation all-source-details"><summary>All sources <span>{rows.length}</span></summary><div className="source-rate-cards">{rows.map((row,i)=>{
  const {explanation}=rateDescription(row.rate);
  return <div key={i}><b className="source-card-name">{row.source}</b>{row.conditions&&<small className="source-conditions">{row.conditions}</small>}<div className="source-rate-fields"><span><small>Listed chance</small><RateText text={row.rate}/></span>{row.quantity&&<span><small>Quantity when received</small><b>{row.quantity}</b></span>}</div>{explanation?<p>{explanation}</p>:<p>Wiki conditions are preserved as listed. Different rates or extra rolls do not state the number of items received.</p>}</div>;
 })}</div></details>;
}
