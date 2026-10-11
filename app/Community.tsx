'use client';
import {lazy, Suspense, useEffect, useId, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {lockPageScroll} from '@/lib/scroll-lock';
import './community-join.css';
import {DiscordMark} from './DiscordMark';
import './community-rows.css';
import './collector-preview.css';
import {Check, Copy, X} from 'lucide-react';
const loadPreviewModule=()=>import('./CollectorPreview');
const CollectorPreview=lazy(()=>loadPreviewModule().then(module=>({default:module.CollectorPreview})));
import {loadCollectorPreview} from '@/lib/collector-preview-cache';
import {FeatureLinks} from './FeatureLinks';
import {HeaderNavigation} from './HeaderNavigation';
import {Pagination} from './Pagination';
import type {BoardRow} from '@/lib/flair';
import {BOARD_METRICS, COMMUNITY_NAME, metricValue, rankedPlayers, rankedSupporters, communityPage, comparisonSeries, type BoardMetric} from '@/lib/community';
import {num} from '@/lib/ui';
import {PlayerSearch, SiteAuth, SiteBrand} from './SiteHeader';
import {FittedScore} from './FittedScore';
import {AchievementTitle} from './AchievementTitle';
import {AccountModeBadge} from './AccountModeBadge';
import {StaffPrefix} from './StaffBadge';
import {CommunityDistribution} from './CommunityDistribution';

export function PublicHeader({page, onError}: {page?: string; onError: (message: string) => void}) {
  return <header className="hdr"><div className="hdr-in"><SiteBrand/><PlayerSearch/><HeaderNavigation><FeatureLinks page={page}/><SiteAuth onError={onError}/></HeaderNavigation></div></header>;
}
export function useCommunity(options?:{metric:string;skill:string;query:string;page:number}) {
  const [totals,setTotals]=useState<{journals:number;pets:number;log:number}|null>(null);
  const [paging,setPaging]=useState({pages:1,page:0});
  const url=options?'/api/leaderboard?'+new URLSearchParams({metric:options.metric,skill:options.skill,q:options.query,page:String(options.page)}):'/api/leaderboard';
  const [rows, setRows] = useState<BoardRow[] | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    setError('');
    let latest=0;
    const refresh=()=>{
      const request=++latest;
      fetch(url, {signal: abort.signal}).then(async r => {
        const data = await r.json() as {rows?: BoardRow[]; error?: string;totals:typeof totals;pages?:number;page?:number};
        if (!r.ok) throw Error(data.error || 'Community data is unavailable.');
        if(request===latest){setRows(data.rows ?? []);setTotals(data.totals);setPaging({pages:data.pages??1,page:data.page??0});setError('');}
      }).catch(e => {if (!abort.signal.aborted&&request===latest) setError(e.message);});
    };
    setRows(null);
    const timer=setTimeout(refresh,options?.query?200:0);
    return () => {clearTimeout(timer);abort.abort();};
  }, [retry,url]);
  return {rows, totals, paging, error, setError, retry: () => setRetry(n => n + 1)};
}
export function CommunityStatus({rows, error, retry}: {rows: BoardRow[] | null; error: string; retry: () => void}) {
  if (error) return <div className="community-notice" role="alert">{error} <button className="link" onClick={retry}>Try again</button></div>;
  if (!rows) return <p className="community-notice" role="status">Loading community progress…</p>;
  if (!rows.length) return <p className="community-notice">Be the first on the board. Sign in, link your account and sync your progress.</p>;
  return null;
}
export function CommunityTotals({rows,totals}: {rows: BoardRow[] | null;totals?:{journals:number;pets:number;log:number}|null}) {
  const total = (metric: BoardMetric) => {
    const values = rows?.map(r=>metricValue(r,metric)).filter((n):n is number=>n!==null);
    return values?.length ? values.reduce((a,b)=>a+b,0) : rows?.length===0 ? 0 : null;
  };
  const cards = [{label: 'Public journals', value: totals?.journals??rows?.length, icon: '/icons/navigation/stats-icon.png'}, {label: 'Pets collected', value: totals?.pets??total('pets'), icon: '/brand/rocky-mascot.webp'}, {label: 'Log slots unlocked', value: totals?.log??total('log'), icon: '/icons/navigation/collection-log-icon.png'}];
  return <div className="community-totals">{cards.map(c => <div key={c.label}><img src={c.icon} alt=""/><span><strong>{c.value == null ? '—' : num(c.value, 0)}</strong><small>{c.label}</small></span></div>)}</div>;
}
export function CommunityChat() {return <ProfileChat embedded/>;}
function ChatGuideContent(){return <div><figure><img src="/ui/friends-chat-example.png" alt="OSRS Friends Chat interface example from the Wiki"/><figcaption>Yellow tab: Friends Chat · Blue tab: Clan. In-game interface example from the OSRS Wiki.</figcaption></figure><section><h3><img src="/icons/community/friends-chat.png" alt=""/> Friends Chat</h3><ol><li>Open the tab with the Friends Chat icon above.</li><li>Choose <b>Join Chat</b> and enter <b>SpoonedOSRS</b>.</li><li>Type <code>/ Hello!</code> (one slash) to speak in Friends Chat.</li></ol><h3><img src="/icons/community/clan-chat.png" alt=""/> Clan Chat as a guest</h3><ol><li>Open the Clan tab and switch to the guest chat panel.</li><li>Use <b>Find</b> to search for <b>SpoonedOSRS</b>, then join as a guest.</li><li>Type <code>/// Hello!</code> (three slashes) to speak as a guest.</li></ol><p>Already a clan member? Use <code>// Hello!</code> (two slashes) for your own clan chat.</p><p><a href="https://oldschool.runescape.wiki/w/Chat-channel" target="_blank" rel="noreferrer">Friends Chat guide ↗</a> · <a href="https://oldschool.runescape.wiki/w/Clan" target="_blank" rel="noreferrer">Clan guide ↗</a></p></section></div>;}
function CopyChatNameButton({label='Copy name'}:{label?:string}) {
 const [status,setStatus]=useState<'idle'|'copied'|'failed'>('idle');
 useEffect(()=>{if(status==='idle')return;const timer=setTimeout(()=>setStatus('idle'),2200);return()=>clearTimeout(timer);},[status]);
 return <button className={`btn sm chat-copy ${status}`} style={{minWidth:label==='Copy chat name'?145:118}} onClick={async()=>{try{await navigator.clipboard.writeText(COMMUNITY_NAME);setStatus('copied');}catch{setStatus('failed');}}} title={status==='failed'?'Copy unavailable. The chat name is SpoonedOSRS.':undefined}>
  {status==='copied'?<Check size={14}/>:<Copy size={14}/>}<span role="status">{status==='copied'?'Copied':status==='failed'?'Copy failed':label}</span>
 </button>;
}
export function ProfileChat({embedded=false}:{embedded?:boolean}) {
 const [guide,setGuide]=useState<'game'|'discord'|null>(null),id=useId();
 return <><aside id="join-in-game" className={`profile-chat community-join-cards ${embedded?'embedded':''}`} aria-label="Join the Spooned OSRS community">
  <section className="community-join-section community-game" aria-label="Join us in game">
   <div className="profile-chat-heading"><strong><img className="community-heading-icon" src="/icons/community/game-chat.png" alt=""/> Join us in game</strong><span><img src="/icons/community/friends-chat.png" alt=""/> Friends Chat <i>+</i><img src="/icons/community/clan-chat.png" alt=""/> Clan Chat</span></div>
   <div className="community-join-actions"><button type="button" className="profile-chat-toggle" aria-haspopup="dialog" aria-expanded={guide==='game'} aria-controls={guide==='game'?id:undefined} onClick={()=>setGuide('game')}>How to join →</button><CopyChatNameButton/></div>
  </section>
  <section className="community-join-section community-discord" aria-label="Spooned OSRS on Discord">
   <div className="profile-chat-heading"><strong><DiscordMark/> Join our Discord</strong></div>
   <p className="discord-community-caption">Share your pets, meet collectors &amp; site updates.</p>
   <div className="community-join-actions"><button type="button" className="profile-chat-toggle" aria-haspopup="dialog" aria-expanded={guide==='discord'} aria-controls={guide==='discord'?id:undefined} onClick={()=>setGuide('discord')}>How to join →</button><a className="btn sm discord-join-button" href="https://discord.gg/spoonedosrs" target="_blank" rel="noreferrer"><DiscordMark/> Join server ↗</a></div>
  </section>
 </aside>{guide&&<JoinGuideDialog id={id} destination={guide} onClose={()=>setGuide(null)}/>}</>;

}
function JoinGuideDialog({id,destination,onClose}:{id:string;destination:'game'|'discord';onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{
  const el=dialog.current,previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
  const restore=lockPageScroll();el?.showModal();
  return()=>{el?.close();restore();previous?.focus({preventScroll:true});};
 },[]);
 return createPortal(<dialog ref={dialog} id={id} className="community-join-dialog" aria-labelledby={`${id}-title`} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target!==e.currentTarget)return;const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)onClose();}}>
  <header><div><h2 id={`${id}-title`}>Join Spooned OSRS {destination==='game'?'in game':'on Discord'}</h2><p>{destination==='game'?'Find us in Friends Chat or visit the clan as a guest.':'Meet the community, share your collection and keep up with the site.'}</p></div><button type="button" className="icon-btn" aria-label="Close joining guide" autoFocus onClick={onClose}><X size={19}/></button></header>
  <div className="join-guide-body">{destination==='game'?<ChatGuideContent/>:<DiscordGuideContent/>}</div>
  <footer>{destination==='game'?<CopyChatNameButton label="Copy chat name"/>:<a className="btn discord-guide-join" href="https://discord.gg/spoonedosrs" target="_blank" rel="noreferrer"><DiscordMark/> Join server ↗</a>}<button type="button" className="btn" onClick={onClose}>Close</button></footer>
 </dialog>,document.body);
}
function DiscordGuideContent(){
 const [copied,setCopied]=useState(false),[copyError,setCopyError]=useState(false);
 return <div className="discord-guide-content"><figure className="discord-client-example"><div className="discord-example-title"><DiscordMark/><b>Join a Server</b></div><p>Enter an invite to join your friends.</p><div className="discord-example-dialog"><small>Invite link</small><code>discord.gg/spoonedosrs</code><span className="discord-example-action primary">Join Server</span></div><figcaption>Discord client · invite screen example</figcaption></figure><section><h3><DiscordMark/> Join in Discord</h3><ol><li>Choose <b>+</b> in the server list.</li><li>Under “Have an invite already?”, choose <b>Join a Server</b>.</li><li>Paste the invite below and choose <b>Join Server</b>.</li></ol><div className="discord-invite-copy"><code>discord.gg/spoonedosrs</code><button className="btn sm" aria-label="Copy Discord invite" onClick={async()=>{try{await navigator.clipboard.writeText('https://discord.gg/spoonedosrs');setCopied(true);setCopyError(false);}catch{setCopyError(true);}}}><Copy size={14}/><span role="status">{copied?'Copied':'Copy'}</span></button></div>{copyError&&<p role="status">Copy unavailable. Use discord.gg/spoonedosrs.</p>}<p>Follow the welcome and rules prompts once you join.</p><a className="link" href="https://support.discord.com/hc/en-us/articles/360034842871-How-do-I-join-a-Server" target="_blank" rel="noreferrer">Discord’s joining guide ↗</a></section></div>;
}
const PODIUM=['Gold','Silver','Bronze'];
/** Board ranks 1–3 get a gold, silver or bronze crown beside the name and a matching rank number. */
const podium=(rank:number|null|undefined)=>rank&&rank<=3?rank:null;
function RankCell({rank,label}:{rank:number|null|undefined;label:string}){return <span className={`collector-rank${podium(rank)?' podium-'+rank:''}`} aria-label={label}>{rank??'—'}</span>;}
function CommunityIdentity({row,fallbackTitle,onPreview,expanded,previewId,rank}:{row:BoardRow;fallbackTitle?:string;onPreview?:()=>void;expanded?:boolean;previewId?:string;rank?:number|null}) {
 const place=podium(rank);
 const achievement=row.achievementTitle??fallbackTitle;
 return <a className="collector-name collector-identity" title={onPreview?`Preview ${row.name}’s collection`:`View ${row.name}’s profile`} onPointerEnter={()=>{if(onPreview){void loadPreviewModule();void loadCollectorPreview(row.name).catch(()=>{});}}} onFocus={()=>{if(onPreview){void loadPreviewModule();void loadCollectorPreview(row.name).catch(()=>{});}}} aria-expanded={onPreview?expanded:undefined} aria-controls={expanded?previewId:undefined} onClick={e=>{if(onPreview&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&!e.altKey){e.preventDefault();onPreview();}}} href={'/player/'+encodeURIComponent(row.name)}>
  <span className="identity-prefix"><StaffPrefix staff={row.staff} donation={row.donation} showHelp={false}/></span>
  <span className="identity-mode"><AccountModeBadge mode={row.accountMode} showHelp={false}/></span>
  <span className="identity-text"><b><span className="player-username">{row.name}</span>{row.title&&<small className="rs-title">{row.title}</small>}{place&&<img className={`podium-crown podium-${place}`} src={`/icons/ranks/crown-${PODIUM[place-1].toLowerCase()}.png`} alt={`${PODIUM[place-1]} crown, rank ${place}`}/>}</b>
   {achievement&&<AchievementTitle label={achievement} showHelp={false}/>}
  </span>
 </a>;
}
export function CollectorList({rows, metric = 'pets', query = '', limit, pageSize = 20, skill, expandable=false, serverPaging}: {rows: BoardRow[]; metric?: BoardMetric; query?: string; limit?: number; pageSize?: number; skill?:string;expandable?:boolean;serverPaging?:{page:number;pages:number;onPage:(page:number)=>void}}) {
  const [page, setPage] = useState(0),[preview,setPreview]=useState<string|null>(null);
  const previewId=useId();
 useEffect(()=>setPreview(null),[page]);
  useEffect(() => {setPage(0);setPreview(null);}, [metric, query, skill]);
  const ranked = rankedPlayers(rows, metric, query, skill);
  const slice = communityPage(ranked,serverPaging?0:page,pageSize,limit);
  const shown = slice.items;
  const label = metric==='xp'&&skill?`${skill} XP`:BOARD_METRICS.find(m => m.id === metric)!.label;
  return <>{!ranked.length && <p className="community-notice">{query ? 'No players match this filter. Search a RuneScape name above to open any profile.' : 'No public journals yet. Search a RuneScape name to get started.'}</p>}<ol className="collector-list">{shown.map(({row, rank}) => {
    const value = metricValue(row, metric, skill);
    return <li key={row.name}><RankCell rank={rank} label={rank ? `Rank ${rank}` : 'Unranked'}/><CommunityIdentity row={row} rank={rank} onPreview={expandable?()=>setPreview(preview===row.name?null:row.name):undefined} expanded={preview===row.name} previewId={previewId}/><span className={`collector-score ${value!==null&&num(value,0).length>8?'collector-score-long':''}`}><FittedScore text={value == null ? '—' : num(value, 0)}/><small>{value == null ? 'Not synced' : label}</small></span>{expandable&&preview===row.name&&<Suspense fallback={<span className="collector-preview" role="status">Loading preview…</span>}><CollectorPreview key={row.name} name={row.name} id={previewId} metric={metric}/></Suspense>}</li>;
  })}{!query&&<EmptyBoardRows count={pageSize-shown.length}/>}</ol><CommunityPager slice={serverPaging?{...slice,current:serverPaging.page,pages:serverPaging.pages}:slice} setPage={serverPaging?.onPage??setPage} label={`${label} rankings`}/></>;

}
function CommunityPager({slice,setPage,label}:{slice:{pages:number;current:number;start:number;end:number;total:number};setPage:(page:number)=>void;label:string}){
 if(slice.total===0)return null;
 return <Pagination page={slice.current} pages={slice.pages} onPage={setPage} label={label}/>;
}
export function SupporterList({rows,pageSize=5,limit,query='',expandable=false,serverPaging}:{rows:BoardRow[];pageSize?:number;limit?:number;query?:string;expandable?:boolean;serverPaging?:{page:number;pages:number;onPage:(page:number)=>void}}){
 const [page,setPage]=useState(0),[chosenCurrency,setCurrency]=useState('USD'),[preview,setPreview]=useState<string|null>(null);
 const previewId=useId();
 useEffect(()=>setPreview(null),[page]);
 useEffect(()=>setPage(0),[query]);
 const currencies=[...new Set(rows.filter(r=>r.donation&&(r.supporterRank!=null||(!r.donation.hidden&&r.donation.amountMinor!==null))).map(r=>r.donation!.currency))].sort();
 const currency=currencies.includes(chosenCurrency)?chosenCurrency:currencies[0]??'USD';
 const slice=communityPage(rankedSupporters(rows,currency).filter(({row})=>row.name.toLowerCase().includes(query.trim().toLowerCase())),serverPaging?0:page,pageSize,limit);
 return <>{currencies.length>1&&<label className="supporter-currency">Donation currency<select value={currency} onChange={e=>{setCurrency(e.target.value);setPage(0);}}>{currencies.map(c=><option key={c}>{c}</option>)}</select></label>}{!slice.total&&<p className="community-empty">Supporter profiles will appear here when their titles are granted.</p>}<ol className="collector-list supporter-list">{slice.items.map(({row:r,rank})=><li key={r.name}><RankCell rank={rank} label={rank?`Supporter rank ${rank}`:'Amount not ranked'}/><CommunityIdentity row={r} rank={rank} onPreview={expandable?()=>setPreview(preview===r.name?null:r.name):undefined} expanded={preview===r.name} previewId={previewId}/><span className="collector-score"><b>{r.donation?.hidden?'—':r.donation?.amountMinor==null?'?':new Intl.NumberFormat('en-US',{style:'currency',currency:r.donation.currency,maximumFractionDigits:2}).format(r.donation.amountMinor/100)}</b><small>{r.donation?.hidden?'Hidden':r.donation?.amountMinor==null?'Unknown':r.donation.currency}</small></span>{expandable&&preview===r.name&&<Suspense fallback={<span className="collector-preview" role="status">Loading preview…</span>}><CollectorPreview name={r.name} id={previewId}/></Suspense>}</li>)}{!query&&<EmptyBoardRows count={pageSize-slice.items.length}/>}</ol><CommunityPager slice={serverPaging?{...slice,current:serverPaging.page,pages:serverPaging.pages}:slice} setPage={serverPaging?.onPage??setPage} label="Supporters"/></>;
}
export function PlayerComparison({rows}: {rows: BoardRow[]}) {
 const [left,setLeft]=useState(''),[right,setRight]=useState('average');
 const [chart,setChart]=useState<'bars'|'distribution'>('bars');
 const a=rows.find(r=>r.name===left)??rows[0],b=rows.find(r=>r.name===right&&r.name!==a?.name);
 if(!a)return null;
 return <section className="community-panel comparison-panel comparison-refined">
  <div className="section-heading"><div><h2>Compare collections</h2><p>Choose your players. See each milestone against the community.</p></div></div>
  <div className="compare-selectors">
   <label><span className="series-key player"/>Player<select value={a.name} onChange={e=>setLeft(e.target.value)}>{rows.map(r=><option key={r.name}>{r.name}</option>)}</select></label>
   <span className="compare-versus">vs</span>
   <label><span className={`series-key ${b?'other':'average'}`}/>Compare with<select value={b?.name??'average'} onChange={e=>setRight(e.target.value)}><option value="average">Community average</option>{rows.filter(r=>r.name!==a.name).map(r=><option key={r.name}>{r.name}</option>)}</select></label>
  </div>
  <div className="comparison-toolbar"><div className="seg" aria-label="Chart style"><button aria-pressed={chart==='bars'} onClick={()=>setChart('bars')}>Comparison bars</button><button aria-pressed={chart==='distribution'} onClick={()=>setChart('distribution')}>Community spread</button></div><small>{chart==='bars'?'Player totals and the community average':'Accounts grouped by recorded total'}</small></div>
  <div className="comparison-rows">{BOARD_METRICS.map(m=>{
   const {series,average,ceiling}=comparisonSeries(rows,m.id,a,b),av=series[0].value,bv=series[1].value;
   const delta=av!==null&&bv!==null?av-bv:null;
   return <article className="comparison-row" key={m.id}>
    <header className="comparison-label"><img src={m.icon} alt=""/><b>{m.label}</b><small className={delta===null?'':delta>0?'ahead':delta<0?'behind':''}>{delta===null?'Not synced':delta===0?'Even':`${delta>0?'+':'−'}${num(Math.abs(delta),b?0:1)}`}<span>{delta===null?'':` vs ${b?.name??'average'}`}</span></small></header>
    {chart==='distribution'?<CommunityDistribution rows={rows} metric={m.id} series={series}/>:<div className="comparison-chart">{series.map(s=><div className={'compare-bar series-'+s.key} key={s.key}>
     <small>{s.label}</small><span aria-hidden="true"><i style={{width:`${100*(s.value??0)/ceiling}%`}}/></span><b>{s.value===null?'Not synced':num(s.value,s.key==='average'?1:0)}</b>
    </div>)}</div>}
    <footer>{average.count?`Community average · ${average.count} synced account${average.count===1?'':'s'}`:'Community average unavailable until someone syncs'}</footer>
   </article>;
  })}</div><p className="fine">Community averages and distributions include synced values only and update as players sync. The spread shows recorded totals, not drop chances or a predicted bell curve.</p>
 </section>;
}

function EmptyBoardRows({count}:{count:number}) {return <>{Array.from({length:Math.max(0,count)},(_,i)=><li className="collector-placeholder" key={'empty-'+i} aria-label="Empty leaderboard place"><span className="collector-rank">—</span><span className="empty-player"><span/>Open place</span><span className="collector-score">—</span></li>)}</>;}
