'use client';
import {HoverTip} from './HoverTip';
import './feature-links.css';
export function FeatureLinks({page}:{page?:string}) {
 return <>{[{path:'',label:'Home',image:'/brand/rocky-mascot.webp',key:'home'},{path:'leaderboard',label:'Leaderboard',image:'/icons/navigation/stats-icon.png',key:'leaderboard'},{path:'guides',label:'Guides',image:'/icons/navigation/collection-log-icon.png',key:'guides'},{path:'support',label:'Support',image:'/icons/community/support-coins.png',key:'support'}].map(({path,label,image,key})=><HoverTip key={key} className="feature-nav-wrap" touchPreview={false} label={label} tabIndex={-1}><a className="btn sm ghost feature-nav-icon" href={'/'+path} aria-label={label} aria-current={page===key?'page':undefined}><img src={image} alt=""/><span className="feature-nav-label">{label}</span></a></HoverTip>)}</>;
}
