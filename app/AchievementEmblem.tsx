import {badgeTier,type Mark} from '@/lib/flair';
/** Tint the sprite itself; only complete pet/log collections use moving lava. */
export function AchievementEmblem({mark,className=''}:{mark:Mark;className?:string}) {
 const tier=badgeTier(mark.id),collection=mark.id.startsWith('pets-')||mark.id.startsWith('clog-');
 return <span className={`achievement-emblem ${tier} ${collection||mark.id.startsWith('combat-')?'collection-emblem':'plain-emblem'} ${mark.id==='max-cape'?'max-emblem':''} ${mark.id.startsWith('pets-')?'pet-emblem':''} ${className}`}><img src={mark.img} alt={mark.name}/>{collection&&tier==='legendary'&&<i aria-hidden="true" style={{maskImage:`url(${mark.img})`,WebkitMaskImage:`url(${mark.img})`}}/>}</span>;
}
