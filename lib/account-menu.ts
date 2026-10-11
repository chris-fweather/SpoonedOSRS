import type {StaffRole} from './staff-policy';
import {DEFAULT_APPEARANCE,parseAppearance,type Appearance} from './appearance';
import {selectedTitle,type Donation} from './presentation';
import {displayTitle} from './flair';
import type {Journal} from './model';
export type LinkedMenuAccount={name:string;portrait:string;title:string|null;achievementTitle:string|null;donation:Donation};
export function characterPortrait(appearance:Appearance){const a=parseAppearance(appearance);return `/portraits/${a.body}-${a.hair}-${a.skin??'default'}.svg?v=jaw3`;}
export function menuAccount(input:{supporter?:boolean;name:string;appearance?:Appearance;title:string|null;choice:string;mark:string|null;owner:boolean;role?:StaffRole|null;donation:Donation;journal:Journal}):LinkedMenuAccount{return {name:input.name,portrait:characterPortrait(input.appearance??DEFAULT_APPEARANCE),title:displayTitle(input.name,input.title),achievementTitle:selectedTitle(input.journal,input.choice,input.mark,input.owner,input.supporter??displayTitle(input.name,input.title)==='the Generous',input.role),donation:input.donation};}
