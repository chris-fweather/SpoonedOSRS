'use client';
import {Pagination} from './Pagination';
import {useState} from 'react';
import {selectedMethod} from '@/lib/estimates';
import {type Journal, type Pet, expectedHours, budgetHours, likelihood} from '@/lib/model';
import {num, pct} from '@/lib/ui';
export function GrindPlan({journal, onOpen}: {journal: Journal; onOpen: (p: Pet) => void}) {
  const [page, setPage] = useState(0);
  const remaining = journal.pets.filter(p => !p.obtained).sort((a, b) => (expectedHours(a) ?? Infinity) - (expectedHours(b) ?? Infinity));
  const pages = Math.max(1, Math.ceil(remaining.length / 6)), active = Math.min(page, pages - 1);
  return <section className="panel grind-panel">
    <div className="ph"><h2>Remaining grind</h2><span className="muted">{remaining.length} pets left · quickest first</span></div>
    <div className="grind-rows">{remaining.slice(active * 6, active * 6 + 6).map(p => {
      const m = selectedMethod(p), c = likelihood(p), e = expectedHours(p), b = budgetHours(p);
      return <button className="grind-row" type="button" key={p.id} onClick={() => onOpen(p)}>
        <img src={`/pets/${p.id}.png`} alt="" loading="lazy"/><span className="grind-name"><b>{p.name}</b><small>{m?.name ?? 'Choose a method'}</small></span>
        <dl><div><dt>Mean hunt</dt><dd>{e === null ? 'Set pace' : `${num(e)} h`}</dd></div><div><dt>95% budget</dt><dd>{b === null ? 'Set pace' : `${num(b)} h`}</dd></div>
          <div><dt>Recorded {m?.unit ?? 'attempts'}</dt><dd>{m?.kc == null ? 'Not recorded' : num(m.kc, 0)}</dd></div><div><dt>Chance by count</dt><dd>{c === null ? 'Not recorded' : pct(c)}</dd></div></dl>
      </button>;
    })}</div>
    <Pagination page={active} pages={pages} onPage={setPage} label="Remaining grind"/>
    <p className="fine">Future hours at the selected pace. A 95% budget is a probability target, not a guarantee.</p>
  </section>;
}
