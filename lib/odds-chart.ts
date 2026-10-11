import type {Pet} from './model';
import {oddsMethod, selectedMethod, usesAcquisition} from './estimates';
import {attemptsFor, chanceAfter} from './ui';

/** A missing acquisition count may show current effort, but never invent the acquisition. */
export function petChartRecord(pet: Pet) {
  const method = pet.obtained && pet.obtainedCount == null ? selectedMethod(pet) : oddsMethod(pet);
  return {method, label: usesAcquisition(pet) ? 'Obtained' : 'Current progress'};
}

/** Include the exact marker in the hover dataset, not just the evenly spaced curve samples. */
export function oddsCurve(probability: number, current: number | null | undefined, continuous = false, steps = 60) {
  const count = current != null && Number.isFinite(current) && current >= 0 ? current : null;
  const chance = (n: number) => continuous ? -Math.expm1(-n * probability) : chanceAfter(n, probability);
  const at = (p: number) => continuous ? -Math.log1p(-p) / probability : attemptsFor(p, probability);
  const max = Math.max(at(.99), (count ?? 0) * 1.1);
  const counts = Array.from({length: steps + 1}, (_, i) => continuous ? i * max / steps : Math.round(i * max / steps));
  if (count != null) counts.push(count);
  const curve = [...new Set(counts)].sort((a, b) => a - b).map(a => ({a, c: chance(a)}));
  return {curve, max, count, chance: count == null ? null : chance(count), at};
}
