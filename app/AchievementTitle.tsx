'use client';
import {achievementDescription,titleEffect} from '@/lib/presentation';
import './title-rarities.css';
import {HoverTip} from './HoverTip';

/** Profiles show title help; compact community rows show only the title. */
export function AchievementTitle({label,className='',showHelp=true}:{label:string;className?:string;showHelp?:boolean}) {
 if(!showHelp)return <span className={`achievement-title ${className}`}><span className={`achievement-text ${titleEffect(label)}`}>{label}</span></span>;
 const description=achievementDescription(label);
 return <span className={`achievement-title ${className}`}><HoverTip className="achievement-help" label={`${label}: ${description}`} content={<span className="achievement-tooltip-content"><strong className="tooltip-heading">{label}</strong><span>{description}</span></span>}><span className={`achievement-text ${titleEffect(label)}`}>{label}</span></HoverTip></span>;
}
