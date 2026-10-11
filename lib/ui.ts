import logTemplate from './log-template.json';
// Shared formatting + lookup helpers for the UI.
import type {Journal, Pet} from './model';

export const num = (n: number, digits = 1) => n.toLocaleString(undefined, {maximumFractionDigits: digits});
export const compact = (n: number) => n >= 1e6 ? `${num(n / 1e6, 1)}M` : n >= 1e4 ? `${num(n / 1e3, 0)}K` : num(n, 0);
/** Short display for narrow stat cards; retain exact values in accessible labels/tooltips. */
export const shortNumber = (n: number) => Math.abs(n) >= 1e9 ? `${num(n / 1e9, 2)} bil` : Math.abs(n) >= 1e6 ? `${num(n / 1e6, 2)} mil` : num(n, 0);
export const shortStat = (value: string) => value.replace(/\b(?:\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d{7,}(?:\.\d+)?)\b/g, text => {const n=Number(text.replaceAll(',', '')); return n>=1e6?shortNumber(n):text;});
export const pct = (p: number) => `${(p * 100).toFixed(p >= 0.995 || p < 0.001 ? 1 : 1)}%`;
export const wiki = (name: string) => 'https://oldschool.runescape.wiki/w/' + encodeURIComponent(name.replaceAll(' ', '_'));
export const wikiSearch = (q: string) => 'https://oldschool.runescape.wiki/w/Special:Search?search=' + encodeURIComponent(q);

/** Completion tone: 100% green, anything started amber, nothing red. */
export function tone(done: number, total: number) {
  if (total > 0 && done >= total) return 'good';
  if (done > 0) return 'warn';
  return 'none';
}

/** Dry-ness tone from cumulative chance already spent. */
export function chanceTone(p: number | null) {
  if (p === null) return 'none';
  if (p < 0.5) return 'good';
  if (p < 0.8) return 'warn';
  return 'bad';
}

export function chanceAfter(attempts: number, p: number) {
  if (!(p > 0)) return 0;
  if (p >= 1) return attempts > 0 ? 1 : 0;
  return -Math.expm1(attempts * Math.log1p(-p));
}

export function attemptsFor(chance: number, p: number) {
  if (!(p > 0)) return Infinity;
  if (p >= 1) return 1;
  return Math.ceil(Math.log1p(-chance) / Math.log1p(-p));
}

/** Collection log page that contains this pet. */
export function logPageForPet(j: Journal, pet: Pet) {
  for (const t of j.log?.tabs ?? []) for (const p of t.pages) if (p.name !== 'All Pets' && p.items.some(i => String(i.id) === pet.id)) return p;
  const catalogue=logTemplate.tabs.flatMap(t=>t.pages).find(p=>p.name!=='All Pets'&&p.items.some(i=>String(i.id)===pet.id));
  return catalogue?{...catalogue,obtained:0,items:catalogue.items.map(item=>({...item,quantity:0}))}:null;
}

const KC_ALIASES: Record<string, string[]> = {
  'Callisto and Artio': ['Callisto', 'Artio'],
  'Venenatis and Spindel': ['Venenatis', 'Spindel'],
  "Vet'ion and Calvar'ion": ["Vet'ion", "Calvar'ion"],
  'Dagannoth Kings': ['Dagannoth Rex', 'Dagannoth Prime', 'Dagannoth Supreme'],
  'The Fight Caves': ['TzTok-Jad'],
  'The Inferno': ['TzKal-Zuk'],
  'Fortis Colosseum': ['Sol Heredit'],
  'Royal Titans': ['The Royal Titans'],
  'The Mad Angel': ['Mad Angel'],
  'Moons of Peril': ['Lunar Chests'],
  'The Nightmare': ['Nightmare', "Phosani's Nightmare"],
  'The Gauntlet': ['The Gauntlet', 'The Corrupted Gauntlet'],
  'Barrows Chests': ['Barrows Chests'],
  'Guardians of the Rift': ['Rifts closed'],
  'Beginner Treasure Trails': ['Clue Scrolls (beginner)'],
  'Easy Treasure Trails': ['Clue Scrolls (easy)'],
  'Medium Treasure Trails': ['Clue Scrolls (medium)'],
  'Hard Treasure Trails': ['Clue Scrolls (hard)'],
  'Elite Treasure Trails': ['Clue Scrolls (elite)'],
  'Master Treasure Trails': ['Clue Scrolls (master)'],
  'Chambers of Xeric': ['Chambers of Xeric', 'Chambers of Xeric: Challenge Mode'],
  'Theatre of Blood': ['Theatre of Blood', 'Theatre of Blood: Hard Mode'],
  'Tombs of Amascut': ['Tombs of Amascut', 'Tombs of Amascut: Expert Mode'],
};

/** Kill count for a collection log page, from synced hiscores. */
export function pageKc(j: Journal, page: string): number | null {
  const names = KC_ALIASES[page] ?? [page];
  let total = 0, found = false;
  for (const n of names) {
    const a = j.hiscores.activities.find(x => x.name.toLowerCase() === n.toLowerCase());
    if (a && a.score >= 0) { total += a.score; found = true; }
  }
  return found ? total : null;
}

export type DropRow = [name: string, qty: string, rarity: string, p: number | null, img: string];
export type DropSource = {t: string; u: string; tabs: {h: string; r: DropRow[]}[]};
export type SourceRateDetail={source:string;rate:string;quantity?:string;conditions?:string};
export type ItemRate = {sourceDetails?:SourceRateDetail[];r?: string; p?: number | null; s?: string; all?: [string, string][]; kcSource?:string; status?:string; url?:string; revision?:number; checkedAt?:string; acquisition?:string[]; note?:string};
export type PageDrops = {error?:string;sources: DropSource[]; items: Record<string, ItemRate>};

const pageCache = new Map<string, Promise<PageDrops>>();
const pageCachedAt = new Map<string, number>();
export function loadPageDrops(page: string, itemIds: number[]): Promise<PageDrops> {
  const key = page + '|' + itemIds.join(',');
  if (Date.now() - (pageCachedAt.get(key) ?? 0) >= 60_000) pageCache.delete(key);
  if (!pageCache.has(key)) {
    const req = fetch('/api/drops?' + new URLSearchParams({page, items: itemIds.join(',')}))
      .then(r => { if (!r.ok) throw Error('Could not load drop data.'); return r.json() as Promise<PageDrops>; })
      .catch(e => { pageCache.delete(key); throw e; });
    pageCache.set(key, req);
    pageCachedAt.set(key, Date.now());
  }
  return pageCache.get(key)!;
}

/** Completion colour: red at 0%, through orange and yellow, to green at 100%. */
export function progColor(done: number, total: number) {
  const f = total > 0 ? Math.max(0, Math.min(1, done / total)) : 0;
  if (f >= 1) return 'hsl(128 62% 46%)';
  const hue = 4 + f * 104; // 4 (red) → 108 (yellow-green) before full completion
  return `hsl(${hue.toFixed(0)} 82% ${(50 + f * 4).toFixed(0)}%)`;
}
