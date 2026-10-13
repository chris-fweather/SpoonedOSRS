import {mayReviewProposal} from './staff-policy';
import type {StaffRole} from './staff-policy';
export type AccountRisk={pets:number;log:number;recordHolder:boolean;staffOwned:boolean;unknown:boolean;boardTop?:boolean};
export function protectionReasons(r:AccountRisk){return [r.pets>=50?'50+ pets':null,r.log>=500?'500+ collection slots':null,r.recordHolder?'Record holder':null,r.boardTop?'Top 25 on a leaderboard':null,r.staffOwned?'Staff-owned account':null,r.unknown?'Progress not verified':null].filter((s):s is string=>!!s);}
export function canSubmitCase(role:StaffRole,protectedAccount:boolean){return role!=='helper'||!protectedAccount;}
/** Approving needs the ownership permission (moderators and up by default); a protected account always needs an admin or the owner.
 * Nobody decides a request they opened or that moves their own account. */
/** A second reviewer decides: never the opener or either account, only with approval access, an admin for protected accounts, and never someone below the opener's rank. */
export function canReviewCase(role:StaffRole,protectedAccount:boolean,actor:string,creator:string,source:string|null,target:string|null,mayApprove=role!=='helper',creatorRole:StaffRole|null=null){return actor!==creator&&actor!==source&&actor!==target&&mayApprove&&(role==='owner'||role==='admin'||!protectedAccount)&&mayReviewProposal(role,creatorRole);}
export function validDiscordId(value:unknown):value is string{return typeof value==='string'&&/^[0-9]{17,20}$/.test(value)&&BigInt(value)>BigInt(0)&&BigInt(value)<=BigInt('18446744073709551615');}
