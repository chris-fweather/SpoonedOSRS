import "./journal-loading.css";
const tabs = [['Overview','stats-icon'],['Pets','pet'],['Collection log','collection-log-icon'],['Quests','quest-point-icon'],['Diaries','achievement-diaries-icon'],['Combat','combat-achievements-icon']];
const progress = [['Pets','pet'],['Collection log','collection-log-icon'],['Quest points','quest-point-icon'],['Diary tasks','achievement-diaries-icon'],['Combat achievements','combat-achievements-icon']];
const icon = (name:string) => name==='pet'?'/brand/rocky-mascot.webp':`/icons/navigation/${name}.png`;
const blanks = (count:number, className:string) => Array.from({length:count}, (_, i) => <span key={i} className={className}/>);
/** Uses the loaded profile's own frame, column, tab and overview classes, so every panel opens where it will finish. */
export function JournalLoading({username, failed}: {username: string; failed: boolean}) {
  return <main className="journal-loading" aria-busy={!failed}>
    <p className="sr-only" role="status">{failed ? "Journal unavailable" : `Opening ${username}’s journal`}</p>
    {failed ? <section className="osrs-panel journal-failed"><h2>Journal unavailable</h2><p>Use Retry above to try again.</p></section> :
    <div className="frame has-pop profile-banner-layout journal-skeleton" aria-hidden="true">
      <aside className="col-left">
        <div className="osrs-panel char-card"><div className="char-name"><b>{username}</b></div><div className="char-stage skeleton-stage"><span className="loading-spinner"/></div><div className="char-meta"><span><small>Combat</small><b>—</b></span><span><small>Total</small><b>—</b></span></div></div>
        <div className="osrs-panel skills-tab"><div className="skill-grid">{blanks(24, 'sk skeleton-block')}</div><div className="skill-foot"><span>Total XP: <b>—</b></span></div></div>
        <section className="osrs-panel activity-ranks activity-ranks-unknown"><div className="activity-rank-heading"><b>Boss ranks</b></div><div className="activity-rank-grid">{blanks(64, 'activity-rank-icon skeleton-dot')}</div></section>
      </aside>
      <section className="window osrs-panel">
        <nav className="wtabs">{tabs.map(([t,image], i) => <button key={t} type="button" tabIndex={-1} aria-selected={i===0}><img src={icon(image)} alt=""/><span>{t}</span></button>)}</nav>
        <div className="wbody overview-body"><div className="ov">
          <div className="ov-top">
            <div className="ov-prog">{progress.map(([label,image]) => <div key={label} className="prog-row"><img src={icon(image)} alt=""/><span className="prog-label">{label}</span><span className="meter unknown"><b/></span><span className="prog-val is-unknown">—</span></div>)}</div>
            <div className="ov-kpis">{["Pets left","Mean hunt budget","Estimated effort"].map(t => <div key={t}><span>{t}</span><b>—</b><small className="skeleton-line"/></div>)}</div>
          </div>
          <div className="ov-pets pets-unknown"><div className="sec-h"><h3>Pets collected</h3></div><div className="petlog-grid">{blanks(71, 'skeleton-dot')}</div></div>
        </div></div>
      </section>
      <aside className="pop osrs-panel pop-placeholder"/>
    </div>}
  </main>;
}
