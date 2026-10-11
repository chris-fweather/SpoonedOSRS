import type {ReactNode} from 'react';
import {Count,Meter} from './Meter';
import {num} from '@/lib/ui';
export function ProgressHeader({icon,kicker,done,total,extra,remaining=true}:{icon:string;kicker:string;done:number;total:number;extra?:ReactNode;remaining?:boolean}) {
 return <div className="score-head"><img src={icon} alt=""/><span className="kicker">{kicker}</span><span className="score-read"><b className="frac"><Count done={done} total={total}>{num(done,0)}</Count><small>/{num(total,0)}</small></b><Meter done={done} total={total}/>{remaining&&<small className="remaining-count">{num(Math.max(0,total-done),0)} left</small>}{extra}</span></div>;
}
