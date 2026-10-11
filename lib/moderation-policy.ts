import type {StaffRole} from './staff-policy';
export type AccountRisk={pets:number;log:number;recordHolder:boolean;staffOwned:boolean;unknown:boolean};
export function protectionReasons(r:AccountRisk){return [r.pets>=50?'50+ pets':null,r.log>=500?'500+ collection slots':null,r.recordHolder?'Record holder':null,r.staffOwned?'Staff-owned account':null,r.unknown?'Progress not verified':null].filter((s):s is string=>!!s);}
export function canSubmitCase(role:StaffRole,protectedAccount:boolean){return role!=='helper'||!protectedAccount;}
export function canReviewCase(role:StaffRole,protectedAccount:boolean,actor:string,creator:string,source:string|null,target:string|null){return actor!==creator&&actor!==source&&actor!==target&&(role==='owner'||role==='admin'||role==='moderator'&&!protectedAccount);}
export function validDiscordId(value:unknown):value is string{return typeof value==='string'&&/^[0-9]{17,20}$/.test(value)&&BigInt(value)>BigInt(0)&&BigInt(value)<=BigInt('18446744073709551615');}
