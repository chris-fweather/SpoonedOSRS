import type {Method} from '@/lib/model';
import {farmingTiming} from '@/lib/farming-timing';
import {num} from '@/lib/ui';

export function FarmingTiming({method}:{method?:Method}) {
 const timing=farmingTiming(method);
 if(!timing)return null;
 return <details className="rate-explanation farming-timing">
  <summary>Tree-run schedule · {timing.meanDays==null?'pace details':`~${num(timing.meanDays,0)} calendar days at mean rate`}</summary>
  <p className="fine">{timing.description}: {num(timing.xp,0)} XP per full run{timing.activeHoursPerRun!=null?`, about ${num(timing.activeHoursPerRun*60)} active minutes`:''}. {timing.runsPerDay} full runs/day ({timing.example?'example schedule; edit in Progress & notes':'saved schedule'}), about {num(timing.xpPerDay,0)} XP/day including the wait.</p>
  <p className="fine">Magic trees take about 8 hours and palms 16 hours to grow. Trees grow together; a full route waits for the palms. Missed runs, disease and growth-cycle timing can make this longer. Extra magic-only runs are not included.</p>
  <p className="fine">Calendar time is a planning average, not your recorded time to obtain the pet or a guarantee. The active-hour figures exclude growth and offline time. Assumes all counted XP came from this crop mix at the stated level.</p>
  <a className="text-link" href="https://oldschool.runescape.wiki/w/Tree_farming_guide" target="_blank" rel="noreferrer">Tree growth & run assumptions ↗</a>
 </details>;
}
