"use client";
import {useEffect,useRef,useState} from 'react';
import {ChevronLeft,Eye,PenLine,Plus} from 'lucide-react';
import {IllustratedSelect} from './IllustratedSelect';
import {GuideDocument,GuideDocumentBlocks} from './GuideDocument';
import {GuideSetup,RequirementBadges,FormattedText} from './GuideParts';
import {PublicHeader} from './Community';
import {StateLabel,timeAgo} from './StaffWorkspace';
import {emptyGuide,mayPublishGuide,type Guide} from '@/lib/guides';
import {guideTopics,guideTopicImage} from '@/lib/guide-topics';
import type {StaffRole} from '@/lib/staff-policy';
import './guides.css';
type Entry={id:string;guide:Guide;revision:number;publishedAt:string|null;changesPending?:boolean;updatedAt?:string;canEdit:boolean;authorId:string};
type Dashboard={viewer:{id:string;role:StaffRole};guides:Entry[]};
function GuideArticle({guide}:{guide:Guide}){return <article className="community-panel guide-article"><header><span className="kicker">{guide.activity}</span><h2>{guide.title||'Your guide title'}</h2><p className="guide-deck">{guide.summary||'A short introduction to this guide.'}</p></header>{guide.blocks?<GuideDocumentBlocks guide={guide}/>:<>{(guide.requirements||guide.requiredQuests?.length||guide.requiredDiaries?.length||guide.requiredItems?.length)?<section><h3>Before you begin</h3><RequirementBadges guide={guide}/><FormattedText text={guide.requirements}/></section>:null}<GuideSetup guide={guide}/><section><h3>Strategy</h3><FormattedText text={guide.strategy}/></section></>}</article>;}
export function Guides(){const [rows,setRows]=useState<Entry[]>([]),[error,setError]=useState(''),[loaded,setLoaded]=useState(false),[q,setQ]=useState('');useEffect(()=>{setQ(new URLSearchParams(window.location.search).get('q')??new URLSearchParams(window.location.search).get('activity')??'');fetch('/api/guides').then(async r=>{const b=await r.json() as {error?:string;guides:Entry[]};if(!r.ok)throw Error(b.error);setRows(b.guides);}).catch(e=>setError(e.message)).finally(()=>setLoaded(true));},[]);const shown=rows.filter(r=>`${r.guide.title} ${r.guide.activity}`.toLowerCase().includes(q.toLowerCase()));return <div className="site"><PublicHeader onError={setError}/><main className="community-page guides-page"><span className="kicker">From the community</span><h1>Guides</h1><p>Staff-published strategies, equipment and inventory setups.</p>{error&&<p role="alert">{error}</p>}<input aria-label="Find a guide" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search an activity or guide…"/>{shown.map(row=><GuideArticle key={row.id} guide={row.guide}/>)}{!shown.length&&<section className="community-panel">{loaded?'No published guides yet. Check back for community strategies.':'Loading guides…'}</section>}<a className="link" href="/staff/guides">Staff guide editor →</a></main></div>;}

const TOPICS=guideTopics.map(t=>({value:t.name,label:t.name,image:t.image}));
/** The short start of a guide: a title and what it is about. */
function NewGuide({onCreate,onCancel,focus}:{onCreate:(title:string,activity:string)=>void;onCancel?:()=>void;focus:boolean}){
 const [title,setTitle]=useState(''),[activity,setActivity]=useState(''),field=useRef<HTMLInputElement>(null),ready=title.trim().length>=3&&!!activity;
 useEffect(()=>{if(focus)field.current?.focus();},[focus]);
 return <form className="staff-card guide-new" onSubmit={e=>{e.preventDefault();if(ready)onCreate(title.trim(),activity);}}>
  <h3>New guide</h3>
  <label className="picture-field"><span>Title</span><input ref={field} required minLength={3} maxLength={100} placeholder="e.g. Nex with a small team" value={title} onChange={e=>setTitle(e.target.value)}/></label>
  <IllustratedSelect label="Boss or activity" placeholder="Choose a boss or activity" value={activity} options={TOPICS} onChange={setActivity}/>
  <div className="guide-new-actions">{onCancel&&<button type="button" className="btn ghost" onClick={onCancel}>Cancel</button>}<button className="btn primary" disabled={!ready}>Create guide</button></div>
 </form>;
}

/** Draft, Published, or Published with saved changes not yet live. */
function guideState(row:Entry|null){return !row?{state:'draft',label:'New draft'}:row.changesPending?{state:'pending',label:'Changes pending'}:row.publishedAt?{state:'approved',label:'Published'}:{state:'draft',label:'Draft'};}

/** The workshop landing: a New guide tile, then one tile per guide with its boss or activity icon. */
function GuideTiles({guides,onNew,onOpen}:{guides:Entry[];onNew:()=>void;onOpen:(row:Entry)=>void}){
 return <div className="guide-tiles">
  <button type="button" className="guide-tile guide-tile-new" onClick={onNew}><Plus size={30} aria-hidden="true"/><b>New guide</b></button>
  {guides.map(row=>{const s=guideState(row);return <button key={row.id} type="button" className="guide-tile" onClick={()=>onOpen(row)}>
   <img src={guideTopicImage(row.guide.activity)??'/icons/navigation/quest-point-icon.png'} alt=""/>
   <b>{row.guide.title||'Untitled guide'}</b>
   <span className="guide-tile-meta"><StateLabel state={s.state} label={s.label}/>{row.updatedAt&&<small>edited {timeAgo(row.updatedAt)}</small>}</span>
  </button>;})}
 </div>;
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
 function create(title:string,activity:string){setSelected(null);setDraft({...emptyGuide(),title,activity,blocks:[{id:crypto.randomUUID(),kind:'text',text:'',style:'body',tone:'default'}]});setBase('');setCreating(false);reset();}
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
 const editing=!!draft&&(!selected||selected.canEdit),canPublish=!!data&&mayPublishGuide(data.viewer.role);
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
  {creating||!draft?<NewGuide onCreate={create} onCancel={()=>{setCreating(false);reset();}} focus/>:preview?<GuideArticle guide={draft}/>:<GuideDocument guide={draft} onChange={setDraft} disabled={!editing||busy}/>}
 </div>;
}
