'use client';
import {useEffect, useMemo, useRef, useState} from 'react';
import {DropOddsMini} from './ProgressCharts';
import {releaseLabel} from '@/lib/release-dates';
import {ExternalLink, Pencil, Search} from 'lucide-react';
import {contributionBased} from '@/lib/drop-rates';
import {chanceAfter, chanceTone, num, pct, type DropSource} from '@/lib/ui';

/** Full drop table(s) for a source, rendered inline with local icons and odds at your KC. */
export function DropTable({sources, logItems, kc: kcProp, focus, counts, bare, edit}: {
  sources: DropSource[];
  logItems?: Map<string, number>; // lower-case name -> quantity owned
  kc?: number | null;
  focus?: string;
  counts?:Record<string,number>;
  /** Just the table and its source link, as a guide shows it: no filter bar or notes. */
  bare?: boolean;
  /** Guide editor: a pen on each row picks that drop, and the picked row's rate can be changed in place. */
  edit?: {name: string | null; rate: number; onPick: (name: string, rate: number | null) => void; onRate: (rate: number) => void};
}) {
  const graph=useRef<HTMLElement>(null);
  const [q, setQ] = useState('');
  const [selected,setSelected]=useState<{key:string;name:string;probability:number|null}|null>(null);
  useEffect(()=>{if(selected)graph.current?.scrollIntoView({block:'nearest',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});},[selected]);
  const [onlyLog, setOnlyLog] = useState(false);
  const [src, setSrc] = useState(0);
  const [collapsed,setCollapsed]=useState<Set<string>>(new Set());
  // Kill count shown against the odds: the caller's, unless several sources (then the selected source's own count).
  let kc = sources.length > 1 ? null : kcProp;
  const source = sources[Math.min(src, sources.length - 1)];
  if(source&&counts)kc=counts[source.t.toLowerCase()]??null;
  if (source && contributionBased(source.t)) kc = null;
  const query = q.trim().toLowerCase();
  const tabs = useMemo(() => (source?.tabs ?? []).map(t => ({
    ...t,
    r: t.r.filter(r => (!query || r[0].toLowerCase().includes(query)) && (!onlyLog || logItems?.has(r[0].toLowerCase()))),
  })).filter(t => t.r.length), [source, query, onlyLog, logItems]);
  if (!source) return null;
  const rows = tabs.reduce((s, t) => s + t.r.length, 0);
  return <div className="drops">
    {bare ? <p className="fine drops-source">Rates from the <a className="link" href={source.u + '#Drops'} target="_blank" rel="noreferrer">OSRS Wiki <ExternalLink size={12}/></a>. Select an item for its probability graph.</p> : <>
    <div className="drops-bar">
      {sources.length > 1 && <div className="seg">{sources.map((s, i) =>
        <button key={s.t} type="button" aria-pressed={i === src} onClick={() => {setSrc(i);setSelected(null);}}>{s.t}</button>)}</div>}
      <label className="search small"><Search size={15}/><input aria-label="Filter drops" placeholder="Filter drops…" value={q} onChange={e => setQ(e.target.value)}/></label>
      {logItems && <label className="check"><input type="checkbox" checked={onlyLog} onChange={e => setOnlyLog(e.target.checked)}/> Log items only</label>}
      <a className="link" href={source.u + '#Drops'} target="_blank" rel="noreferrer">{source.t} on the Wiki <ExternalLink size={13}/></a>
    </div>
    <p className="fine">Rates: OSRS Wiki snapshot, with approved source-backed corrections. Table-specific requirements still apply. KC odds assume every kill was eligible; combined-source KC is excluded.</p>
    {contributionBased(source.t) && <p className="fine">Nex rates are base table rates. Your contribution and MVP status change your personal chance; raw KC odds are not shown.</p>}
    {releaseLabel(source.t,'bosses')&&<p className="fine">Boss released in OSRS · {releaseLabel(source.t,'bosses')}</p>}
    <p className="fine">Select an item name to see its probability graph.</p>
    </>}
    {selected&&<section ref={graph} className="drop-selected-odds" aria-label={selected.name+' drop probability'}><div className="sec-h"><h3>{selected.name} · Chance of at least one</h3><button type="button" className="btn ghost sm" onClick={()=>setSelected(null)}>Close graph</button></div>{selected.probability?<><DropOddsMini probability={selected.probability} current={kc} unit="kills"/><p className="fine">{kc!=null?`${pct(chanceAfter(kc,selected.probability))} at ${num(kc,0)} eligible kills.`:'No matching source KC is recorded; the curve shows the reference rate only.'} Assumes each kill qualified for this table and the selected rate stayed constant.</p></>:<p className="fine">A single per-kill probability is not verified for this entry. Check its acquisition conditions.</p>}</section>}
    <div className="drops-scroll">
      <table className="droptable">
        <colgroup>
          <col className="c-ic"/><col className="c-nm"/><col className="c-qty"/><col className="c-rar"/><col className="c-odds"/>{kc!=null ? <col className="c-kc"/> : null}
        </colgroup>
        <thead><tr><th className="ic"/><th>Item</th><th>Qty</th><th>Rarity</th><th className="barcol">Odds</th>{kc!=null ? <th className="r">At {num(kc, 0)} KC</th> : null}</tr></thead>
        {tabs.map(t => <tbody key={t.h}>
          <tr className="group"><td colSpan={kc!=null ? 6 : 5}><button type="button" className="drop-group-toggle" aria-expanded={!!query || !collapsed.has(source.t+'|'+t.h)} onClick={()=>setCollapsed(old=>{const next=new Set(old),key=source.t+'|'+t.h;next.has(key)?next.delete(key):next.add(key);return next;})}><span aria-hidden="true">{!query&&collapsed.has(source.t+'|'+t.h)?'›':'⌄'}</span>{t.h}<small>{t.r.length} items</small></button></td></tr>
          {(query || !collapsed.has(source.t+'|'+t.h)) && t.r.map((r, i) => {
            const owned = logItems?.get(r[0].toLowerCase());
            const isLog = owned !== undefined;
            const chance = kc!=null && r[3] ? chanceAfter(kc, r[3]) : null;
            // log scale: 1/1 -> 100%, 1/10,000 -> ~0%
            const w = r[3] ? Math.max(3, Math.min(100, (1 + Math.log10(r[3]) / 4) * 100)) : 0;
            return <tr key={t.h + i} className={[edit?.name?.toLowerCase() === r[0].toLowerCase() ? 'is-editing' : '', isLog ? 'is-log' : '', isLog && owned ? 'is-owned' : '', (focus && r[0].toLowerCase() === focus) ? 'is-focus' : ''].join(' ')}>
              <td className="ic">{r[4] ? <img loading="lazy" decoding="async" src={`/drops/${r[4]}`} alt=""/> : null}</td>
              <td className="nm"><button type="button" className="link" aria-expanded={selected?.key===t.h+i} onClick={()=>setSelected({key:t.h+i,name:r[0],probability:contributionBased(source.t)?null:r[3]})}>{r[0]}</button>{isLog && <span className={`tag ${owned ? 'good' : 'warn'}`}>{owned ? `Logged ×${num(owned, 0)}` : 'Log slot'}</span>}{edit && <button type="button" className="drop-edit-pen" aria-label={`Use ${r[0]} and edit its rate`} aria-pressed={edit.name?.toLowerCase() === r[0].toLowerCase()} onClick={() => edit.onPick(r[0], r[3])}><Pencil size={13} aria-hidden="true"/></button>}</td>
              <td className="qty">{r[1]}</td>
              <td className="rar">{edit?.name?.toLowerCase() === r[0].toLowerCase() ? <label className="drop-edit-rate">1/<input type="number" min={1} max={1e12} step="any" aria-label={`${r[0]} rate: 1 in`} value={edit.rate} onChange={e => edit.onRate(Number(e.target.value))}/></label> : r[2]}</td>
              <td className="barcol"><i className={`rarity ${r[3] && r[3] >= 1 / 64 ? 'common' : r[3] && r[3] >= 1 / 512 ? 'uncommon' : 'rare'}`}><b style={{width: `${w}%`}}/></i></td>
              {kc!=null ? <td className={`r chance ${isLog && !owned ? chanceTone(chance) : isLog ? 'good' : 'plain'}`}>{chance === null ? '–' : pct(chance)}</td> : null}
            </tr>;
          })}
        </tbody>)}
      </table>
      {!rows && <p className="muted pad">No drops match this filter.</p>}
    </div>
  </div>;
}
