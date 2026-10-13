"use client";
import {useEffect,useState} from 'react';
type Listed={id:string;guide:{title:string;activity:string}};
let cache:Promise<Listed[]>|null=null;
/** Published guides, fetched once per page view and shared by every link. */
function publishedGuides(){return cache??=fetch('/api/guides').then(r=>r.ok?r.json() as Promise<{guides:Listed[]}>:{guides:[]}).then(d=>d.guides).catch(()=>[]);}
/** "Read our guide" for a boss or activity, shown only when a published guide covers it. */
export function GuideLink({activity,compact=false}:{activity?:string|null;compact?:boolean}){
 const [guide,setGuide]=useState<Listed|null>(null);
 useEffect(()=>{if(!activity)return;let live=true;const a=activity.trim().toLowerCase();void publishedGuides().then(list=>{if(live)setGuide(list.find(g=>g.guide.activity.trim().toLowerCase()===a)??null);});return()=>{live=false;};},[activity]);
 if(!guide)return null;
 return <a className={'btn sm guide-link'+(compact?' is-compact':'')} href={'/guides?guide='+encodeURIComponent(guide.id)} title={guide.guide.title}><img src="/icons/navigation/collection-log-icon.png" alt=""/>{compact?'Guide':'Read our guide'}</a>;
}
