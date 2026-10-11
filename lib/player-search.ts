import type {Donation} from './presentation';
import type {PublicStaff} from './staff-policy';

export type PlayerSuggestion = {name: string; staff?: PublicStaff | null; title?: string | null; donation?:Donation};
export const searchName = (name: string) => name.trim().toLowerCase().replace(/_/g, ' ');

/** Name relevance always outranks staff status. No fuzzy substitutions for a real RSN. */
export function playerSuggestions(players: PlayerSuggestion[], query: string): PlayerSuggestion[] {
  const q = searchName(query);
  if (!q) return [];
  const unique = new Map<string, PlayerSuggestion>();
  for (const player of players) {
    const key = searchName(player.name), previous = unique.get(key);
    unique.set(key, previous ? {...previous, ...player, staff: player.staff ?? previous.staff} : player);
  }
  const relevance = (name: string) => {
    const value = searchName(name);
    return value === q ? 0 : value.startsWith(q) ? 1 : value.split(' ').some(word => word.startsWith(q)) ? 2 : 3;
  };
  return [...unique.values()].filter(p => searchName(p.name).includes(q)).sort((a, b) =>
    relevance(a.name) - relevance(b.name) || Number(!!b.staff) - Number(!!a.staff) || a.name.localeCompare(b.name)
  ).slice(0, 8);
}
