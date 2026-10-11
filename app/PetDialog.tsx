'use client';
import {receivedMethod} from '@/lib/hunt-history';
import {farmingRoute,farmingTiming} from '@/lib/farming-timing';
import {FarmingTiming} from './FarmingTiming';
import {HuntHistory,EffortBasis} from './HuntHistory';
import {useEffect, useMemo, useRef, useState} from 'react';
import {X, Plus, ExternalLink, Dices, Swords, MapPin, BookOpen, Check} from 'lucide-react';
import {petUnitLabel,acquisitionUnit,acquisitionUnits,xpAtLevel} from '@/lib/pet-record';
import {selectedMethod, lifetimeSkill, petSkill, oddsMethod, usesAcquisition, mixedFarmingMethod} from '@/lib/estimates';
import {type Journal, type Pet, type Method, expectedHours, budgetHours, hoursSpent, likelihood, estimateReviewed} from '@/lib/model';
import {IllustratedSelect} from './IllustratedSelect';
import {PetOdds} from './ProgressCharts';
import {ActivityDrops} from './ActivityDrops';
import {bossArtwork} from '@/lib/artwork';
import {atLevel, wikiMethod} from '@/lib/pet-rates';
import {chanceTone, logPageForPet, loadPageDrops, num, pct, wiki, wikiSearch, type PageDrops} from '@/lib/ui';
import {DriestRecord} from './DriestRecord';
import {RateBasis} from './PetPanel';

const UNITS = ['rewards', 'rolls', 'actions', 'logs', 'catches', 'uniques', 'kills', 'runs', 'crates', 'pickpockets', 'thefts', 'games', 'raids', 'XP', 'eligible rolls', 'attempts', 'master clues', 'harvests', 'rumours', 'plants', 'activities'];
const TABS = ['Drops & odds', 'Guides', 'Progress & notes'] as const;

