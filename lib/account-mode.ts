export const ACCOUNT_MODES={normal:'Main account',ironman:'Ironman',hardcore_ironman:'Hardcore Ironman',ultimate_ironman:'Ultimate Ironman',group_ironman:'Group Ironman',hardcore_group_ironman:'Hardcore Group Ironman',unranked_group_ironman:'Unranked Group Ironman'} as const;
export type AccountMode=keyof typeof ACCOUNT_MODES;
/** Only provider enums are accepted. No inference from a name or ordinary Hiscores rank. */
export function accountMode(value:unknown):AccountMode|null {
 const key=typeof value==='string'?value:value&&typeof value==='object'&&'key' in value?(value as {key:unknown}).key:null;
 if(typeof key!=='string')return null;
 const normalized=key.toLowerCase().replace(/[ -]/g,'_');
 return Object.hasOwn(ACCOUNT_MODES,normalized)?normalized as AccountMode:null;
}
