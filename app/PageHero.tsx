import type {ReactNode} from 'react';
import './page-hero.css';
/** The banner at the top of a community page: the castle art behind a kicker, the page title with its icon, one line of text and the page's actions, with Rocky on the right. */
export function PageHero({kicker,icon,title,text,actions}:{kicker:string;icon:string;title:string;text:string;actions?:ReactNode}){
 return <header className="page-hero">
  <div className="page-hero-text"><span className="kicker">{kicker}</span><h1><img className="page-title-icon" src={icon} alt=""/>{title}</h1><p>{text}</p>{actions&&<div className="page-hero-actions">{actions}</div>}</div>
  <img className="page-hero-art" src="/brand/rocky-mascot.webp" alt=""/>
 </header>;
}
