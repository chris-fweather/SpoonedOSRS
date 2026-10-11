import {ExternalLink} from 'lucide-react';
import type {LogItem,LogPage,Journal} from '@/lib/model';
import {wiki,wikiSearch,type PageDrops} from '@/lib/ui';
import {DropTable} from './DropTable';
import {RateText} from './SourceRates';
/** Missing full activity tables still expose the exact-item acquisition references we have. */
export function ActivityDrops({page,drops,kc,focus,onOpen,journal}:{journal?:Journal;page:LogPage;drops:PageDrops|null;kc?:number|null;focus?:string;onOpen?:(item:LogItem)=>void}){
 if(!drops)return <p className="muted pad" role="status">Loading drop tables and item sources…</p>;
 if(drops.sources.length)return <DropTable counts={journal?Object.fromEntries(journal.hiscores.activities.filter(a=>a.score>=0).map(a=>[a.name.toLowerCase(),a.score])):undefined} sources={drops.sources} kc={kc} focus={focus} logItems={new Map(page.items.map(i=>[i.name.toLowerCase(),i.quantity]))}/>;
 return <div className="activity-source-fallback"><div className="activity-source-heading"><h3>Collection-item sources</h3><a className="link" href={wikiSearch(page.name)} target="_blank" rel="noreferrer">{page.name} on the Wiki <ExternalLink size={13}/></a></div><p className="fine">{drops.error?'Drop sources are temporarily unavailable. Collection items are listed below; use their Wiki links for acquisition details.':'The full activity drop table is not catalogued here. These are the available collection-item references, including rewards and purchases; their listed chances are not automatically per kill or completion.'}</p><div className="activity-source-items">{page.items.map(item=>{
 const rate=drops.items[String(item.id)];
 return <div key={item.id} className={'activity-source-item'+(focus===item.name.toLowerCase()?' is-focus':'')}><img src={`/items/${item.id}.png`} alt="" loading="lazy"/>{onOpen?<button type="button" className="link" onClick={()=>onOpen(item)}>{item.name}</button>:<a href={rate?.url??wiki(item.name)} target="_blank" rel="noreferrer">{item.name} <ExternalLink size={11}/></a>}<RateText text={rate?.r??'Rate not verified'}/><small>{rate?.s??(rate?.acquisition?.length?'See acquisition conditions':'See Wiki for acquisition')}</small></div>;
 })}</div></div>;
}
