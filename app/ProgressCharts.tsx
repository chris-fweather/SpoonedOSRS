'use client';
import {ChevronRight} from 'lucide-react';
import {TileProgress} from './TileProgress';
import {Pagination} from './Pagination';
import {useId, useState} from 'react';
import {Area, AreaChart, Bar, BarChart, CartesianGrid, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {oddsCurve,petChartRecord} from '@/lib/odds-chart';
import {petUnitLabel} from '@/lib/pet-record';
import {selectedMethod} from '@/lib/estimates';
import {expectedHours, likelihood, type Pet} from '@/lib/model';
import {chanceAfter, chanceTone, num, pct, shortNumber} from '@/lib/ui';
import {Meter} from './Meter';

const CATS = ['Bosses', 'Skilling', 'Minigames', 'Raids', 'Clues'];
const C = {grid: '#3a362f', axis: '#a39b8b', orange: '#ff981f', green: '#3fbf4f', red: '#d9442b', yellow: '#ffe14d'};

export function CategoryBars({pets, onSelect}: {pets: Pet[]; onSelect?: (c: string) => void}) {
  return <section className="panel category-panel">
    <div className="ph"><h2>Pets by category</h2><span className="muted">Click a category to browse it</span></div>
    <div className="hbars">{CATS.map(c => {
      const all = pets.filter(p => p.category === c), got = all.filter(p => p.obtained).length;
      return <button type="button" key={c} className="hbar" onClick={() => onSelect?.(c)}>
        <span className="hbar-label">{c}</span><ChevronRight size={13} aria-hidden="true"/>
        <TileProgress done={got} total={all.length} unit="pets"/>
      </button>;
    })}</div>
  </section>;
}

/** How deep into each pet's drop rate you are (KC ÷ rate), with chance already spent. */
export function DryMeter({pets, onOpen, limit, title = 'Dry meter', compact, pageSize}: {pets: Pet[]; onOpen: (p: Pet) => void; limit?: number; title?: string; compact?: boolean; pageSize?: number}) {
  const [page, setPage] = useState(0);
  const rows = pets.filter(p => !p.obtained).map(p => {
    const m = selectedMethod(p);
    return {p, m, kc: m?.kc ?? 0, rate: m?.rate ?? 0, chance: likelihood(p)};
  }).filter(r => r.kc > 0 && r.rate > 0 && r.m?.unit !== 'XP').sort((a, b) => b.kc / b.rate - a.kc / a.rate).slice(0, limit ?? 999);
  const size = pageSize ?? rows.length;
  const pages = Math.max(1, Math.ceil(rows.length / Math.max(1, size)));
  const active = Math.min(page, pages - 1);
  const shown = rows.slice(active * size, active * size + size);
  return <section className={`${compact ? 'sec' : 'panel'} ${pageSize ? 'pageable' : ''}`}>
    <div className={compact ? 'sec-h' : 'ph'}>{compact ? <h3>{title}</h3> : <h2>{title}</h2>}<span className="muted sm">{compact ? 'Attempts vs drop rate' : 'Recorded attempts ÷ drop rate · marker = 1×'}</span></div>
    {!rows.length && <p className="muted">Sync hiscores to fill in kill counts.</p>}
    <div className="dry">{shown.map(({p, m, kc, rate, chance}) => {
      const ratio = kc / rate;
      return <button type="button" key={p.id} className="dry-row" onClick={() => onOpen(p)}>
        <img src={`/pets/${p.id}.png`} alt="" loading="lazy"/>
        <span className="dry-name"><b>{p.name}</b><small>{num(kc, 0)} / {num(rate, 0)} {m?.unit}</small></span>
        <span className="dry-track"><b className={chanceTone(chance)} style={{width: `${Math.min(ratio / 3, 1) * 100}%`}}/><i style={{left: '33.33%'}}/></span>
        <span className={`dry-val ${chanceTone(chance)}`}>{ratio < 0.01 ? '<0.01' : num(ratio, 2)}×<small>{chance === null ? '' : `${pct(chance)} would have it`}</small></span>
      </button>;
    })}</div>
    {pageSize && <Pagination page={active} pages={pages} onPage={setPage} label={compact?'Hunts':'Hunt results'}/>}
  </section>;
}

/** Fastest remaining hunts by mean hours. */
export function QuickestHunts({pets, onOpen, limit, compact, pageSize}: {pets: Pet[]; onOpen: (p: Pet) => void; limit?: number; compact?: boolean; pageSize?: number}) {
  const [page, setPage] = useState(0);
  const rows = pets.filter(p => !p.obtained && expectedHours(p) !== null).map(p => ({p, h: expectedHours(p)!})).sort((a, b) => a.h - b.h).slice(0, limit ?? (pageSize ? undefined : 12));
  const size = pageSize ?? rows.length;
  const pages = Math.max(1, Math.ceil(rows.length / Math.max(1, size || 1)));
  const active = Math.min(page, pages - 1);
  const shown = rows.slice(active * size, active * size + (size || rows.length));
  const max = Math.max(...shown.map(r => r.h), 1);
  return <section className={`${compact ? 'sec' : 'panel'} ${pageSize ? 'pageable' : ''}`}>
    <div className={compact ? 'sec-h' : 'ph'}>{compact ? <h3>Quickest hunts</h3> : <h2>Quickest remaining hunts</h2>}<span className="muted sm">{compact ? 'mean hours left' : 'Mean hours at your selected method & pace'}</span></div>
    <div className="dry">{shown.map(({p, h}) => <button type="button" key={p.id} className="dry-row" onClick={() => onOpen(p)}>
      <img src={`/pets/${p.id}.png`} alt="" loading="lazy"/>
      <span className="dry-name"><b>{p.name}</b><small>{selectedMethod(p)?.name}</small></span>
      <span className="dry-track"><b className="info" style={{width: `${h / max * 100}%`}}/></span>
      <span className="dry-val">{num(h)} h</span>
    </button>)}</div>
    {pageSize && <Pagination page={active} pages={pages} onPage={setPage} label={compact?'Hunts':'Hunt results'}/>}
  </section>;
}

/** Odds for one pet: summary line + cumulative curve + "when players get it" distribution. */
export function PetOdds({pet}: {pet: Pet}) {
  const {method:m,label:markerLabel} = petChartRecord(pet);
  const rate = m?.rate ?? 0;
  if(pet.huntHistory?.length)return <p className="fine">Historical chance combines your saved method segments. A single-rate curve would misrepresent this mixed hunt.</p>;
  if (!m || !rate) return <p className="muted">Add a drop rate under Progress &amp; notes to see odds.</p>;
  const unit = petUnitLabel(pet,m.unit);
  const xp = m.unit === 'XP';
  const p = xp ? 1 / rate : 1 / rate;
  const {curve,max,count,chance,at} = oddsCurve(p,m.kc,xp);
  const kc = count ?? 0;
  const bucket = rate / 2;
  const dist = Array.from({length: 8}, (_, i) => {
    const lo = i * bucket, hi = (i + 1) * bucket;
    const f = (x: number) => xp ? -Math.expm1(-x / rate) : chanceAfter(x, p);
    return {label: `${num(lo / rate, 1)}–${num(hi / rate, 1)}×`, share: (f(hi) - f(lo)) * 100, mine: m.kc != null && kc >= lo && kc < hi};
  });
  return <div className="odds">
    <div className="odds-line four">
      <div><span>50% at</span><b>{num(at(.5), 0)}</b><small>{unit}</small></div>
      <div><span>90% at</span><b>{num(at(.9), 0)}</b><small>{unit}</small></div>
      <div><span>95% at</span><b>{num(at(.95), 0)}</b><small>{unit}</small></div>
      <div><span>To 90% from here</span><b>{num(at(.9), 0)}</b><small>additional {unit}</small></div>
    </div>
    <p className="fine">Independent rolls do not become more likely after a dry streak. These are modelled probabilities, not observed player averages. Conditions and pace must match the selected method.</p>
    <div className="odds-charts">
      <figure>
        <figcaption>Chance of having the pet by {unit}{count!=null&&<span className="odds-marker-value">{markerLabel}: {num(count,0)} {unit} · {pct(chance!)}</span>}</figcaption>
        <ResponsiveContainer width="100%" height={210}>
          <AreaChart data={curve} margin={{top: 10, right: 12, bottom: 0, left: -8}}>
            <defs><linearGradient id="oc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={C.orange} stopOpacity={.45}/><stop offset="1" stopColor={C.orange} stopOpacity={.03}/></linearGradient></defs>
            <CartesianGrid stroke={C.grid} vertical={false}/>
            <XAxis dataKey="a" type="number" domain={[0, max]} tickFormatter={v => num(v, 0)} stroke={C.axis} fontSize={11} tickLine={false}/>
            <YAxis domain={[0, 1]} tickFormatter={v => `${Math.round(v * 100)}%`} stroke={C.axis} fontSize={11} tickLine={false} width={42}/>
            <Tooltip contentStyle={{background: '#1e1c18', border: '1px solid #4a453c', borderRadius: 6}} labelFormatter={v => `${count!=null&&Number(v)===count?markerLabel+': ':''}${num(Number(v), 0)} ${unit}`} formatter={v => [pct(Number(v)), 'Chance']}/>
            <Area dataKey="c" type="monotone" stroke={C.orange} strokeWidth={2} fill="url(#oc)" isAnimationActive={false}/>
            <ReferenceLine x={rate} stroke={C.axis} strokeDasharray="4 4" label={{value: '1× rate', fill: C.axis, fontSize: 11, position: 'insideBottomRight'}}/>
            {count != null && <ReferenceLine x={kc} stroke={C.yellow} strokeWidth={2} label={{value: `You: ${num(kc,0)}`, fill: C.yellow, fontSize: 12, position: 'insideTopLeft'}}/>}
            {count != null && <ReferenceDot x={count} y={chance!} r={4} fill={C.yellow} stroke="#171610"/>}
          </AreaChart>
        </ResponsiveContainer>
      </figure>
      <figure>
        <figcaption>Theoretical distribution (multiples of the drop rate)</figcaption>
        <ResponsiveContainer width="100%" height={210}>
          <BarChart data={dist} margin={{top: 10, right: 8, bottom: 0, left: -8}}>
            <CartesianGrid stroke={C.grid} vertical={false}/>
            <XAxis dataKey="label" stroke={C.axis} fontSize={10} tickLine={false} interval={0}/>
            <YAxis tickFormatter={v => `${Math.round(v)}%`} stroke={C.axis} fontSize={11} tickLine={false} width={42}/>
            <Tooltip cursor={{fill: '#ffffff0d'}} contentStyle={{background: '#1e1c18', border: '1px solid #4a453c', borderRadius: 6}} formatter={v => [`${num(Number(v))}%`, 'Players']}/>
            <Bar dataKey="share" isAnimationActive={false} radius={[3, 3, 0, 0]} shape={(props: unknown) => {
              const {x, y, width, height, payload} = props as {x: number; y: number; width: number; height: number; payload: {mine: boolean}};
              return <rect x={x} y={y} width={width} height={height} rx={3} fill={payload.mine ? C.yellow : '#6b6253'}/>;
            }}/>
          </BarChart>
        </ResponsiveContainer>
      </figure>
    </div>
    <p className="fine">{xp ? 'XP uses a continuous approximation at a fixed level and method; actual pet rolls happen on eligible actions.' : 'Past misses do not change the next independent roll.'} {m.kc == null ? 'No eligible effort recorded yet.' : 'The yellow marker shows your recorded count.'}</p>
  </div>;
}

/** Compact odds for the side pop-out: milestones + small cumulative curve. */
export function OddsMini({pet}: {pet: Pet}) {
  const {method:m,label:markerLabel} = petChartRecord(pet);
  if (!m?.rate||pet.huntHistory?.length) return null;
  return <DropOddsMini probability={1/m.rate} current={m.kc} unit={petUnitLabel(pet,m.unit)} continuous={m.unit === 'XP'} markerLabel={markerLabel}/>;
}

/** Only pass a probability when the recorded count uses the same roll basis. */
export function DropOddsMini({probability: p, current, unit, continuous: xp = false, markerLabel = 'Current progress'}: {probability:number;current:number|null|undefined;unit:string;continuous?:boolean;markerLabel?:string}) {
  const gradient = useId().replaceAll(':','') + '-odds';
  if (!(p > 0 && p <= 1)) return null;
  const {curve,max,count,chance,at} = oddsCurve(p,current,xp,40);
  const kc = count ?? 0;
  return <div className="odds-mini">
    <div className="odds-ms">{[.5, .9, .95].map(c => <div key={c} className={kc >= at(c) ? 'past' : ''}><span>{c * 100}%</span><b title={`${num(at(c),0)} ${unit}`} aria-label={`${num(at(c),0)} ${unit}`}>{shortNumber(at(c))}</b></div>)}</div>
    <ResponsiveContainer width="100%" height={130}>
      <AreaChart data={curve} margin={{top: 8, right: 6, bottom: 0, left: 0}}>
        <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={C.orange} stopOpacity={.45}/><stop offset="1" stopColor={C.orange} stopOpacity={.03}/></linearGradient></defs>
        <CartesianGrid stroke={C.grid} vertical={false}/>
        <XAxis dataKey="a" type="number" domain={[0, max]} tickFormatter={v => compactNum(v)} stroke={C.axis} fontSize={10} tickLine={false}/>
        <YAxis domain={[0, 1]} ticks={[0, .5, 1]} tickFormatter={v => `${Math.round(v * 100)}%`} stroke={C.axis} fontSize={10} tickLine={false} width={36}/>
        <Tooltip contentStyle={{background: '#1e1c18', border: '1px solid #4a453c', borderRadius: 6, fontSize: 12}} labelFormatter={v => `${count!=null&&Number(v)===count?markerLabel+': ':''}${num(Number(v), 0)} ${unit}`} formatter={v => [pct(Number(v)), 'Chance']}/>
        <Area dataKey="c" type="monotone" stroke={C.orange} strokeWidth={2} fill={`url(#${gradient})`} isAnimationActive={false}/>
        {count != null && <ReferenceLine x={kc} stroke={C.yellow} strokeWidth={2} label={{value: `You: ${num(kc,0)}`, fill: C.yellow, fontSize: 11, position: 'insideTopLeft'}}/>}
        {count != null && <ReferenceDot x={count} y={chance!} r={4} fill={C.yellow} stroke="#171610"/>}
      </AreaChart>
    </ResponsiveContainer>
    {count!=null&&<small className="odds-marker-value">{markerLabel}: {num(count,0)} {unit} · {pct(chance!)}</small>}
    <small className="muted">{unit} needed for 50 / 90 / 95% of players to have it</small>
  </div>;
}
const compactNum = (n: number) => n >= 1e6 ? `${num(n / 1e6, 1)}M` : n >= 1e3 ? `${num(n / 1e3, 0)}K` : num(n, 0);
