import type {Journal} from './model';
import type {StoredFlair} from './flair';
import {progressAvailability} from './progress-availability';
export function shareProfileDetails(j:Journal,flair:StoredFlair){
 const known=progressAvailability(j),overall=j.hiscores.skills.find(s=>s.name==='Overall');
 const stats=j.restricted?[]:[
  ...(known.pets&&j.details?.pets!==false?[{label:'Pets collected',value:String(j.pets.filter(p=>p.obtained).length),total:String(j.pets.length)}]:[]),
  ...(known.log&&j.details?.log!==false&&j.log?[{label:'Collection log',value:j.log.obtained.toLocaleString('en-US'),total:j.log.total.toLocaleString('en-US')}]:[]),
  ...(overall&&j.details?.skills!==false?[{label:'Total level',value:overall.level.toLocaleString('en-US'),total:''}]:[])
 ];
 return {name:j.username,title:flair.title,achievementTitle:flair.showcase?.achievementTitle??null,
  status:j.restricted?'Private journal':stats.length?'The collector’s journal':'Collection not yet synced',stats,
  pet:flair.showcase?.pet??null};
}
