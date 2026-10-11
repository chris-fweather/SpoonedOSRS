import raw from './skill-pet-rates.json';
export type WikiMethod = {name: string; base: number; level: number; link: string; xp: number | null; xpSource: string | null};
type WikiPet = {skill: string; methods: WikiMethod[]};
const data = raw as {formula: string; exceptions: string[]; pets: Record<string, WikiPet>};

export const skillPetFormula = data.formula;

function norm(s: string) {
  return s.toLowerCase().replace(/\s*\(\d+(?:\.\d+)?t\)/g, '').replace(/\blogs?\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
}
const ALIAS: Record<string, string> = {
  'artic pine': 'arctic pine',
  sulliuscep: 'sulliusceps',
  zmi: 'ourania altar',
  'true blood altar': 'blood rune',
  'ardougne knights': 'pickpocketing not specified',
};

export function methodWiki(link: string) {
  const hashAt = link.indexOf('#');
  const page = hashAt < 0 ? link : link.slice(0, hashAt);
  const hash = hashAt < 0 ? '' : link.slice(hashAt);
  return 'https://oldschool.runescape.wiki/w/' + encodeURIComponent(page.replaceAll(' ', '_')) + hash;
}

export function wikiMethod(petName: string, methodName: string): WikiMethod | null {
  const pet = data.pets[petName];
  if (!pet) return null;
  const key = ALIAS[norm(methodName)] ?? norm(methodName);
  const same = (m: WikiMethod) => (ALIAS[norm(m.name)] ?? norm(m.name)) === key;
  return pet.methods.find(same) ?? null;
}

/** Denominator is base − 25×level, except Minnow and Fishing Trawler. Two decimal places, Jagex-style. */
export function atLevel(m: WikiMethod, level: number) {
  const exception = data.exceptions.includes(m.name);
  const denom = exception ? m.base : m.base - 25 * level;
  if (!(denom > 0)) return null;
  const actions = Math.floor(denom * 100) / 100;
  return {actions, denom, xpEach: m.xp, expectedXp: m.xp == null ? null : actions * m.xp, exception};
}

