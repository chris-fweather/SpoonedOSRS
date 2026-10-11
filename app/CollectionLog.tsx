'use client';
import {useEffect, useMemo, useState} from 'react';
import {ExternalLink, ArrowLeft} from 'lucide-react';
import type {CollectionLog as Log, Journal, LogItem, LogPage} from '@/lib/model';
import {pageIcon} from '@/lib/artwork';
import {ProfileEmpty} from './ProfileEmpty';
import {ActivityDrops} from './ActivityDrops';
import {collectionDate} from '@/lib/collection-history';
import {collectedDate} from '@/lib/pet-presentation';
import {releaseLabel} from '@/lib/release-dates';
import {SourceRates} from './SourceRates';
import {DropOddsMini} from './ProgressCharts';
import {ChipRow, FilterBar, IconBox, SearchBox, SortMenu} from './Controls';
import {ProgressHeader} from './ProgressHeader';
import {TileProgress} from './TileProgress';
import {Meter, Count} from './Meter';
import {PopHead, Stats, type PopApi} from './Pop';
import './collection-date-editor.css';
import {chanceAfter, chanceTone, loadPageDrops, num, pageKc, pct, wiki, wikiSearch, type PageDrops} from '@/lib/ui';

export function CollectionLog({journal, log, onConnect, pop, canEdit=false, busy=false, onSaveDate}: {journal: Journal; log: Log | null; onConnect: () => void; pop: PopApi; canEdit?:boolean; busy?:boolean; onSaveDate?:(itemId:number,date:string)=>Promise<boolean>}) {
  const [tab, setTab] = useState(log?.tabs[0]?.name ?? 'Bosses');
  const [selected, setSelected] = useState('');
  const [sort, setSort] = useState('name');
  const [query, setQuery] = useState('');
  const [sub, setSub] = useState<'items' | 'drops'>('items');
  const [focus, setFocus] = useState('');
  const [drops, setDrops] = useState<PageDrops | null>(null);

  const q = query.trim().toLowerCase();
  const pages = useMemo(() => {
    const list = q ? log?.tabs.flatMap(t => t.pages) : (log?.tabs.find(t => t.name === tab) ?? log?.tabs[0])?.pages;
    return (list ?? []).filter(p => !q || p.name.toLowerCase().includes(q) || p.items.some(i => i.name.toLowerCase().includes(q)))
      .sort((a, b) => sort === 'progress' ? (b.total ? b.obtained / b.total : 0) - (a.total ? a.obtained / a.total : 0) || a.name.localeCompare(b.name) : a.name.localeCompare(b.name));
  }, [log, tab, q, sort]);
  const page = pages.find(p => p.name === selected);

  useEffect(() => {
    setDrops(null); setFocus('');
    if (!page) return;
    let live = true;
    loadPageDrops(page.name, page.items.map(i => i.id)).then(d => { if (live) setDrops(d); }).catch(() => { if (live) setDrops({sources:[],items:{},error:'Drop sources are temporarily unavailable.'}); });
    return () => { live = false; };
  }, [page?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!log || !log.tabs.length) return <ProfileEmpty section="Collection log" icon="/icons/navigation/collection-log-icon.png" canEdit={canEdit} busy={busy} onSync={onConnect}/>;

  const kc = page ? pageKc(journal, page.name) : null;
  const openItem = (i: LogItem) => {
    if (!page) return;
    const pg = page;
    pop.show(`item:${pg.name}:${i.id}`, <ItemDetail key={`${pg.name}:${i.id}`} journal={journal} page={pg} item={i} onSaveDate={canEdit?onSaveDate:undefined} onDrops={() => { setFocus(i.name.toLowerCase()); setSub('drops'); }}/>);
  };

  return <div className={`clog3 ${page ? 'is-open' : ''}`}>
    <ProgressHeader icon="/icons/navigation/collection-log-icon.png" kicker="Collection log" done={log.obtained} total={log.total}/>
    <FilterBar>
      <SearchBox label="Search collection log" placeholder="Search…" value={query} onChange={value => { setQuery(value); setSelected(''); }}/>
      <SortMenu label="Sort pages" value={sort} onChange={setSort} options={[{value: 'name', label: 'Name A–Z'}, {value: 'progress', label: 'Most complete'}]}/>
    </FilterBar>
    <ChipRow label="Collection log categories" chips={log.tabs.map(t => {
      const qty = new Map<number, number>();
      for (const p of t.pages) for (const i of p.items) qty.set(i.id, Math.max(qty.get(i.id) ?? 0, i.quantity));
      let got = 0; for (const n of qty.values()) if (n > 0) got++;
      return {id: t.name, label: t.name, count: `${got}/${qty.size}`, pressed: tab === t.name && !q, onClick: () => { setTab(t.name); setSelected(''); setQuery(''); }};
    })}/>

    <div className={`cl-body ${page ? 'has-page' : ''}`}>
      <div className={`cl-pages activity-grid ${page?'activity-hidden':''}`}>{pages.map(p => <button className="cl-activity" key={p.name} type="button" aria-pressed={page?.name === p.name} onClick={() => { pop.close(); setSelected(p.name); setSub('items'); }}>
        <IconBox src={pageIcon(p.name)} alt=""/>
        <b>{p.name}</b>
        <TileProgress done={p.obtained} total={p.total} unit="items"/>
      </button>)}
        {!pages.length && <p className="muted pad">No pages match.</p>}
      </div>

      {page ? <div className="cl-page">
        <div className="cl-page-h">
          <button type="button" className="btn ghost sm" onClick={() => {setSelected('');pop.close();}} aria-label="Back to activities"><ArrowLeft size={15}/> Activities</button>
          <div>
            <h3>{page.name}</h3>
            <div className="cl-sub">
              <span>Obtained: <Count done={page.obtained} total={page.total}/></span>
              {kc !== null && <span>Kills: <em>{num(kc, 0)}</em></span>}
            </div>
          </div>
          <Meter done={page.obtained} total={page.total} className="cl-meter"/>
          <div className="seg">
            <button type="button" aria-pressed={sub === 'items'} onClick={() => setSub('items')}>Items</button>
            <button type="button" aria-pressed={sub === 'drops'} onClick={() => setSub('drops')}>Drop table</button>
          </div>
          <a className="icon-btn" aria-label={`${page.name} on the OSRS Wiki`} href={wikiSearch(page.name)} target="_blank" rel="noreferrer"><ExternalLink size={16}/></a>
        </div>

        {sub === 'items' ? <div className="cl-items">{page.items.map(i => {
          const r = drops?.items[String(i.id)];
          const on = pop.key === `item:${page.name}:${i.id}`;
          return <button type="button" key={i.id} className={`cl-item ${i.quantity ? 'got' : ''} ${on ? 'sel' : ''}`} onClick={() => on ? pop.close() : openItem(i)} title={`${i.name}${collectionDate(journal,i.id)?' · Collected '+collectedDate(collectionDate(journal,i.id)):''}${r?.r ? ` · ${r.r}` : ''}`}>
            {i.quantity > 0 && <em>{num(i.quantity, 0)}</em>}
            <IconBox src={`/items/${i.id}.png`} alt={i.name}/>
            <small>{r?.r ?? (drops ? 'Rate not verified' : '…')}</small>
          </button>;
        })}</div> : <div className="cl-drops"><ActivityDrops journal={journal} page={page} drops={drops} kc={kc} focus={focus || undefined} onOpen={openItem}/></div>}
      </div> : null}
    </div>
  </div>;
}

function ItemDetail({journal, page, item, onDrops, onSaveDate}: {journal: Journal; page: LogPage; item: LogItem; onDrops: () => void; onSaveDate?:(itemId:number,date:string)=>Promise<boolean>}) {
  const [drops, setDrops] = useState<PageDrops | null>(null);
  useEffect(() => {
    let live = true;
    loadPageDrops(page.name, page.items.map(i => i.id)).then(d => { if (live) setDrops(d); }).catch(() => {if(live)setDrops({sources:[],items:{},error:'Drop sources are temporarily unavailable.'});});
    return () => { live = false; };
  }, [page]);
  const [date,setDate]=useState(collectionDate(journal,item.id));
  const [savedDate,setSavedDate]=useState(collectionDate(journal,item.id));
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState('');
  const rate = drops?.items[String(item.id)];
  const sourceCount = journal.hiscores.activities.find(a=>a.name.toLowerCase()===rate?.kcSource?.toLowerCase())?.score;
  const kc = rate?.kcSource ? sourceCount != null && sourceCount >= 0 ? sourceCount : null : pageKc(journal, page.name);
  const chance = kc != null && rate?.p ? chanceAfter(kc, rate.p) : null;
  return <>
    <PopHead img={`/items/${item.id}.png`} wide kicker={page.name} title={item.name}
      sub={<span className={item.quantity ? 'good' : 'muted'}>{item.quantity ? `Obtained ×${num(item.quantity, 0)}${savedDate?' · '+collectedDate(savedDate):''}` : 'Not obtained yet'}</span>}/>
    {onSaveDate&&item.quantity>0&&<form className="collection-date-editor" onSubmit={async e=>{e.preventDefault();setSaving(true);setMessage('');try{if(await onSaveDate(item.id,date)){setSavedDate(date);setMessage('Collection date saved.');}else setMessage('Could not save. Check the message on your profile.');}finally{setSaving(false);}}}><label>Date collected<input type="date" value={date} min="2013-02-22" max={new Date().toISOString().slice(0,10)} onChange={e=>setDate(e.target.value)} disabled={saving}/></label><button className="btn sm" disabled={saving}>{saving?'Saving…':'Save date'}</button><small>Leave blank if unknown. This date is kept when you sync.</small>{message&&<small role="status">{message}</small>}</form>}
    <Stats rows={[
      [rate?.all && (rate.all.length>1||rate.all.some(a=>a[1].includes(';'))) ? 'Highest listed chance' : 'Drop rate', rate?.r ?? (drops ? 'Rate not verified' : '…'), 'y'],
      ['Source', rate?.s ?? page.name],
      ...(releaseLabel(item.name,'pets')?[["Pet released",releaseLabel(item.name,'pets')!] as [string,string]]:releaseLabel(rate?.kcSource??page.name,'bosses')?[["Boss released in OSRS",releaseLabel(rate?.kcSource??page.name,'bosses')!] as [string,string]]:[]),
      ...(kc !== null ? [[rate?.kcSource ? 'Your '+rate.kcSource+' KC' : 'Activity KC', num(kc, 0)] as [string, string]] : []),
      ...(chance !== null ? [[item.quantity ? 'Odds of 1+ by now' : 'Chance by now', pct(chance), item.quantity ? 'good' : chanceTone(chance)] as [string, string, string]] : []),
    ]}/>
    {chance !== null && !item.quantity && <div className="pop-block"><Meter done={chance} total={1}/><small className="muted">{pct(chance)} of players would have it at {num(kc!, 0)} KC</small></div>}
    {rate?.p ? <><h3>Chance of at least one</h3><DropOddsMini probability={rate.p} current={kc} unit="kills"/></> : drops&&<p className="fine">A single per-kill rate is not verified for this item, so a KC probability graph is unavailable. See All sources for the different methods.</p>}
    {rate?.note && <p className="fine">{rate.note}</p>}
    {rate&&<SourceRates key={item.id} rate={rate}/>}
    {!!rate?.acquisition?.length && <details key={`acquisition:${item.id}`} className="rate-explanation acquisition-conditions"><summary>Acquisition &amp; conditions</summary>{rate.acquisition.map((text,i)=><p key={i}>{text}</p>)}</details>}

    {rate?.revision && <p className="fine"><a href={rate.url+'?oldid='+rate.revision} target="_blank" rel="noreferrer">Wiki source · revision {rate.revision}</a>{rate.checkedAt ? ' · Checked '+new Date(rate.checkedAt).toLocaleDateString() : ''}</p>}
    <div className="pop-links">
      <button type="button" className="btn ghost sm" onClick={onDrops}>Show in drop table</button>
      <a className="btn ghost sm" href={rate?.url ?? wiki(item.name)} target="_blank" rel="noreferrer">Wiki <ExternalLink size={13}/></a>
    </div>
  </>;
}
