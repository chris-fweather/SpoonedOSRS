import {progColor} from '@/lib/ui';
/** Completion bar coloured by how complete it is (red → yellow → green). */
export function Meter({done, total, className = '', unknown = false}: {done: number; total: number; className?: string; unknown?: boolean}) {
  if (unknown) return <span className={`meter unknown ${className}`} aria-label="Progress not known"><b/></span>;
  const pct = total > 0 ? Math.min(100, done / total * 100) : 0;
  return <span className={`meter ${className}`}><b style={{width: `${pct}%`, background: progColor(done, total)}}/></span>;
}
/** Text coloured on the same scale, for counts like 4/9. */
export function Count({done, total, children}: {done: number; total: number; children?: React.ReactNode}) {
  return <span style={{color: progColor(done, total)}}>{children ?? `${done}/${total}`}</span>;
}
