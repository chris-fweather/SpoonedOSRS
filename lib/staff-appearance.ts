import {STAFF_LABEL,type PublicStaff,type StaffRole} from './staff-policy';
import type {Donation} from './presentation';
/** Rank scimitars from the site icon pack; cosmetic style never grants a role. */
export const RANK_STYLE:Record<StaffRole,{src:string;label:string}>={
 helper:{src:'/icons/ranks/adamant-scimitar.png',label:'Adamant scimitar'},
 moderator:{src:'/icons/ranks/rune-scimitar.png',label:'Rune scimitar'},
 admin:{src:'/icons/ranks/dragon-scimitar.png',label:'Dragon scimitar'},
 owner:{src:'/icons/ranks/rank-owner.png',label:'Infernal dragon scimitar'},
};
/** Where the Owner blade's lava runs; the site flows a lava texture through it. */
export const OWNER_LAVA_MASK='/icons/ranks/rank-owner-lava.png';
export const GILDED_SUPPORTER_MINIMUM_USD=10_000;
/** Do not reveal a hidden total through a threshold badge or convert other currencies implicitly. */
export function hasGildedSupporter(donation?:Donation):boolean {
 return !!donation&&!donation.hidden&&donation.currency==='USD'&&donation.amountMinor!==null&&donation.amountMinor>=GILDED_SUPPORTER_MINIMUM_USD;
}

/** Public hover text describes the chosen cosmetic, never a different underlying role. */
export function displayedBadgeLabel(staff?:PublicStaff|null,donation?:Donation):string {
 if(donation?.badge==='gilded'&&hasGildedSupporter(donation))return 'Gilded supporter';
 return staff?'Site '+STAFF_LABEL[staff.displayRole??staff.role]:'';
}

/** Server-side eligibility; do not send hidden totals to the browser. */
export function supporterTitle(amount:number|null|undefined,currency:string|null|undefined){return currency==='USD'&&amount!=null&&amount>=1000?'the Generous':null;}