export function PetDialog({journal, pet, setPet, busy, error, canEdit=false, editProgress=false, moderation=false, onSave}: {
  canEdit?:boolean; editProgress?:boolean; moderation?:boolean; journal: Journal; pet: Pet | null; setPet: (p: Pet | null) => void; busy: boolean; error: string; onSave: () => Promise<void>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>('Drops & odds');
  const [index, setIndex] = useState(0);
  const [drops,setDrops]=useState<PageDrops|null>(null);
  const page = useMemo(() => pet ? logPageForPet(journal, pet) : null, [journal, pet?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (pet) { setTab(editProgress&&canEdit?'Progress & notes':'Drops & odds'); setIndex(pet.obtained&&receivedMethod(pet)?pet.methods.indexOf(receivedMethod(pet)!):pet.plannedMethod??0); ref.current?.showModal(); }
    else ref.current?.close();
  }, [pet?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setDrops(null);
    if (!page) return;
    let live = true;
    loadPageDrops(page.name, page.items.map(i => i.id)).then(d => { if (live) setDrops(d); }).catch(() => { if (live) setDrops({sources:[],items:{},error:'Drop sources are temporarily unavailable.'}); });
    return () => { live = false; };
  }, [page?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { scroll.current?.scrollTo({top:0}); }, [tab, pet?.id]);
  useEffect(() => { if(error)scroll.current?.scrollTo({top:0}); }, [error]);

  const m = pet?.methods[index];
  function change(key: keyof Method, value: string) {
    if (!pet || !m || busy) return;
    const methods = [...pet.methods];
    methods[index] = {
      ...m,
      ...(key === 'kph' ? {paceConfirmed: true} : key === 'rate' ? {rateConfirmed: false,rateOverride:true} : {}),
      [key]: ['kc', 'rate', 'kph', 'farmingRunsPerDay'].includes(key) ? (value === '' ? null : Number(value)) : value,
      ...(['name', 'unit'].includes(key) ? {activity: null, rateConfirmed: false, paceConfirmed: false} : {}),
      ...(key==='unit'?{kc:null,rate:null,kph:null,rateOverride:true}:{}),
    };
    setPet({...pet, methods, ...(pet.obtained&&receivedMethod(pet)===m&&key==='kph'&&m.unit==='XP'?{historicalXph:value===''?null:Number(value)}:{}),...(pet.obtained&&receivedMethod(pet)===m&&key==='name'?{obtainedMethod:value}:{}), ...(pet.name==='Phoenix' && m.unit==='rolls' && key==='kc' ? {crateRolls:value===''?null:Number(value)} : {})});
  }

  const close = () => { if (!busy) setPet(null); };
  if (!pet) return <dialog className="modal pet-dialog" ref={ref}/>;

  const planned = oddsMethod(pet);
  const received=usesAcquisition(pet);
  const farming=pet.name==='Tangleroot'?farmingTiming(planned):null;
  const skill = lifetimeSkill(pet, journal);
  const wikiCalc = planned && skill && !planned.rateOverride ? (() => { const w = wikiMethod(pet.name, planned.name); return w ? atLevel(w, skill.level) : null; })() : null;
  const xpUnit = planned?.unit === 'XP';
  const effort = hoursSpent(pet, journal);
  const mean = expectedHours(pet), budget = budgetHours(pet), chance = likelihood(pet);
  const activity = pet.name === 'Abyssal protector' ? 'Guardians of the Rift' : pet.methods.find(x => x.activity)?.activity || page?.name || pet.methods[0]?.name || pet.name;
  const bossImg = bossArtwork(activity) || bossArtwork(page?.name);
  const reviewed = estimateReviewed(pet);

  return <dialog className="modal pet-dialog" ref={ref} aria-labelledby="pet-title" onCancel={e => { e.preventDefault(); close(); }} onClick={e => { if (e.target === ref.current) close(); }}>
    <form className="modal-body" onSubmit={async e => { e.preventDefault(); if(canEdit&&!busy)await onSave(); }}>
      <header className="modal-head">
        <div className="art lg"><img src={`/pets/${pet.id}.png`} alt=""/></div>
        <div className="modal-title">
          <span className="kicker">{pet.category}{page ? ` · ${page.name}` : ''}</span>
          <h2 id="pet-title">{pet.name}</h2>
          <span className={`tag ${pet.obtained ? 'good' : 'warn'}`}>{pet.obtained ? <><Check size={12}/> Collected{pet.date ? ` ${new Date(pet.date).toLocaleDateString()}` : ''}</> : 'Not collected yet'}</span>
        </div>
        <button type="button" className="icon-btn" aria-label="Close" disabled={busy} onClick={close}><X size={22}/></button>
      </header>

      <div className="tabs" role="tablist" aria-label="Pet details">
        {TABS.filter(t=>canEdit||t!=='Progress & notes').map(t => <button type="button" key={t} role="tab" aria-selected={tab === t} disabled={busy} onClick={() => setTab(t)}>{t}</button>)}
      </div>

      <div className="modal-scroll" ref={scroll} role="tabpanel" aria-label={tab}>
        {error && <div className="notice error" role="alert">{error}</div>}
        {tab === 'Drops & odds' && <>
      <div className="statline">
        <div><span>{xpUnit ? 'Expected XP' : 'Drop rate'}</span><b>{xpUnit && wikiCalc?.expectedXp != null ? num(wikiCalc.expectedXp, 0) : planned?.rate ? (xpUnit ? num(planned.rate, 0) : `1/${num(planned.rate, 0)}`) : '—'}</b><small>{xpUnit ? (wikiCalc?.expectedXp != null ? `wiki at level ${skill?.level}` : 'unverified figure') : planned?.unit ? `per ${pet.name==='Abyssal protector'&&planned.unit==='rewards'?'search':planned.unit.replace(/s$/, '')}` : 'not set'}</small></div>
        <div><span>Your {petUnitLabel(pet,planned?.unit ?? 'count')}</span><b>{planned?.kc != null ? num(planned.kc, 0) : '—'}</b><small>{planned?.kc != null && planned.rate ? `${num(planned.kc / planned.rate, 2)}× rate` : 'sync or enter it'}</small></div>
        <div><span>{received?'Chance by obtained count':'Chance by now'}</span><b className={chanceTone(chance)}>{chance === null ? '—' : pct(chance)}</b><small>{received?'using your obtained record':'at your count'}{planned?.rateOverride?' · estimate':''}</small></div>
        <div><span>{farming?'Mean hunt (active)':'Mean hunt'}</span><b>{mean === null ? '—' : `${num(mean)} h`}</b><small>{mean === null ? 'needs rate & pace' : `at ${num(planned!.kph!)} ${planned!.unit}/h${reviewed?'':' · default estimate'}`}</small></div>
        <div><span>{farming?'95% budget (active)':'95% budget'}</span><b>{budget === null ? '—' : `${num(budget)} h`}</b><small>1 in 20 still dry</small></div>
        <div><span>{pet.recordedHours != null ? 'Recorded time' : farming&&!pet.huntHistory?.length ? 'Estimated active time' : pet.obtained ? 'Estimated time to pet' : 'Estimated effort'}</span><b>{effort === null ? '—' : `${num(effort)} h`}</b><small>{effort === null ? 'no count yet' : 'count ÷ pace'}</small></div>
      </div>


          {skill&&<p className="current-skill"><b>Current {skill.name}: level {skill.level}</b><span>{num(skill.xp,0)} XP</span></p>}
          {farming&&<FarmingTiming method={planned}/>}
          <PetOdds pet={pet}/>
          <DriestRecord name={pet.name} activity={activity}/>
          <details key={pet.id} className="rate-explanation"><summary>Method &amp; calculation details</summary><RateBasis journal={journal} pet={pet}/></details>
          <h3 className="sub">{page ? `${page.name} drop table` : 'Drop table'}</h3>
          {page?<ActivityDrops journal={journal} page={page} drops={drops} kc={planned?.unit==='kills'?planned?.kc:null} focus={pet.name.toLowerCase()}/>:<div className="activity-source-fallback"><p className="muted">No activity drop table is catalogued for this pet. Its Wiki page has the available acquisition and reward mechanics.</p><a className="btn ghost sm" href={wiki(pet.name)} target="_blank" rel="noreferrer">Pet sources on the Wiki <ExternalLink size={13}/></a></div>}
        </>}

        {tab === 'Guides' && <div className="guides">
          <a href={'/guides?activity='+encodeURIComponent(activity)}><span className="gi"><BookOpen size={22}/></span><span><b>Community guides</b><small>SpoonedOSRS strategies, equipment and inventory setups</small></span></a>
          <a href={wiki(pet.name)} target="_blank" rel="noreferrer"><span className="gi"><Dices size={22}/></span><span><b>Pet &amp; drop mechanics</b><small>Exact drop rates, rolls, thresholds and special cases</small></span><ExternalLink size={16}/></a>
          <a href={wiki(activity + '/Strategies')} target="_blank" rel="noreferrer"><span className="gi"><Swords size={22}/></span><span><b>Strategy &amp; gear</b><small>Recommended setups, inventory and mechanics walkthrough</small></span><ExternalLink size={16}/></a>
          <a href={wiki(activity)} target="_blank" rel="noreferrer"><span className="gi">{bossImg ? <img src={bossImg} alt=""/> : <BookOpen size={22}/>}</span><span><b>{activity}</b><small>Requirements, combat stats and full drop info</small></span><ExternalLink size={16}/></a>
          <a href={wikiSearch(activity + ' location')} target="_blank" rel="noreferrer"><span className="gi"><MapPin size={22}/></span><span><b>Getting there</b><small>Location and fastest teleports</small></span><ExternalLink size={16}/></a>
        </div>}

        {canEdit&&tab === 'Progress & notes' && <fieldset className="pet-editor" disabled={busy}>
          <legend className="sr-only">Edit {pet.name} progress</legend>
          <section className="pet-edit-section">
            <h3>Collection details</h3>
            <div className="pet-edit-toggles">
              <label className="check big"><input type="checkbox" checked={pet.obtained} onChange={e=>setPet({...pet,obtained:e.target.checked})}/> Pet collected</label>
              {!moderation&&<label className="check big"><input type="checkbox" checked={pet.priority} onChange={e=>setPet({...pet,priority:e.target.checked})}/> On my hunt list</label>}
            </div>
            {pet.obtained ? <>
              <p className="fine">Record when you received the pet. Leave anything you don’t know blank.</p>
              <div className="pet-edit-fields">
                <label className="field">Date received<input type="date" value={pet.date} onChange={e=>setPet({...pet,date:e.target.value})}/></label>
                <label className="field">Received-at unit<select value={acquisitionUnit(pet)} onChange={e=>setPet({...pet,obtainedUnit:e.target.value,obtainedCount:null,obtainedStartCount:null,obtainedApproximate:false})}>{acquisitionUnits(pet).map(unit=><option key={unit} value={unit}>{unit==='level'?`${petSkill[pet.name]} level (XP unknown)`:unit==='XP'?`${petSkill[pet.name]} XP`:pet.name==='Tiny tempor'&&unit==='rolls'?'Permits spent (rolls)':unit==='kills'?'Kill count (KC)':petUnitLabel(pet,unit)}</option>)}</select></label>
                <label className="field pet-edit-wide">{acquisitionUnit(pet)==='level'?`${petSkill[pet.name]} level when received`:acquisitionUnit(pet)==='XP'?`${petSkill[pet.name]} XP when received`:`${petUnitLabel(pet,acquisitionUnit(pet))} when received`}<input type="number" min={0} max={acquisitionUnit(pet)==='level'?99:acquisitionUnit(pet)==='XP'?200000000:1e12} step={acquisitionUnit(pet)==='XP'?'any':1} value={pet.obtainedCount??''} placeholder="Unknown" onChange={e=>setPet({...pet,obtainedCount:e.target.value===''?null:Number(e.target.value)})}/><small>{acquisitionUnit(pet)==='level'&&pet.obtainedCount?`Level ${pet.obtainedCount} starts at ${num(xpAtLevel(pet.obtainedCount),0)} XP. Your exact XP remains unknown.`:pet.name==='Abyssal protector'?'One reward search is one pet roll; use searches, not games completed.':'This is separate from your current progress. Changing the unit clears this value.'}</small></label>
                <label className="field pet-estimate-check"><span><input type="checkbox" checked={pet.obtainedApproximate??false} onChange={e=>setPet({...pet,obtainedApproximate:e.target.checked})}/> Approximate acquisition count</span></label>
                <label className="field pet-edit-wide">Received from<input value={pet.obtainedMethod??''} maxLength={200} list="acquisition-methods" placeholder="Boss, reward or skilling method" onChange={e=>{const next={...pet,obtainedMethod:e.target.value};const received=receivedMethod(next);if(received)setIndex(pet.methods.indexOf(received));setPet(next);}}/></label><datalist id="acquisition-methods">{pet.methods.map((m,i)=><option key={i} value={m.name}/>)}</datalist>
                <label className="field pet-edit-wide">{acquisitionUnit(pet)==='level'?'XP':petUnitLabel(pet,acquisitionUnit(pet))} at start of hunt (optional)<input type="number" min={0} max={1e12} value={pet.obtainedStartCount??''} onChange={e=>setPet({...pet,obtainedStartCount:e.target.value===''?null:Number(e.target.value)})}/><small>Exclude progress earned before this hunt. Blank assumes 0; mixed methods belong in Historical methods below.</small></label>
              </div>
            </> : <p className="fine">Mark the pet collected to add its received-at count, date and method.</p>}
          </section>

          <section className="pet-edit-section">
            <div className="pet-edit-heading"><h3>{pet.obtained?'Obtained method':'Hunting method'}</h3><button type="button" className="btn ghost sm" disabled={pet.methods.length>=100} onClick={()=>{setIndex(pet.methods.length);setPet({...pet,plannedMethod:pet.methods.length,methods:[...pet.methods,{rateConfirmed:false,paceConfirmed:false,name:'My method',activity:null,kc:null,kph:null,rate:null,unit:petSkill[pet.name]?'XP':'kills',rateOverride:true,source:'Custom estimate'}]});}}><Plus size={14}/> Add method</button></div>
            {skill&&<p className="current-skill"><b>{skill.name} level {skill.level}</b><span>{num(skill.xp,0)} current XP</span><small>Lifetime XP; eligible actions for a particular method are tracked separately.</small></p>}
            {pet.name==='Tangleroot'&&skill&&<div className="pet-estimate-preset">{(['mixed','fruit'] as const).map(kind=><button key={kind} type="button" className="btn ghost sm" onClick={()=>{const preset=mixedFarmingMethod(skill.level,kind),existing=pet.methods.findIndex(x=>x.name===preset.name),idx=existing<0?pet.methods.length:existing,methods=[...pet.methods];const prior=methods[idx];methods[idx]={...preset,farmingRunsPerDay:prior?.farmingRunsPerDay,...(prior?.paceConfirmed?{kph:prior.kph,paceConfirmed:true}:{})};setIndex(idx);setPet({...pet,plannedMethod:idx,methods,...(pet.obtained?{obtainedMethod:preset.name,obtainedUnit:'XP',...(acquisitionUnit(pet)!=='XP'?{obtainedCount:null,obtainedStartCount:null}:{}),historicalXph:null}:{})});}}>{kind==='mixed'?'Mixed tree run':'Fruit-tree run'}</button>)}<p className="fine">Examples: 6 magic + 6 palm trees / 15 minutes, or 6 palm trees / 10 minutes. Fills the rate and active XP/hour; active hours exclude growth time. Set full runs/day below to include waiting in the separate calendar estimate.</p></div>}
            <p className="pet-save-calculation" role="status">{chance!==null?`${received?'Chance by obtained record':'Chance at recorded effort'}: ${pct(chance)}${planned?.rateOverride?' (estimate)':''}. Recalculates as you edit; Save progress keeps your inputs.`:'To calculate odds, enter a method rate and a matching XP or action count. Received-at XP can be used when its method and unit match; XP/hour is only needed for time estimates.'}</p>
            {m ? <>
              <IllustratedSelect label={pet.obtained?"Received-from method":"Method used for estimates"} value={String(index)} onChange={v=>{if(busy)return;const method=pet.methods[Number(v)];setIndex(Number(v));setPet({...pet,plannedMethod:Number(v),...(pet.obtained?{obtainedMethod:method.name,historicalXph:null,...(acquisitionUnit(pet)!==method.unit?{obtainedUnit:method.unit,obtainedCount:null,obtainedStartCount:null}:{})}:{})});}} options={pet.methods.map((x,i)=>({value:String(i),label:x.name,image:bossArtwork(x.activity)||bossArtwork(x.name)||`/pets/${pet.id}.png`}))}/>
              <div className="pet-edit-fields">
                <label className="field">{pet.name==='Phoenix'&&m.unit==='rolls'?'Reward rolls so far':`Your current ${petUnitLabel(pet,m.unit)}`}<input type="number" min={0} max={1e12} step={m.unit==='XP'?'any':1} value={(pet.name==='Phoenix'&&m.unit==='rolls'?pet.crateRolls:m.kc)??''} placeholder="Unknown" onChange={e=>change('kc',e.target.value)}/></label>
                <label className="field">{farmingRoute(m)?'Active XP':pet.name==='Tiny tempor'&&m.unit==='rolls'?'Permits':petUnitLabel(pet,m.unit)} per hour<input type="number" min={0} max={1e12} step="any" value={(pet.obtained&&receivedMethod(pet)===m&&m.unit==='XP'?pet.historicalXph??m.kph:m.kph)??''} placeholder="Your pace" onChange={e=>change('kph',e.target.value)}/></label>
                <label className="field pet-edit-wide">{m.unit==='XP'?'Mean XP per pet (estimate)':'Drop rate — 1 in…'}<input type="number" min={1} max={1e12} step="any" value={m.rate??''} placeholder="e.g. 3000" onChange={e=>change('rate',e.target.value)}/><small>{m.rateOverride?'Your personal planning estimate.':'Wiki or saved method rate.'} Editing this changes your estimate only.</small></label>
                {pet.name==='Tangleroot'&&farmingRoute(m)&&<label className="field pet-edit-wide">Full tree runs per day<input type="number" min={0.01} max={1.5} step="any" value={m.farmingRunsPerDay??''} placeholder="1 (example)" onChange={e=>change('farmingRunsPerDay',e.target.value)}/><small>1 = daily; 0.5 = every other day. Maximum 1.5 assumes palms are ready every 16 hours. Changes calendar time, not active XP/hour or pet odds.</small></label>}
                {['runs','raids','games'].includes(m.unit)&&<label className="field">Minutes per {m.unit.replace(/s$/,'')}<input type="number" min={0.01} step="any" value={m.kph?Number((60/m.kph).toFixed(2)):''} onChange={e=>change('kph',Number(e.target.value)>0?String(60/Number(e.target.value)):'')}/></label>}
              </div>
              {pet.name==='Tangleroot'&&<FarmingTiming method={pet.obtained&&receivedMethod(pet)===m?oddsMethod(pet):m}/>}
              {pet.name==='Tiny tempor'&&<p className="fine">One spent reward permit = one reward-pool roll. Enter permits spent; Tempoross completions and unspent permits do not count.</p>}
              {pet.name==='Phoenix'&&m.unit==='rolls'&&<p className="fine">Enter reward rolls, not Wintertodt subdues.</p>}
              {m.rateOverride&&wikiMethod(pet.name,m.name)&&skill&&<button type="button" className="btn ghost sm" onClick={()=>{const calc=atLevel(wikiMethod(pet.name,m.name)!,skill.level);if(!calc)return;const methods=[...pet.methods];methods[index]={...m,rate:m.unit==='XP'?calc.expectedXp:calc.actions,rateOverride:false,rateConfirmed:true};setPet({...pet,methods});}}>Reset to Wiki estimate</button>}
              <details className="pet-method-settings"><summary>Method name &amp; units</summary><div className="pet-edit-fields">
                <label className="field pet-edit-wide">Method name<input value={m.name} maxLength={200} onChange={e=>change('name',e.target.value)}/></label>
                <label className="field pet-edit-wide">Counted in<select value={m.unit} onChange={e=>change('unit',e.target.value)}>{[...new Set([...UNITS,m.unit])].map(u=><option key={u} value={u}>{petUnitLabel(pet,u)}</option>)}</select><small>Changing units clears this method’s count, rate and pace.</small></label>
              </div></details>
            </> : <p className="muted">Add a method to track this pet.</p>}
          </section>

          <section className="pet-edit-section pet-edit-wide">
            <h3>Time &amp; notes</h3><HuntHistory pet={pet} onChange={setPet}/><EffortBasis pet={pet}/>
            <div className="pet-edit-fields">
              <label className="field">Hours already spent (optional)<input type="number" min={0} max={1e9} step="any" value={pet.recordedHours??''} placeholder="Use count ÷ pace" onChange={e=>setPet({...pet,recordedHours:e.target.value===''?null:Number(e.target.value)})}/></label>
              {skill&&<label className="field">Average {skill.name} XP/hour (optional)<input type="number" min={1} max={1e9} step="any" value={pet.historicalXph??''} placeholder="Your past training pace" onChange={e=>setPet({...pet,historicalXph:e.target.value===''?null:Number(e.target.value)})}/></label>}
              {!moderation&&<label className="field pet-edit-wide">Notes<textarea value={pet.notes} rows={3} maxLength={10000} placeholder="Gear, plans or milestones…" onChange={e=>setPet({...pet,notes:e.target.value})}/></label>}
            </div>
          </section>
        </fieldset>}

      </div>

      <footer className="modal-foot">
        <span className="muted">{canEdit&&tab==='Progress & notes'?'Changes apply when you save.':'Esc to close'}</span>
        <button type="button" className="btn ghost" disabled={busy} onClick={close}>Close</button>
        {canEdit&&(tab==='Progress & notes'?<button type="submit" className="btn primary" disabled={busy}>{busy?'Saving…':moderation?'Review correction':'Save progress'}</button>:<button type="button" className="btn primary" disabled={busy} onClick={()=>setTab('Progress & notes')}>Edit progress</button>)}
      </footer>
    </form>
  </dialog>;
}
