import names from '@/lib/item-names.json';
import {collectionItemRates, refreshActivityRates, type CollectionReference} from '@/lib/collection-rates';
import acquisition from '@/lib/collection-acquisition.json';
import type {DropSource} from '@/lib/ui';
import snapshots from '@/lib/drop-snapshots.json';
import {parseWiki,WikiDrops} from '@/lib/wiki-drops';
import index from '@/lib/drops-index.json';
import {reviewedRates} from '@/lib/staff-data';
import {applyTableRates} from '@/lib/rate-catalogue';
import {publicMessage} from '@/lib/request-body';
type Index={pages:Record<string,DropSource[]>;items:Record<string,unknown>};
const memory=new Map<string,{at:number;data:WikiDrops}>();
const pending=new Map<string,Promise<WikiDrops>>();
async function page(title:string):Promise<WikiDrops>{
 const saved=(snapshots as Record<string,WikiDrops>)[title];if(saved)return saved;
 const cached=memory.get(title);if(cached&&Date.now()-cached.at<86400000)return cached.data;
 const existing=pending.get(title);if(existing)return existing;
 const work=(async()=>{const u='https://oldschool.runescape.wiki/api.php?'+new URLSearchParams({action:'parse',format:'json',page:title,prop:'text|revid',redirects:'1'});
 const r=await fetch(u,{headers:{'User-Agent':'Spooned/1.0 (OSRS pet tracker; cached requests)'},signal:AbortSignal.timeout(18000)});
 if(!r.ok)throw Error('The OSRS Wiki is temporarily unavailable. Use the Wiki link or retry.');
 const data=await r.json() as {parse?:{title:string;text:{'*':string};revid:number};error?:{info:string}};
 if(!data.parse)throw Error('No Wiki page was found for this item. Use the Wiki search link.');
 const result=parseWiki(data.parse.title,data.parse.text['*'],data.parse.revid);
 if(memory.size>300)memory.delete(memory.keys().next().value!);memory.set(title,{at:Date.now(),data:result});return result;})();
 pending.set(title,work);try{return await work;}finally{pending.delete(title);}
}
export async function GET(req:Request){try{
 const url=new URL(req.url);
 if(url.searchParams.has('page')){const name=url.searchParams.get('page')??'';const ids=(url.searchParams.get('items')??'').split(',').filter(Boolean).slice(0,400);const ix=index as unknown as Index;const sources=applyTableRates(refreshActivityRates(ix.pages[name]??[],names,acquisition as Record<string,CollectionReference>),await reviewedRates());const items=collectionItemRates(sources,ids,names,acquisition as Record<string,CollectionReference>);return Response.json({sources,items},{headers:{'Cache-Control':'private, max-age=60'}});}
 if(url.searchParams.has('ids')){const ids=(url.searchParams.get('ids')??'').split(',').slice(0,200);const rates=collectionItemRates([],ids,names,acquisition as Record<string,CollectionReference>);return Response.json(Object.fromEntries(Object.entries(rates).map(([id,rate])=>[id,rate.r])),{headers:{'Cache-Control':'private, max-age=86400'}});}
 const id=url.searchParams.get('id')??'',name=(names as Record<string,string>)[id];if(!name)return Response.json({error:'Unknown collection item.'},{status:400});
 const item=(acquisition as Record<string,CollectionReference>)[id] ?? await page(name),source=url.searchParams.get('source');
 if(!source)return Response.json(item,{headers:{'Cache-Control':'private, max-age=86400'}});
 const allowed=item.tables.flatMap(t=>t.rows.flatMap(r=>r.map(c=>c.url))).filter(Boolean);
 if(!allowed.includes(source))return Response.json({error:'Choose a source listed for this item.'},{status:400});
 const title=decodeURIComponent(new URL(source).pathname.slice(3)).replaceAll('_',' ');return Response.json(await page(title),{headers:{'Cache-Control':'private, max-age=86400'}});
 }catch(e){return Response.json({error:publicMessage(e,'Could not load drop sources.')},{status:502});}}
