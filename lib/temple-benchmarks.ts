import snapshot from './temple-pet-hours.json' with {type:'json'};
const aliases: Record<string,string> = {'pet dark core':'pet dark core', 'vet\'ion jr.':'vet\'ion jr.', 'jal-nib-rek':'jal-nib-rek'};
export function templeBenchmarks(name: string) {
  const key = aliases[name.toLowerCase()] ?? name.toLowerCase();
  return snapshot.rows.filter(row => row.pet_name.trim().toLowerCase() === key || row.pet_name.toLowerCase().startsWith(key + ' ('));
}
export const templeChecked = snapshot.checked;
export const templeNotes: Record<string,string> = {
  Phoenix:'50 reward rolls/hour, not 50 Wintertodt kills/hour. Your reward count does not tell us how many hours you played.',
  Rocky:'The 34,015 denominator corresponds to level-99 seed stalls. Knight pickpocketing uses a different rate; lifetime Thieving XP cannot identify the method.',
  "Lil' Creator":'12,000 Zeal ÷ 430 Zeal/hour. This is a fast reference pace, equivalent to 30 Zeal per crate and 1/400 per crate.',
  'TzRek-Jad':'The rounded 1/67 benchmark combines an on-task completion roll and cape exchange, at 24 minutes/run. Off-task, keeping the cape is 1/200.',
  Nexling:'Contribution-based benchmark. The Wiki base 1/500 roll is adjusted by your contribution and MVP status; it is not every player’s personal chance per kill.',
  'Callisto cub':'Temple’s 2,800 denominator differs from the Callisto source rate. Artio is 1/2,800; compare the same boss and method.',
  Bloodhound:'Temple lists 273 hours although 1,000 ÷ 10 = 100. Its reference total includes assumptions not exposed in the API; do not treat it as measured clue-solving time.',
  Dom:'Temple’s reference method and depth differ from a universal per-kill rate. Doom pet chance depends on delve.',
};
