import raw from './petcord-driest.json' with {type: 'json'};

/** Community driest-streak record. The sheet's rarity string is kept in the JSON and is not a drop rate. */
export type DriestRecord = {
  pet: string;
  username: string;
  count: number;
  unit: string;
  date: string | null;
  note?: string;
  likelihood?: string;
  proof: string | null;
  clog: string | null;
};

type RawRecord = DriestRecord & {rarity?: string};
type RawFile = {source: string; sheet: string; records: RawRecord[]};

const data = raw as RawFile;
const byName = new Map(data.records.map(record => [record.pet.toLowerCase(), record]));

export const PETCORD_SOURCE = data.source;
export const PETCORD_SHEET = data.sheet;

function https(url: string | null | undefined): string | null {
  return typeof url === 'string' && /^https:\/\//.test(url) ? url : null;
}

/** Record for a pet name already used in the journal. Case-insensitive. Pets with no record return null. */
export function driestRecord(petName: string): DriestRecord | null {
  const row = byName.get(petName.toLowerCase());
  if (!row) return null;
  return {
    pet: row.pet,
    username: row.username,
    count: row.count,
    unit: row.unit,
    date: row.date,
    note: row.note,
    likelihood: row.likelihood,
    proof: https(row.proof),
    clog: https(row.clog),
  };
}
