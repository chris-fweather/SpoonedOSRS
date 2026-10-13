'use client';
import {farmingTiming} from '@/lib/farming-timing';
import {FarmingTiming} from './FarmingTiming';
import {collectedDate} from '@/lib/pet-presentation';
import {releaseLabel} from '@/lib/release-dates';
import {EffortBasis} from './HuntHistory';
import {acquisitionEffort} from '@/lib/hunt-history';
import {HoverTip} from './HoverTip';
import {Check, ExternalLink, Info, Maximize2, Pencil, Target} from 'lucide-react';
import {petUnitLabel,acquisitionMethod,acquisitionLabel} from '@/lib/pet-record';
import {petSkill, selectedMethod, oddsMethod, usesAcquisition} from '@/lib/estimates';
import {type Journal, type Pet, budgetHours, expectedHours, hoursSpent, likelihood} from '@/lib/model';
import {templeBenchmarks, templeChecked, templeNotes} from '@/lib/temple-benchmarks';
import {petRateLines} from '@/lib/pet-rates';
import {chanceTone, logPageForPet, num, pct, wiki} from '@/lib/ui';
import {DriestRecord} from './DriestRecord';
import {Meter} from './Meter';
import {OddsMini} from './ProgressCharts';
import {PopHead, Stats} from './Pop';
import {GuideLink} from './GuideLink';

/** Rate basis for the open pet: wiki XP at your level, or the stored drop rate with its source. */
export function RateBasis({journal, pet}: {journal: Journal; pet: Pet}) {
  const {lines, note} = petRateLines(pet, journal);
  const xp = selectedMethod(pet)?.unit === 'XP';
  const benchmarks = templeBenchmarks(pet.name);
  return <div className="pop-block">
    <span className="kicker">{xp ? 'At your XP' : 'Rate basis'}</span>
    <Stats rows={[...lines.map(l => [l.label, l.value, l.tone] as [string,string,string|undefined]),...(selectedMethod(pet)?.observedAverageXp?[['Observed mean XP (reference)',num(selectedMethod(pet)!.observedAverageXp!,0)] as [string,string]]:[])]}/>
    {note && <p className="fine">{note}</p>}
    {!!benchmarks.length && <div className="temple-comparison"><a href="https://templeosrs.com/pets/hours.php" target="_blank" rel="noreferrer">Temple / Petcord comparison <ExternalLink size={12}/></a>
      {benchmarks.map(row => <div key={row.pet_name}><span>{row.pet_name}</span><b>{num(row.pet_hours,0)} h</b></div>)}
      <p className="fine">{templeNotes[pet.name] ?? 'A reference hunt under Temple’s method and pace assumptions. Your selected method or pace may differ.'} Snapshot {templeChecked}; not your recorded play time.</p>
    </div>}
  </div>;
}

