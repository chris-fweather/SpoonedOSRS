/** Narrow read-only service authentication; never accepts role grants from Discord. */
export type DiscordEntitlement={id:string;roles:string[];nickname:string|null};
export function discordEntitlement(row:{id:string;role:string|null;supporter:number;nickname:string|null}):DiscordEntitlement {
 const roles=['helper','moderator','admin','owner'].includes(row.role??'')?[row.role!]:[];
 if(row.supporter===1)roles.push('supporter');
 return {id:row.id,roles,nickname:row.nickname&&/^[A-Za-z0-9 _-]{1,12}$/.test(row.nickname)?row.nickname:null};
}
export {verifySignedGet as verifyRoleSync} from './signed-request';
