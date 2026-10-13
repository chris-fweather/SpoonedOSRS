import {db} from './storage';
import {discordAvatarUrl} from './session';
import {hasGildedSupporter,supporterTitle} from './staff-appearance';
import type {StaffRole} from './staff-policy';

/** How a person shows on the site: their main RuneScape name with its scimitar, Sir and the Generous. */
export type PersonDisplay={rsn:string;prefix:'Sir'|null;displayRole:StaffRole|null;generous:boolean;supporter:boolean;gilded:boolean};
/** A Discord account named in the staff portal: Discord names and avatar, staff rank, linked names and site display. */
export type StaffPerson={id:string;name:string;username:string;avatarUrl:string|null;role:StaffRole|null;names:string[];display:PersonDisplay|null};
type Row={discord_id:string;username:string;global_name:string|null;avatar:string|null;role:StaffRole|null;member_prefix:string|null;names:string;main_name:string|null;staff_prefix:string|null;staff_badge:string|null;show_donation:number|null;amount_minor:number|null;currency:string|null};
const RANKS:StaffRole[]=['helper','moderator','admin','owner'];

/** Staff portal only. The main name is the first one the account linked; hidden supporter totals only decide the
 * title and scimitar, they are never returned. */
export async function staffPeople(ids:(string|null|undefined)[]):Promise<StaffPerson[]>{
 const wanted=[...new Set(ids.filter((id):id is string=>!!id&&/^\d{5,32}$/.test(id)))].slice(0,100);
 if(!wanted.length)return [];
 const rows=await db().prepare(`SELECT u.discord_id,u.username,u.global_name,u.avatar,s.role,s.prefix AS member_prefix,
  (SELECT json_group_array(display_name) FROM (SELECT display_name FROM claimed_names WHERE discord_id=u.discord_id ORDER BY claimed_at,rsn)) AS names,
  m.display_name AS main_name,pp.staff_prefix,pp.staff_badge,pp.show_donation,st.amount_minor,st.currency
  FROM users u LEFT JOIN staff_members s ON s.discord_id=u.discord_id
  LEFT JOIN claimed_names m ON m.rsn=(SELECT rsn FROM claimed_names WHERE discord_id=u.discord_id ORDER BY claimed_at,rsn LIMIT 1)
  LEFT JOIN profile_presentation pp ON pp.rsn=m.rsn LEFT JOIN profile_supporter_totals st ON st.rsn=m.rsn
  WHERE u.discord_id IN (${wanted.map(()=>'?').join(',')})`).bind(...wanted).all<Row>();
 return rows.results.map(r=>{
  const role=RANKS.includes(r.role as StaffRole)?r.role:null;
  const badge=RANKS.includes(r.staff_badge as StaffRole)?r.staff_badge as StaffRole:null;
  const donation={amountMinor:r.amount_minor,currency:r.currency??'USD',hidden:r.show_donation===0};
  return {id:r.discord_id,name:r.global_name||r.username,username:r.username,avatarUrl:r.avatar?discordAvatarUrl(r.discord_id,r.avatar):null,role,names:JSON.parse(r.names) as string[],
   display:r.main_name?{rsn:r.main_name,prefix:role&&(r.staff_prefix??r.member_prefix)==='Sir'?'Sir':null,displayRole:role==='owner'&&badge?badge:null,
    generous:!!supporterTitle(r.amount_minor,r.currency),supporter:(r.amount_minor??0)>0,gilded:r.staff_badge==='gilded'&&hasGildedSupporter(donation)}:null};
 });
}