/** Pet stats shown in the side pop-out. "Full details" opens the big dialog (drop table, guides, editing). */
export function PetPanel({journal, pet, busy, canEdit, onEdit, onFull, onHunt}: {journal: Journal; pet: Pet; busy: boolean; canEdit:boolean; onEdit:()=>void; onFull: () => void; onHunt: () => void}) {
  const m = oddsMethod(pet);
  const received=usesAcquisition(pet);
  const farming=pet.name==='Tangleroot'?farmingTiming(m):null;
  const unit=petUnitLabel(pet,m?.unit??'count');
  const outlook = petRateLines(pet, journal);
  const chance = pet.obtained||pet.huntHistory?.length?likelihood(pet):outlook.chance ?? likelihood(pet);
  const mean = outlook.hours ?? expectedHours(pet);
  const budget = budgetHours(pet), spent = hoursSpent(pet, journal);
  const effortLabel=pet.recordedHours!=null?'Recorded time':farming&&!pet.huntHistory?.length?'Estimated active time':pet.obtained?'Estimated time to pet':'Estimated effort';
  const effort=pet.obtained||pet.huntHistory?.length||pet.recordedHours!=null?acquisitionEffort(pet):null;
  const effortHelp=effort?`${effort.range?`Estimated range: ${num(effort.range[0])}–${num(effort.range[1])} h. `:''}${effort.basis}`:null;
  const page = logPageForPet(journal, pet);
  const skill = journal.hiscores.skills.find(row => row.name === petSkill[pet.name]);
  const xp = m?.unit === 'XP' || outlook.averageXp != null;
  const rate = outlook.lines.find(line => line.label === 'Drop rate' || line.label.startsWith('Drop rate at'))?.value
    ?? (m?.rate ? (xp ? `1 per ${num(m.rate, 0)} XP` : `1/${num(m.rate, 0)}`) : '—');
  return <>
    <PopHead img={`/pets/${pet.id}.png`} wide kicker={`${pet.category}${page ? ` · ${page.name}` : ''}`} title={pet.name}
      sub={pet.obtained ? <span className="good"><Check size={12}/> Collected{pet.date ? ` ${collectedDate(pet.date)}` : ''}</span> : <span className="muted">Not collected yet</span>}/>
    <Stats rows={[
      [m?.rateOverride?'Personal estimate':m?.rateConfirmed ? 'Drop rate' : 'Planning rate', rate, 'y'],
      ...(outlook.averageXp != null ? [['Average XP', num(outlook.averageXp, 0), 'y'] as [string, string, string]] : []),
      [pet.huntHistory?.length?'Chance across historical methods':received?'Chance by obtained count':'Chance by this count', chance === null ? '—' : pct(chance), chanceTone(chance)],
      ...(skill && !received && m?.kc!=null ? [[`Recorded ${m.unit}`,num(m.kc,0)] as [string,string]] : []),
      [skill ? 'Lifetime XP' : received?`Count used (${unit})`:`Your ${unit}`, skill ? num(skill.xp, 0) : (m?.kc != null ? num(m.kc, 0) : '—')],
      ...(pet.obtainedCount != null ? [['Obtained', acquisitionLabel(pet)] as [string, string]] : []),

      ...(pet.obtainedCount!=null&&acquisitionMethod(pet)?[['Received from',acquisitionMethod(pet)] as [string,string]]:[]),
      ...([['Phoenix','Wintertodt'],['Tiny tempor','Tempoross'],['Abyssal protector','Guardians of the Rift']].filter(([name])=>name===pet.name).flatMap(([,activity])=>{const a=journal.hiscores.activities.find(a=>a.name===activity&&a.score>=0);return a?[[activity+' completions',num(a.score,0)] as [string,string]]:[]})),
      [farming?'Active pace':'Pace', m?.kph?`${num(m.kph)} ${unit}/h`:'Not set','stat-single-line'],
      ['Basis',!m?.kph?'Not set':m?.paceConfirmed?'Saved pace':'Default estimate','stat-single-line'],
      ['Method',m?.name??'Not set','stat-single-line'],
      ...(releaseLabel(pet.name,'pets')?[["Pet released",releaseLabel(pet.name,'pets')!] as [string,string]]:[]),
      [farming?'Mean hunt (active)':'Mean hunt', mean === null ? '—' : `~${num(mean, 0)} h`, 'y'],
      ...(!pet.obtained && budget !== null ? [[farming?'95% budget (active)':'95% budget', `${num(budget)} h`] as [string, string]] : []),
      ...(farming?.meanDays!=null?[[`Mean hunt (calendar)`, `~${num(farming.meanDays,0)} days`] as [string,string]]:[]),
      [effortHelp?<HoverTip className="effort-stat-help" placement="right" label={`${effortLabel}: ${effortHelp}`} content={<span className="effort-tooltip"><strong>{effortLabel}</strong><span>{effortHelp}</span></span>}>{effortLabel}<Info size={12} aria-hidden="true"/></HoverTip>:effortLabel, spent === null ? '—' : `${num(spent)} h`],
    ]}/>
    {farming&&<><p className="fine">Calendar: {farming.runsPerDay} full runs/day · {farming.example?'example schedule':'saved schedule'}.</p><FarmingTiming method={m}/></>}
    {chance !== null && <div className="pop-block"><Meter done={chance} total={1}/><small className="muted">{pct(chance)} {received?'by your obtained record':'at your recorded effort'}{m?.rateOverride?' · estimate':''}</small></div>}
    <OddsMini pet={pet}/>
    <DriestRecord name={pet.name} activity={petSkill[pet.name] || m?.activity || page?.name}/>
    <details key={pet.id} className="rate-explanation"><summary>Method &amp; calculation details</summary><RateBasis journal={journal} pet={pet}/><EffortBasis pet={pet}/></details>
    <div className="pop-links">
      <button type="button" className="btn primary sm" onClick={onFull}><Maximize2 size={13}/> Drop table &amp; details</button>
      {canEdit&&<button type="button" className="btn primary sm" disabled={busy} onClick={onEdit}><Pencil size={13}/>Edit progress &amp; rates</button>}
      {canEdit&&!pet.obtained && <button type="button" className={`btn sm ${pet.priority ? 'on' : 'ghost'}`} disabled={busy} onClick={onHunt}><Target size={13}/> {pet.priority ? 'On hunt list' : 'Add to hunt list'}</button>}
      <GuideLink activity={m?.activity || page?.name}/>
      <a className="btn ghost sm" href={wiki(pet.name)} target="_blank" rel="noreferrer">Wiki <ExternalLink size={13}/></a>
    </div>
  </>;
}
