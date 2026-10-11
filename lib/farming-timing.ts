import type {Method} from './model';

/** Full routes revisit the same patches; trees grow concurrently, not sequentially. */
export function farmingRoute(method?:Method) {
 if(method?.unit!=='XP')return null;
 if(method.name==='Farming runs'&&method.source.startsWith('Mixed tree-run estimate:'))return {xp:6*(13913.8+10260.6),description:'6 magic + 6 palm trees',growthHours:16};
 if(method.name==='Fruit-tree runs'&&method.source.startsWith('Fruit-tree estimate:'))return {xp:6*10260.6,description:'6 palm trees',growthHours:16};
 return null;
}
export function validFarmingSchedule(value:unknown):boolean {
 return value==null||(typeof value==='number'&&Number.isFinite(value)&&value>=0.01&&value<=1.5);
}
/** Long-run planning approximation, never a reconstruction of the date a pet was obtained. */
export function farmingTiming(method?:Method) {
 const route=farmingRoute(method);
 if(!route||!validFarmingSchedule(method?.farmingRunsPerDay))return null;
 const runsPerDay=method?.farmingRunsPerDay??1;
 const activeHoursPerRun=method?.kph&&Number.isFinite(method.kph)&&method.kph>0?route.xp/method.kph:null;
 const intervalHours=Math.max(24/runsPerDay,route.growthHours,activeHoursPerRun??0);
 const runs=method?.rate&&Number.isFinite(method.rate)&&method.rate>0?method.rate/route.xp:null;
 return {...route,runsPerDay,example:method?.farmingRunsPerDay==null,activeHoursPerRun,xpPerDay:route.xp*24/intervalHours,meanDays:runs==null?null:runs*intervalHours/24};
}
