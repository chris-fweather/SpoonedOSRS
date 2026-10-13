'use client';
import {useEffect,useState,type ReactNode} from 'react';
import {ChevronDown,Database,Globe,Hammer,Server} from 'lucide-react';
import {PublicHeader,CommunityChat,SupporterList} from '../Community';
import {ProfileIdentity} from '../ProfileIdentity';
import {PageHero} from '../PageHero';
import {DiscordMark} from '../DiscordMark';
import type {BoardRow} from '@/lib/flair';
import './support.css';

const DISCORD_INVITE='https://discord.gg/spoonedosrs';
/** How a supporter's name reads on the site: the donor suffix and the Supporter title, plus the gilded scimitar from $100. */
const sample=(gilded:boolean)=><ProfileIdentity username="YourName" accountMode={null} staff={null} donation={{amountMinor:gilded?10000:1000,currency:'USD',hidden:false,badge:gilded?'gilded':null,supporter:true}} title="the Generous" earnedTitle="Supporter"/>;
/** The same supporter as a member of the Discord server's role list. */
function DiscordMember({gilded}:{gilded:boolean}){
 return <div className="support-discord" aria-label="Discord preview"><span className="support-discord-role">{gilded?'Gilded supporter':'Supporter'} — 1</span>
  <div className="support-discord-member"><span className="support-discord-avatar"><img src="/brand/rocky-mascot.webp" alt=""/></span><b className={gilded?'is-gilded':'is-silver'}>YourName</b><img className="support-discord-badge" src={gilded?'/icons/ranks/gilded-scimitar.png':'/icons/community/sponsor-coin.png'} alt=""/></div></div>;
}
const TIERS=[
 {id:'supporter',gilded:false,name:'Supporter',price:'Any amount',perks:['The silver coin beside your name','“the Generous” after your name','The Supporter title','A place on the Supporters board','The Supporter role on Discord']},
 {id:'gilded',gilded:true,name:'Gilded supporter',price:'$100 or more in total',perks:['Everything a supporter gets','The gilded scimitar in place of the coin','A gold name on Discord']},
];
const COSTS:[ReactNode,string,string][]=[[<Server key="s" size={20}/>,'Hosting','Every page, sync and board, served worldwide by Cloudflare.'],[<Database key="d" size={20}/>,'Database','Journals, boards and history, kept safe and backed up.'],[<Globe key="g" size={20}/>,'Domain','spoonedosrs.com, renewed every year.'],[<Hammer key="h" size={20}/>,'Time','New features, guides and fixes, built in the open.']];
const FAQ=[['Is anything locked behind a donation?','No. Every feature is free for everyone; supporter perks are cosmetic.'],['Can I keep the amount private?','Yes. Hide it in your account settings and only “Supporter” shows.'],['How is the gilded scimitar reached?','Your shown donations add up; it unlocks at $100 USD in total.'],['Where can I see who supports the site?','On the Supporters board, with each supporter’s titles and, if they choose, their total.'],['When do donations open?','Soon. Join the Discord to hear first.']];
/** Questions as an accordion: opening one closes the others. */
function Faq(){
 const [open,setOpen]=useState(0);
 return <div className="support-faq">{FAQ.map(([q,a],i)=><div key={q} className={'support-faq-item'+(open===i?' is-open':'')}><button type="button" aria-expanded={open===i} aria-controls={'faq-'+i} onClick={()=>setOpen(open===i?-1:i)}><span>{q}</span><ChevronDown size={18} aria-hidden="true"/></button><div id={'faq-'+i} role="region" hidden={open!==i}><p>{a}</p></div></div>)}</div>;
}

/** Why to support the site, how supporters look on the site and in Discord, where the money goes and who already supports it.
 * Donations are not open yet, so nothing here takes payment. */
export function SupportPage(){
 const [error,setError]=useState(''),[top,setTop]=useState<BoardRow[]|null>(null);
 useEffect(()=>{const abort=new AbortController();fetch('/api/leaderboard?metric=supporters&page=0',{signal:abort.signal}).then(r=>r.ok?r.json() as Promise<{rows?:BoardRow[]}>:{rows:[]}).then(d=>setTop((d.rows??[]).slice(0,5))).catch(()=>{if(!abort.signal.aborted)setTop([]);});return()=>abort.abort();},[]);
 return <div className="site"><PublicHeader page="support" onError={setError}/><main className="community-page support-page">{error&&<p role="alert">{error}</p>}
  <PageHero kicker="Keep the journal running" icon="/icons/community/support-coins.png" title="Support Spooned OSRS" text="Free for everyone, no ads, kept running by supporters." actions={<><button type="button" className="btn primary" disabled>Donations open soon</button><a className="btn" href={DISCORD_INVITE} target="_blank" rel="noreferrer"><DiscordMark/>Ask on Discord ↗</a></>}/>
  <div className="support-tiers">{TIERS.map(t=><section key={t.id} className={'community-panel support-tier'+(t.gilded?' is-gilded':'')}>
   <div className="support-tier-head"><div><h2>{t.name}</h2><span>{t.price}</span></div><img src={t.gilded?'/icons/ranks/gilded-scimitar.png':'/icons/community/sponsor-coin.png'} alt=""/></div>
   <div className="support-preview"><small>On the site</small>{sample(t.gilded)}</div>
   <div className="support-preview"><small>On Discord</small><DiscordMember gilded={t.gilded}/></div>
   <ul>{t.perks.map(p=><li key={p}>{p}</li>)}</ul>
  </section>)}</div>
  <div className="support-columns">
   <section className="community-panel support-where"><h2>Where it goes</h2><div className="support-costs">{COSTS.map(([icon,t,d])=><div key={t}><span className="support-cost-icon">{icon}</span><b>{t}</b><p>{d}</p></div>)}</div><p className="support-free"><img src="/icons/community/sponsor-coin.png" alt=""/>Every coin goes back into the site. No ads, ever.</p></section>
   <section className="community-panel support-top"><div className="section-heading"><h2>Top supporters</h2><a className="link" href="/leaderboard?view=supporters">All supporters →</a></div>
    {top===null?<p className="fine">Loading supporters…</p>:top.length?<SupporterList rows={top} pageSize={5}/>:<p className="fine">Be the first supporter.</p>}</section>
  </div>
  <section className="community-panel"><h2>Questions</h2><Faq/></section>
  <CommunityChat/>
 </main></div>;
}
