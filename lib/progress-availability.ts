import type {Journal} from './model';
/** A blank catalogue is unknown progress, not evidence that every collectible is missing. */
export function progressAvailability(j:Journal){return {
 pets:!!j.log||!!j.logSyncedAt||j.pets.some(p=>p.obtained||p.source==='Manual update'),
 log:!!j.log,
 quests:!!j.profile?.quests.length,
 diaries:!!j.profile?.diaries.length,
 combat:!!j.profile?.combat.length,
 stats:j.hiscores.skills.length>0,
 attempts:j.pets.some(p=>p.recordedHours!=null||p.methods.some(m=>m.kc!=null)),
};}
