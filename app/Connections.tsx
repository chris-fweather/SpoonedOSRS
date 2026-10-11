'use client';
import {useRef, type SyntheticEvent} from 'react';
import './connections-sections.css';
import {RefreshCw, ExternalLink, Check, Download, Upload, Shield, BookOpen} from 'lucide-react';
import type {SyncedJournal} from '@/lib/sync-journal';
import './profile-release.css';
import {num} from '@/lib/ui';

function date(s: string | null) {
  if (!s) return 'Never';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return 'Never';
  const pad = (n: number) => String(n).padStart(2, '0');
  const hour = d.getHours();
  const h12 = hour % 12 || 12;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${pad(h12)}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${hour < 12 ? 'am' : 'pm'}`;
}

function revealSection(event:SyntheticEvent<HTMLDetailsElement>){
  const section=event.currentTarget;
  if(!section.open)return;
  requestAnimationFrame(()=>{
    if(!section.isConnected||!section.open)return;
    const panel=section.closest<HTMLElement>('.wbody');
    const behavior=window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth';
    if(panel&&['auto','scroll'].includes(getComputedStyle(panel).overflowY)){
      panel.scrollTo({top:panel.scrollTop+section.getBoundingClientRect().top-panel.getBoundingClientRect().top-10,behavior});
    }else section.scrollIntoView({block:'nearest',behavior});
  });
}

export function Connections({journal: j, busy, ready, onSync, onImport, onError}: {
  journal: SyncedJournal; busy: boolean; ready: boolean; onSync: (source: string) => void; onImport: (data: unknown) => void; onError: (m: string) => void;
}) {
  const guideMounted=useRef(false);
  const file = useRef<HTMLInputElement>(null);
  return <div className="connections-content">
    <section className="panel sync-summary"><div><h2>Refresh your journal</h2><p>Update your public stats and collection. Saved entries are kept when a source is unavailable.</p></div><button className="btn primary" disabled={busy||!ready} onClick={()=>onSync('all')}><RefreshCw size={15} className={busy?'spin':''}/> Refresh all sources</button></section>
    {j.syncReport && <div className="sync-results" aria-live="polite">{j.syncReport.map(r=><div key={r.source} className={r.status==='updated'?'sync-updated':'sync-unavailable'}><b>{{hiscores:'OSRS Hiscores',runeprofile:'RuneProfile',temple:'TempleOSRS',wom:'Wise Old Man'}[r.source]}</b><span>{r.message}</span></div>)}</div>}
    <section className="conn-grid">
      <div className="panel conn">
        <div className="conn-h"><span className="gi"><Shield size={20}/></span><div><h2>OSRS Hiscores</h2><small className="muted">Levels, XP and boss kill counts</small></div><span className={`tag ${j.statsSyncedAt?'good':'warn'}`}>{j.statsSyncedAt?<><Check size={12}/> Synced</>:'Not synced'}</span></div>
        <div className="conn-stats"><div><b>{j.statsSyncedAt?j.hiscores.skills.filter(s => s.name !== 'Overall').length:'—'}</b><small>skills</small></div><div><b>{j.statsSyncedAt?j.hiscores.activities.filter(a => a.score > 0).length:'—'}</b><small>activities with KC</small></div><div><b className="sm">{date(j.statsSyncedAt)}</b><small>last sync</small></div></div>
        <button className="btn primary" disabled={busy || !ready} onClick={() => onSync('hiscores')}><RefreshCw size={16} className={busy ? 'spin' : ''}/> Sync hiscores</button>
      </div>
      <div className="panel conn">
        <div className="conn-h"><span className="gi"><BookOpen size={20}/></span><div><h2>RuneProfile</h2><small className="muted">Collection log, quests and diaries from RuneLite</small></div><span className={`tag ${j.log ? 'good' : 'warn'}`}>{j.log ? <><Check size={12}/> Imported</> : 'Not set up'}</span></div>
        <div className="conn-stats"><div><b>{j.log ? num(j.log.obtained, 0) : '—'}</b><small>items logged</small></div><div><b>{j.log ? num(j.log.total, 0) : '—'}</b><small>log slots</small></div><div><b className="sm">{date(j.logSyncedAt)}</b><small>last import</small></div></div>
        <button className="btn primary" disabled={busy || !ready} onClick={() => onSync('runeprofile')}><RefreshCw size={16} className={busy ? 'spin' : ''}/> Import from RuneProfile</button>
      </div>

      <div className="panel conn"><div className="ph"><h2>TempleOSRS</h2></div><p>Import your shared collection log. Existing unlocks are kept.</p><button className="btn" disabled={busy||!ready} onClick={()=>onSync('temple')}>Import Temple collection log</button></div>
      <div className="panel conn"><div className="ph"><h2>Wise Old Man</h2></div><p>Import tracked skills and boss KC. Newer saved stats are kept.</p><button className="btn" disabled={busy||!ready} onClick={()=>onSync('wom')}>Import Wise Old Man stats</button></div>
    </section>
    <div className="connections-bottom-sections">
    <details className="panel connection-guide" open onToggle={e=>{if(!guideMounted.current){guideMounted.current=true;return;}revealSection(e);}}><summary>Syncing from RuneLite</summary>
      <div className="ph">
        <div className="row gap">
          <a className="btn ghost sm" href="https://runeprofile.com/info/guide" target="_blank" rel="noreferrer">RuneProfile guide <ExternalLink size={13}/></a>
          <a className="btn ghost sm" href={'https://runeprofile.com/' + encodeURIComponent(j.username)} target="_blank" rel="noreferrer">Your RuneProfile <ExternalLink size={13}/></a>
        </div>
      </div>
      <ol className="steps">
        <li><b>1</b><span>Install <em>RuneProfile</em> from the RuneLite Plugin Hub.</span></li>
        <li><b>2</b><span>Log into <em>{j.username}</em> and open the in-game Collection Log.</span></li>
        <li><b>3</b><span>Press the RuneProfile sync button in the top-left of the log.</span></li>
        <li><b>4</b><span>Come back here and press <em>Import from RuneProfile</em>.</span></li>
      </ol>
      <p className="muted">RuneProfile syncs your collection, quests and diary totals.</p>
    </details>

    <details className="panel connection-guide connection-data" onToggle={revealSection}><summary>Your data</summary>
      <div className="ph">
        <div className="row gap">
          <button className="btn ghost sm" disabled={!ready || busy} onClick={() => file.current?.click()}><Upload size={15}/> Import log JSON</button>
          <button className="btn ghost sm" onClick={() => {const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(j, null, 2)], {type: 'application/json'})); a.download = j.username + '-pet-journal.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);}}><Download size={15}/> Export backup</button>
        </div>
      </div>
      <p className="muted">Temple uses the Collection Log plugin; Wise Old Man tracks Hiscores. Individual unfinished diary tasks are unavailable. No Spooned plugin is required. Import RuneProfile or Temple collection-log JSON, or a Wise Old Man player export. A pet you&apos;ve marked collected is never unticked. No RuneScape password is needed for anything here.</p>
      <input ref={file} type="file" accept=".json,application/json" hidden onChange={async e => {const f = e.target.files?.[0]; if (!f) return; try {if (f.size > 2000000) throw Error('Maximum file size is 2 MB.'); onImport(JSON.parse(await f.text()));} catch (err) {onError((err as Error).message);} e.target.value = '';}}/>
      <div className="sources">
        <a href="/DATA-SOURCES.txt" target="_blank">Drop data sources</a>
        <a href="/ASSET-SOURCES.txt" target="_blank">Artwork sources</a>
        <a href="https://oldschool.runescape.wiki" target="_blank" rel="noreferrer">OSRS Wiki (CC BY-NC-SA 3.0)</a>
        <span>Game artwork © Jagex</span>
      </div>
    </details>
    </div>
  </div>;
}
