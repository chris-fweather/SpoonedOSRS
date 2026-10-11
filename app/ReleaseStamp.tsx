import {CalendarDays} from 'lucide-react';
import {releaseDate,releaseLabel} from '@/lib/release-dates';
import './release-stamp.css';

/** Muted release metadata shared by boss and pet previews. */
export function ReleaseStamp({name,kind}:{name:string;kind:'pets'|'bosses'}) {
 const date=releaseDate(name,kind);if(!date)return null;
 return <span className="release-stamp"><CalendarDays size={12} aria-hidden="true"/><span>{kind==='pets'?'Pet':'Boss'} released · <time dateTime={date}>{releaseLabel(name,kind)}</time></span></span>;
}
