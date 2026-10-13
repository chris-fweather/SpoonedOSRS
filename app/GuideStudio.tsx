"use client";
import {useEffect,useRef,useState} from 'react';
import {ChevronLeft,Eye,PenLine,Plus,Search} from 'lucide-react';
import {IllustratedSelect} from './IllustratedSelect';
import {GuideDocument,GuideDocumentBlocks} from './GuideDocument';
import {GuideSetup,RequirementBadges,FormattedText} from './GuideParts';
import {PublicHeader} from './Community';
import {DiscordMark} from './DiscordMark';
import {PageHero} from './PageHero';
import {IconBox} from './Controls';
import {StateLabel,timeAgo} from './StaffWorkspace';
import type {Guide} from '@/lib/guides';
import {GUIDE_LAYOUTS,type GuideLayoutId} from '@/lib/guide-templates';
import {guideTopics,guideTopicImage,suggestedLayout} from '@/lib/guide-topics';
import {STAFF_LABEL,STAFF_TONE,type StaffRole} from '@/lib/staff-policy';
import {RankIcon} from './StaffBadge';
import './guides.css';
type Entry={id:string;guide:Guide;revision:number;publishedAt:string|null;changesPending?:boolean;updatedAt?:string;canEdit:boolean;authorId:string};
type Dashboard={viewer:{id:string;role:StaffRole;canPublish:boolean;canUpload?:boolean};guides:Entry[]};
type Byline={author:{name:string;role:string|null}|null;publishedAt:string;updatedAt?:string};
const DAY=new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric'});
const day=(iso:string)=>DAY.format(new Date(iso));
/** Who wrote a guide and when: the author links to their profile; the edit date shows only when it differs from the publish date. */
function GuideByline({byline:b,compact}:{byline:Byline;compact?:boolean}){
 const edited=b.updatedAt&&day(b.updatedAt)!==day(b.publishedAt);
 const role=b.author?.role&&b.author.role in STAFF_LABEL?b.author.role as StaffRole:null;
 const name=b.author?<>{role&&<RankIcon staff={{role,prefix:null}}/>}{compact?<b>{b.author.name}</b>:<a href={'/player/'+encodeURIComponent(b.author.name)}>{b.author.name}</a>}</>:<b>Spooned staff</b>;
 return <p className="guide-byline"><span className={'guide-byline-author '+(role?STAFF_TONE[role]:'')}>{name}</span><span>{compact?'':'Published '}<time dateTime={b.publishedAt}>{day(b.publishedAt)}</time></span>{edited&&!compact&&<span>Updated <time dateTime={b.updatedAt}>{day(b.updatedAt!)}</time></span>}</p>;
}
function GuideArticle({guide,byline}:{guide:Guide;byline?:Byline}){const topic=guideTopicImage(guide.activity);return <article className="community-panel guide-article"><header className={topic?'has-topic':''}>{topic&&<img className="guide-article-topic" src={topic} alt=""/>}<span className="kicker">{guide.activity}</span><h2>{guide.title||'Your guide title'}</h2>{byline&&<GuideByline byline={byline}/>}<p className="guide-deck">{guide.summary||'A short introduction to this guide.'}</p></header>{guide.blocks?<GuideDocumentBlocks guide={guide}/>:<>{(guide.requirements||guide.requiredQuests?.length||guide.requiredDiaries?.length||guide.requiredItems?.length)?<section><h3>Before you begin</h3><RequirementBadges guide={guide}/><FormattedText text={guide.requirements}/></section>:null}<GuideSetup guide={guide}/><section><h3>Strategy</h3><FormattedText text={guide.strategy}/></section></>}</article>;}
type PublicEntry={id:string;guide:Guide}&Byline;
const DISCORD_INVITE='https://discord.gg/spoonedosrs';
/** Public guides: one tile per published guide; a tile opens the guide (/guides?guide=id). */
export function Guides(){
 const [rows,setRows]=useState<PublicEntry[]>([]),[error,setError]=useState(''),[loaded,setLoaded]=useState(false),[q,setQ]=useState(''),[open,setOpen]=useState<string|null>(null);
 useEffect(()=>{const params=new URLSearchParams(window.location.search);setQ(params.get('q')??params.get('activity')??'');setOpen(params.get('guide'));
  const back=()=>setOpen(new URLSearchParams(window.location.search).get('guide'));window.addEventListener('popstate',back);
  fetch('/api/guides').then(async r=>{const b=await r.json() as {error?:string;guides:PublicEntry[]};if(!r.ok)throw Error(b.error);setRows(b.guides);}).catch(e=>setError(e.message)).finally(()=>setLoaded(true));
  return()=>window.removeEventListener('popstate',back);},[]);
 const show=(id:string|null)=>{const url=new URL(window.location.href);if(id)url.searchParams.set('guide',id);else url.searchParams.delete('guide');window.history.pushState(null,'',url);setOpen(id);window.scrollTo({top:0});};
 const reading=open?rows.find(r=>r.id===open):undefined;
 const shown=rows.filter(r=>`${r.guide.title} ${r.guide.activity}`.toLowerCase().includes(q.trim().toLowerCase()));
 return <div className="site"><PublicHeader page="guides" onError={setError}/><main className="community-page guides-page">
  {error&&<p role="alert">{error}</p>}
  {reading?<><button type="button" className="btn ghost guide-back" onClick={()=>show(null)}><ChevronLeft size={16} aria-hidden="true"/>All guides</button><GuideArticle guide={reading.guide} byline={reading}/></>:<>
   <PageHero kicker="From the community" icon="/icons/navigation/collection-log-icon.png" title="Guides" text="Strategies, gear and inventories, written by our staff." actions={<><span className="page-hero-stat"><img src="/icons/navigation/collection-log-icon.png" alt=""/><b>{loaded?rows.length:'—'}</b>{rows.length===1?'guide':'guides'}</span><a className="btn" href={DISCORD_INVITE} target="_blank" rel="noreferrer"><DiscordMark/>Help write guides ↗</a></>}/>
   {loaded&&<label className="board-filter guides-search"><Search size={16} aria-hidden="true"/><input aria-label="Find a guide" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search guides, bosses and activities…"/></label>}
   {shown.length?<div className="activity-grid guide-grid">{shown.map(row=><button key={row.id} type="button" className="cl-activity guide-card" onClick={()=>show(row.id)}><IconBox src={guideTopicImage(row.guide.activity)??'/icons/navigation/quest-point-icon.png'}/><b>{row.guide.title}</b><small className="muted">{row.guide.activity}</small><GuideByline byline={row} compact/></button>)}</div>
   :<section className="community-panel guides-empty">{loaded?(rows.length?'No guides match that search.':'The first guides are on their way.'):'Loading guides…'}</section>}
  </>}
 </main></div>;
}

const TOPICS=guideTopics.map(t=>({value:t.name,label:t.name,image:t.image,detail:t.detail,badge:t.badge}));
/** The short start of a guide: a title, what it is about, and the layout to start from (suggested from the topic). */
function NewGuide({onCreate,onCancel,focus}:{onCreate:(guide:Guide)=>void;onCancel?:()=>void;focus:boolean}){
 const [title,setTitle]=useState(''),[activity,setActivity]=useState(''),[layout,setLayout]=useState<GuideLayoutId>('blank'),field=useRef<HTMLInputElement>(null),ready=title.trim().length>=3&&!!activity;
 useEffect(()=>{if(focus)field.current?.focus();},[focus]);
 function pick(topic:string){setActivity(topic);setLayout(suggestedLayout(topic));}
 return <form className="staff-card guide-new" onSubmit={e=>{e.preventDefault();if(ready)onCreate(GUIDE_LAYOUTS.find(l=>l.id===layout)!.build(title.trim(),activity));}}>
  <h3>New guide</h3>
  <label className="picture-field"><span>Title</span><input ref={field} required minLength={3} maxLength={100} placeholder="e.g. Nex with a small team" value={title} onChange={e=>setTitle(e.target.value)}/></label>
  <IllustratedSelect label="Topic" placeholder="Choose a boss, activity, quest, diary or combat achievements" value={activity} options={TOPICS} onChange={pick}/>
  <div className="picture-field"><span>Layout</span><div className="guide-layouts" role="radiogroup" aria-label="Layout">{GUIDE_LAYOUTS.map(l=><button key={l.id} type="button" role="radio" aria-checked={layout===l.id} onClick={()=>setLayout(l.id)}><img src={l.icon} alt=""/><span><b>{l.label}</b><small>{l.text}</small></span></button>)}</div></div>
  <div className="guide-new-actions">{onCancel&&<button type="button" className="btn ghost" onClick={onCancel}>Cancel</button>}<button className="btn primary" disabled={!ready}>Create guide</button></div>
 </form>;
}

/** Draft, Published, or Published with saved changes not yet live. */
function guideState(row:Entry|null){return !row?{state:'draft',label:'New draft'}:row.changesPending?{state:'pending',label:'Changes pending'}:row.publishedAt?{state:'approved',label:'Published'}:{state:'draft',label:'Draft'};}

/** The workshop landing: a New guide tile, then one tile per guide with its boss or activity icon. */
function GuideTiles({guides,onNew,onOpen}:{guides:Entry[];onNew:()=>void;onOpen:(row:Entry)=>void}){
 const [q,setQ]=useState(''),needle=q.trim().toLowerCase(),shown=guides.filter(r=>!needle||`${r.guide.title} ${r.guide.activity}`.toLowerCase().includes(needle));
 return <><label className="search ws-search guide-workshop-search"><Search size={16} aria-hidden="true"/><input aria-label="Find a guide" placeholder="Find a guide by title or topic…" value={q} onChange={e=>setQ(e.target.value)}/></label><div className="guide-tiles">
  <button type="button" className="guide-tile guide-tile-new" onClick={onNew}><Plus size={30} aria-hidden="true"/><b>New guide</b></button>
  {shown.map(row=>{const s=guideState(row);return <button key={row.id} type="button" className="guide-tile" title={row.guide.title} onClick={()=>onOpen(row)}>
   <img src={guideTopicImage(row.guide.activity)??'/icons/navigation/collection-log-icon.png'} alt=""/>
   <span className="guide-tile-text"><b>{row.guide.title||'Untitled guide'}</b><small>{row.guide.activity}</small></span>
   <span className="guide-tile-meta"><StateLabel state={s.state} label={s.label}/>{row.updatedAt&&<small>Edited {timeAgo(row.updatedAt)}</small>}</span>
  </button>;})}
 </div>{needle&&!shown.length&&<p className="fine">No guides match “{q.trim()}”.</p>}</>;
}

/** The guide editor, shown as the Guides tab of the staff portal. It opens on the guide tiles. */
export function GuideWorkshop(){
 const [data,setData]=useState<Dashboard|null>(null),[selected,setSelected]=useState<Entry|null>(null),[draft,setDraft]=useState<Guide|null>(null),[base,setBase]=useState(''),[creating,setCreating]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[preview,setPreview]=useState(false);
 async function load(){const r=await fetch('/api/staff/guides');const b=await r.json() as Dashboard & {error?:string};if(!r.ok)throw Error(b.error);setData(b);return b;}
 useEffect(()=>{load().catch(e=>setError(e.message));},[]);
 const dirty=!!draft&&JSON.stringify(draft)!==base;
 // Unsaved writing survives tab switches (the workshop stays mounted); warn before leaving the page.
 useEffect(()=>{if(!dirty)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 const discard=()=>!dirty||window.confirm('Discard unsaved changes to this guide?');
 const reset=()=>{setPreview(false);setNotice('');setError('');};
 function open(row:Entry,force=false){if(!force&&!discard())return;const g=structuredClone(row.guide);setSelected(row);setDraft(g);setBase(JSON.stringify(g));setCreating(false);reset();}
 /** A new guide opens as an unsaved draft in its chosen layout: the author fills it in, then saves and publishes it like any other. */
 function create(guide:Guide){setSelected(null);setDraft(structuredClone(guide));setBase('');setCreating(false);reset();}
 /** Back to the tiles; unsaved writing asks first. */
 function allGuides(){if(!discard())return;setSelected(null);setDraft(null);setBase('');setCreating(false);reset();load().catch(e=>setError(e.message));}
 async function post(action:string,id:string|undefined,revision:number|undefined,guide?:Guide){const r=await fetch('/api/staff/guides',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,id,revision,guide})});const b=await r.json() as {id:string;error?:string};if(!r.ok)throw Error(b.error);return b.id;}
 /** Publishing unsaved writing saves it first, so what you see is what goes live. */
 async function run(kind:'save'|'publish'|'unpublish'){
  if(!draft)return;setBusy(true);setError('');setNotice('');
  try{let id=selected?.id,revision=selected?.revision;const saving=kind==='save'||(kind==='publish'&&(dirty||!selected));
   if(saving){id=await post('save',id,revision,draft);revision=(await load()).guides.find(x=>x.id===id)?.revision;}
   if(kind!=='save')await post(kind,id,revision);
   const row=(await load()).guides.find(x=>x.id===id);if(row)open(row,true);
   setNotice(kind==='save'?'Draft saved. The published version stays unchanged.':kind==='publish'?(saving?'Saved and published.':'Published.'):'Guide removed from public browsing.');
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 const editing=!!draft&&(!selected||selected.canEdit),canPublish=!!data?.viewer.canPublish;
 useEffect(()=>{if(!editing||creating)return;const save=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();if(!busy&&dirty)void run('save');}};window.addEventListener('keydown',save);return()=>window.removeEventListener('keydown',save);});
 if(!data)return <div className="guide-workshop">{error?<p className="community-notice" role="alert">{error}</p>:<div className="staff-loading is-inline" role="status"><span className="loading-spinner"/><span className="sr-only">Loading guides…</span></div>}</div>;
 const writing=!creating&&!!draft,state=guideState(selected);
 const alerts=<>{error&&<p className="community-notice staff-alert" role="alert">{error}</p>}{notice&&<p className="community-notice staff-alert is-good" role="status">{notice}</p>}</>;
 if(!writing&&!creating)return <div className="guide-workshop">{alerts}<GuideTiles guides={data.guides} onNew={()=>{setCreating(true);reset();}} onOpen={row=>open(row)}/></div>;
 return <div className="guide-workshop">
  <div className="guide-workshop-bar">
   <button type="button" className="btn sm ghost guide-back" onClick={creating?()=>{setCreating(false);reset();}:allGuides}><ChevronLeft size={16} aria-hidden="true"/>All guides</button>
   {writing&&<span className="guide-workshop-status"><StateLabel state={state.state} label={state.label}/><small>{!editing?'Read only':dirty?'Unsaved changes':selected?.updatedAt?`Saved ${timeAgo(selected.updatedAt)}`:'Saved'}</small></span>}
   {writing&&<div className="guide-workshop-actions"><button type="button" className="btn sm ghost" aria-pressed={preview} onClick={()=>setPreview(!preview)}>{preview?<><PenLine size={15} aria-hidden="true"/>Edit</>:<><Eye size={15} aria-hidden="true"/>Preview</>}</button>{canPublish&&selected?.publishedAt&&<button type="button" className="btn sm ghost" disabled={busy} onClick={()=>{if(window.confirm('Remove this guide from public browsing?'))void run('unpublish');}}>Unpublish</button>}{canPublish&&(editing||!!selected)&&<button type="button" className="btn sm" disabled={busy} onClick={()=>void run('publish')}>Publish</button>}{editing&&<button type="button" className="btn sm primary" disabled={busy||!dirty} onClick={()=>void run('save')}>Save draft</button>}</div>}
  </div>
  {alerts}
  {creating||!draft?<NewGuide onCreate={create} onCancel={()=>{setCreating(false);reset();}} focus/>:preview?<GuideArticle guide={draft}/>:<GuideDocument guide={draft} onChange={setDraft} disabled={!editing||busy} uploads={!!data?.viewer.canUpload}/>}
 </div>;
}
