import {highestListedRate} from './rate-summary';
import type {DropSource, ItemRate} from './ui';
import {activityItemRates, contributionBased} from './drop-rates';
import {rollProbability, type WikiDrops} from './wiki-drops';

export type CollectionReference = WikiDrops & {acquisition?: string[]};
const key = (s:string) => s.toLowerCase().replaceAll('_',' ').replaceAll('’', "'").trim();
// These encounters use contribution, points, hidden progress, or reward rolls.
const variableCount = /nex|chambers of xeric|tombs of amascut|theatre of blood|barrows|tempoross|wintertodt|guardians of the rift|vardorvis|duke sucellus|leviathan|whisperer|nightmare|gauntlet/i;

/** Exact-ID Wiki references fill acquisition gaps without treating every rarity as per-kill odds. */
export function collectionItemRates(sources:DropSource[], ids:string[], names:Record<string,string>, references:Record<string,CollectionReference>):Record<string,ItemRate> {
  const activity = activityItemRates(sources, ids, names);
  return Object.fromEntries(ids.filter(id => !!names[id]).map(id => {
    const doc = references[id], base = activity[id];
    if (!doc) return [id, {...base, r:base?.r ?? 'Rate not verified', status:'unresolved'}];
    const rows = doc.tables.flatMap(table => {
      const source = table.headers.findIndex(h=>h === 'Source');
      const rarity = table.headers.findIndex(h=>/^(Rarity|Chance|Drop rate)$/i.test(h));
      if (source < 0 || rarity < 0) {
        // Method/base-chance tables belong to skill pets. Do not confuse the
        // contents of a reward container (Item tables) with obtaining it.
        const chances=table.headers.flatMap((h,i)=>/chance|^rate$|^rarity$/i.test(h)?[i]:[]);
        if(!chances.length || table.headers.includes('Item') || !table.headers[0])return [];
        return table.rows.map(r=>({source:table.headers.flatMap((h,i)=>!chances.includes(i)&&r[i]?.text?[`${h}: ${r[i].text}`]:[]).join(' · '),rarity:chances.map(i=>`${table.headers[i]}: ${r[i]?.text??'Unknown'}`).join(' · '),quantity:undefined as string|undefined,context:'Method and level dependent'}));
      }
      return table.rows.filter(r=>r[source]?.text && r[rarity]?.text).map(r=>({
        source:r[source].text, rarity:r[rarity].text,quantity:r[table.headers.findIndex(h=>/^quantity$/i.test(h))]?.text,
        context:table.headers.flatMap((h,i)=>i!==source && i!==rarity && !/quantity/i.test(h) && r[i]?.text ? [`${h}: ${r[i].text}`] : []).join(' · '),
      }));
    });
    const local = rows.filter(r=>sources.some(s=>key(s.t)===key(r.source)));
    const chosen = local.length ? local : rows;
    const rarities = [...new Set(chosen.map(r=>r.rarity))];
    const numerical = chosen.some(r=>rollProbability(r.rarity)!==null);
    const text = (doc.acquisition?.join(' ') || doc.intro);
    const status = chosen.length ? numerical ? 'numeric' : 'variable' : /purchas|bought|exchange|awarded|reward|obtain|unlock|cost|receiv/i.test(text) ? 'acquisition' : 'unresolved';
    // Use a fresh rate for a single source only when the activity table confirms
    // that the item's drop is on that source's ordinary per-kill table.
    const source = chosen.length===1 ? chosen[0].source : undefined;
    const flat = !!source && !!base?.p && !contributionBased(source) && !variableCount.test(source)
      && key(base.s ?? '')===key(source) && (!chosen[0].context || /^Level: [\d, -]+$/.test(chosen[0].context));
    const p = flat ? base.p ?? null : null;
    const all:[string,string][] = chosen.map(r=>[r.source+(r.context ? ' · '+r.context : ''),flat ? base.r ?? r.rarity : r.rarity]);
    return [id, {
      r: flat ? base.r : chosen.length ? highestListedRate(rarities) : base?.r ?? (status==='acquisition' ? 'See acquisition' : 'Rate not verified'),
      p, kcSource:p ? source : undefined,
      s:[...new Set(chosen.map(r=>r.source))].join(' / ') || base?.s,
      all:all.length ? all : base?.all,
      sourceDetails:chosen.length?chosen.map(r=>({source:r.source,rate:flat?base.r??r.rarity:r.rarity,quantity:r.quantity,conditions:r.context||undefined})):base?.all?.map(([source,rate])=>({source,rate})),
      status, url:doc.url, revision:doc.revision, checkedAt:doc.fetchedAt,
      acquisition:doc.acquisition?.length ? doc.acquisition : doc.intro ? [doc.intro] : [],
      note:chosen.length && !p ? 'Rates apply to the listed source and conditions. Activity KC is not used as a reward-roll count.' : undefined,
    } satisfies ItemRate];
  }));
}

/** Reconcile existing activity rows with the latest exact-ID item source table. */
export function refreshActivityRates(sources:DropSource[], names:Record<string,string>, references:Record<string,CollectionReference>):DropSource[] {
  const byName = new Map<string,CollectionReference[]>();
  for (const [id,name] of Object.entries(names)) {
    const doc=references[id]; if(!doc)continue;
    const list=byName.get(key(name))??[]; if(!list.some(d=>d.url===doc.url))list.push(doc); byName.set(key(name),list);
  }
  return sources.map(source=>({...source,tabs:source.tabs.map(table=>({...table,r:table.r.map(row=>{
    // Different table variants must retain their own conditions, rather than
    // replacing every encounter variant with an item-page summary.
    if(source.tabs.flatMap(t=>t.r).filter(r=>key(r[0])===key(row[0])).length!==1)return row;
    const docs=byName.get(key(row[0]))??[];
    if(docs.length!==1)return row;
    const matches=docs[0].tables.flatMap(t=>{
      const si=t.headers.indexOf('Source'),ri=t.headers.indexOf('Rarity');
      return si<0||ri<0?[]:t.rows.filter(r=>key(r[si]?.text??'')===key(source.t)).map(r=>r[ri]?.text).filter(Boolean);
    });
    if(matches.length!==1)return row;
    return [row[0],row[1],matches[0],rollProbability(matches[0]),row[4]];
  })}))}));
}
