import type {ReactNode} from 'react';
import {STAFF_LABEL,STAFF_TONE,rankNameClass,type PublicStaff,type StaffRole} from '@/lib/staff-policy';
import type {PersonDisplay} from '@/lib/staff-people';
import {HoverTip} from './HoverTip';
import type {Donation} from '@/lib/presentation';
import {OWNER_LAVA_MASK,RANK_STYLE,hasGildedSupporter,displayedBadgeLabel} from '@/lib/staff-appearance';
/** Shared scimitar silhouette; lava flows through the Owner blade's cracks. */
export function RankIcon({staff}:{staff:PublicStaff}) {
 const role=staff.displayRole??staff.role,style=RANK_STYLE[role];
 return <span className={`rank-icon rank-${role}`} aria-hidden="true"><span className="rank-weapon"><img src={style.src} alt=""/>{role==='owner'&&<i className="rank-magma" style={{maskImage:`url(${OWNER_LAVA_MASK})`,WebkitMaskImage:`url(${OWNER_LAVA_MASK})`}}/>}</span></span>;
}
export function StaffBadge({staff}:{staff?:PublicStaff|null}) {return staff?<span className={'staff-badge '+STAFF_TONE[staff.role]}><RankIcon staff={staff}/>{STAFF_LABEL[staff.role]}</span>:null;}
/** A rank as its scimitar and the rank word in the rank colour, without a box. */
export function RankLabel({role}:{role:StaffRole}) {return <span className={'rank-label '+STAFF_TONE[role]}><RankIcon staff={{role,prefix:null}}/>{STAFF_LABEL[role]}</span>;}
export function StaffPrefix({staff,donation,showHelp=true}:{staff?:PublicStaff|null;donation?:Donation;showHelp?:boolean}) {
 const wrap=(content:ReactNode,label:string)=>showHelp?<HoverTip className="staff-rank" label={label}>{content}</HoverTip>:<span className="staff-rank">{content}</span>;
 const gilded=donation?.badge==='gilded'&&hasGildedSupporter(donation);
 const badge=gilded?<GildedIcon/>:staff?<RankIcon staff={staff}/>:donation?.supporter?<SupporterIcon/>:null;
 const description=displayedBadgeLabel(staff,donation);
 return badge?wrap(<>{badge}{staff?.displayPrefix&&<span className="staff-word">{staff.displayPrefix}</span>}</>,description):null;
}
/** Every supporter's coin, as thanks; gilded supporters and staff show their scimitar instead. */
export function SupporterIcon(){return <span className="rank-icon rank-supporter" aria-hidden="true"><span className="rank-weapon"><img src="/icons/community/sponsor-coin.png" alt=""/></span></span>;}
export function GildedIcon(){return <span className="rank-icon rank-gilded" aria-hidden="true"><span className="rank-weapon"><img src="/icons/ranks/gilded-scimitar.png" alt=""/></span></span>;}
/** A staff member's name in their rank colour with their scimitar in front; no rank word, the scimitar says it. */
export function StaffName({name,role}:{name:string;role?:StaffRole|null}){return role&&role in STAFF_LABEL?<span className={'staff-name '+STAFF_TONE[role]} title={STAFF_LABEL[role]}><RankIcon staff={{role,prefix:null}}/><b>{name}</b></span>:<span className="staff-name"><b>{name}</b></span>;}
/** A person in the staff portal: scimitar (or supporter coin) and their main RuneScape name in their rank colour (no Sir or
 * donor title there); their Discord name when they have no linked name. */
export function PersonName({person,fallback,role}:{person?:{name:string;role:StaffRole|null;display:PersonDisplay|null}|null;fallback?:string;role?:StaffRole|null}){
 const d=person?.display,rank=person?.role??role??null;
 if(!d)return <StaffName name={person?.name??fallback??'Unknown'} role={rank}/>;
 const staff=rank?{role:rank,prefix:null,displayRole:d.displayRole}:null;
 return <span className="person-name">{d.gilded?<GildedIcon/>:staff?<RankIcon staff={staff}/>:d.supporter?<SupporterIcon/>:null}<b className={rankNameClass(staff)}>{d.rsn}</b></span>;
}
