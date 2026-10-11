import {highestListedRate} from './rate-summary';
import type {DropSource, ItemRate} from './ui';

export const contributionBased = (source: string) => source.toLowerCase().trim() === 'nex';

const normalized = (name: string) => name.toLowerCase().replaceAll('_', ' ').replaceAll('’', "'").trim();
/** Derive the tile and item drawer from the same rows as the selected activity's table. */
export function activityItemRates(sources: DropSource[], ids: string[], names: Record<string, string>): Record<string, ItemRate> {
  const result: Record<string, ItemRate> = {};
  for (const id of ids) {
    const name = names[id];
    if (!name) continue;
    const matches = sources.flatMap(s => s.tabs.flatMap(t => t.r.filter(r => normalized(r[0]) === normalized(name)).map(r => ({source: s.t, table: t.h, row: r}))));
    if (!matches.length) continue;
    const variants = [...new Set(matches.map(m => m.row[2]))];
    // Even equal rates on distinct sources must not imply one combined KC sample.
    const single = matches.length === 1 && !contributionBased(matches[0].source);
    result[id] = {r: highestListedRate(variants), p: single ? matches[0].row[3] : null,
      s: [...new Set(matches.map(m => m.source))].join(' / '),
      all: matches.map(m => [`${m.source} · ${m.table}`, m.row[2]])};
  }
  return result;
}
