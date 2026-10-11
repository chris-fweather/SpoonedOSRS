import {env} from 'cloudflare:workers';
import type {PublicStaff} from './staff-policy';
import type {RateOverride} from './rate-catalogue';
export async function publicStaff(id:string):Promise<PublicStaff|null> {
 try {return await env.DB!.prepare('SELECT role,prefix FROM staff_members WHERE discord_id=?').bind(id).first<PublicStaff>();}
 catch(error){if(String(error).includes('no such table'))return null;throw error;}
}
export async function publicStaffList():Promise<Map<string,PublicStaff>> {
 try {const rows=await env.DB!.prepare('SELECT discord_id,role,prefix FROM staff_members').all<PublicStaff & {discord_id:string}>();return new Map(rows.results.map(r=>[r.discord_id,{role:r.role,prefix:r.prefix}]));}
 catch(error){if(String(error).includes('no such table'))return new Map();throw error;}
}
export async function reviewedRates():Promise<RateOverride[]> {
 try {return (await env.DB!.prepare("SELECT kind,target,payload,source,revision FROM staff_overrides WHERE kind='rate'").all<RateOverride>()).results;}
 catch(error){if(String(error).includes('no such table'))return [];throw error;}
}
