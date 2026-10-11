import {Count,Meter} from './Meter';
/** The same count, bar and remaining text for log activities and combat cards. */
export function TileProgress({done,total,unit}:{done:number|null;total:number;unit:string}){
 return <><Meter done={done??0} total={total} unknown={done===null}/><small className="tile-progress-count" title={done===null?'Individual completion is unavailable.':undefined}>{done===null?<span>?/{total}</span>:<Count done={done} total={total}/>} {unit} · {done===null?'?':Math.max(0,total-done)} left</small></>;
}
