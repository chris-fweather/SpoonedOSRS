"use client";
import {useEffect,useRef,useState,type KeyboardEvent as ReactKeyboardEvent,type ReactNode} from 'react';
import {ArrowDown,ArrowUp,Bold,BookOpen,Check,Heading2,Image as ImageIcon,List,ListOrdered,Minus,Pencil,Pilcrow,Plus,Search,Smile,Trash2,Upload} from 'lucide-react';
import {GuideWritingField,type GuideWritingCommand} from './GuideWritingField';
import {BagSlots,WornSlots,ItemImage,RequirementBadges,RequirementGroups,LoadoutTiers,OtherIcon,CostTable,GuideDrops,FormattedText} from './GuideParts';
import {GUIDE_PRAYERS,GUIDE_SPELLS,guideReference,searchGuideReferences} from '@/lib/guide-references';
import {guideBlocks,guideItemChoices,guideSlotChoices,searchGuideItems,guideSetups,newGuideSetup,guideQuests,guideDiaryAreas,guideDiaryTiers,guidePlainText,guideHasRequirements,GUIDE_OTHER_ICONS,GUIDE_SKILLS,GUIDE_TONES,GUIDE_TEXT_STYLES,type Guide,type GuideBlock,type GuideIconKey,type GuideSetupProfile,type GuideTextStyle,type GuideTone} from '@/lib/guides';
import {GUIDE_EMOJIS,guideEmojiLabel} from '@/lib/guide-emojis';
import {guideTopicImage} from '@/lib/guide-topics';
import {UPLOAD_LIMITS,isUploadUrl} from '@/lib/guide-upload-rules';
import {equipItem,type EquipSlot} from '@/lib/flair';
import {oddsCurve} from '@/lib/odds-chart';
import {num,pct} from '@/lib/ui';
import {pageIcon} from '@/lib/artwork';
import questReference from '@/lib/quest-reference.json';
import './guide-document.css';
import './account-settings.css';
type InsertKind='gear'|'inventory'|'requirements'|'odds'|'loadouts'|'costs'|'drops'|'prayers'|'spells'|'image';
const textBlock=(style:GuideTextStyle='body'):GuideBlock=>({id:crypto.randomUUID(),kind:'text',text:'',style,tone:'default'});
const TONE_LABEL:Record<GuideTone,string>={default:'Default colour',gold:'Gold',orange:'Orange',green:'Green'};
const STYLE_LABEL:Record<GuideTextStyle,string>={body:'Paragraph',heading:'Heading',subheading:'Subheading',list:'Bulleted list',numbered:'Numbered list'};
const blockLabel=(b:GuideBlock)=>b.kind==='text'?STYLE_LABEL[b.style]:b.kind==='gear'?'Gear profile':b.kind==='inventory'?'Inventory profile':b.kind==='odds'?'Drop odds chart':b.kind==='requirements'?'Requirements':b.kind==='loadouts'?'Gear tiers':b.kind==='costs'?'Cost table':b.kind==='drops'?'Drop table':b.kind==='prayers'?'Prayers':b.kind==='spells'?'Spells':b.kind==='image'?'Image':'Divider';
const quests=questReference.quests as Record<string,{difficulty?:string}>;
type MenuItem={id:string;label:string;hint:string;icon:ReactNode};
const INSERTS:MenuItem[]=[
 {id:'text:body',label:'Paragraph',hint:'Plain writing',icon:<Pilcrow size={18}/>},
 {id:'text:heading',label:'Heading',hint:'Start a new section',icon:<Heading2 size={18}/>},
 {id:'text:list',label:'Bulleted list',hint:'One item per line',icon:<List size={18}/>},
 {id:'text:numbered',label:'Numbered list',hint:'Steps in order',icon:<ListOrdered size={18}/>},
 {id:'gear',label:'Gear profile',hint:'Worn equipment loadout',icon:<img className="slot-silhouette" src="/ui/slots/body.png" alt=""/>},
 {id:'loadouts',label:'Gear tiers',hint:'Several loadouts side by side',icon:<img src="/icons/navigation/combat-achievements-icon.png" alt=""/>},
 {id:'inventory',label:'Inventory profile',hint:'28-slot inventory',icon:<img src="/items/385.png" alt=""/>},
 {id:'requirements',label:'Requirements',hint:'Skills, quests, diaries, items and more',icon:<img src="/icons/navigation/quest-list-icon.png" alt=""/>},
 {id:'costs',label:'Cost table',hint:'Live cost of each item per use',icon:<img src="/items/995.png" alt=""/>},
 {id:'drops',label:'Drop table',hint:'The full drop table for the boss',icon:<img src="/icons/navigation/collection-log.png" alt=""/>},
 {id:'odds',label:'Drop odds chart',hint:'Chance and dry-streak curve',icon:<img src="/icons/navigation/collection-log-icon.png" alt=""/>},
 {id:'prayers',label:'Prayers',hint:'Which prayers to use, with their icons',icon:<img src="/icons/prayers/protect-from-magic.png" alt=""/>},
 {id:'spells',label:'Spells',hint:'Which spells to cast or teleport with',icon:<img src="/icons/skills/magic.png" alt=""/>},
 {id:'image',label:'Image or GIF',hint:'Upload a picture or paste a link',icon:<ImageIcon size={18}/>},
 {id:'divider',label:'Divider',hint:'A quiet break between sections',icon:<Minus size={18}/>},
];
/** A toolbar menu button: arrow keys move between items, Escape, outside clicks and a choice close it. */
function ToolbarMenu({label,trigger,triggerClass,menuClass,disabled,children}:{label:string;trigger:ReactNode;triggerClass:string;menuClass:string;disabled:boolean;children:(close:()=>void)=>ReactNode}){
 const [open,setOpen]=useState(false),root=useRef<HTMLDivElement>(null),button=useRef<HTMLButtonElement>(null);
 useEffect(()=>{if(!open)return;root.current?.querySelector<HTMLElement>('[role=menuitem]')?.focus();const away=(e:MouseEvent)=>{if(!root.current?.contains(e.target as Node))setOpen(false);};document.addEventListener('mousedown',away);return()=>document.removeEventListener('mousedown',away);},[open]);
 function keys(e:ReactKeyboardEvent){
  const items=[...root.current?.querySelectorAll<HTMLElement>('[role=menuitem]')??[]],at=items.indexOf(document.activeElement as HTMLElement),step=e.key==='ArrowDown'||e.key==='ArrowRight'?1:e.key==='ArrowUp'||e.key==='ArrowLeft'?-1:0;
  if(e.key==='Escape'){e.preventDefault();setOpen(false);button.current?.focus();}
  else if(step&&open){e.preventDefault();items[(at+step+items.length)%items.length]?.focus();}
 }
 return <div ref={root} className="guide-menu" onKeyDown={keys}>
  <button ref={button} type="button" className={triggerClass} aria-haspopup="menu" aria-expanded={open} aria-label={label} disabled={disabled} onMouseDown={e=>e.preventDefault()} onClick={()=>setOpen(!open)}>{trigger}</button>
  {open&&<div className={menuClass} role="menu" aria-label={label}>{children(()=>{setOpen(false);button.current?.focus();})}</div>}
 </div>;
}
/** Link a game term inline: search skills, prayers, quests and items; the term shows its icon and opens the Wiki.
 * Typing letters straight after a term adds them to it (Shark + s = Sharks), and typing @ in the text searches too. */
function TermMenu({disabled,onPick}:{disabled:boolean;onPick:(name:string)=>void}){
 const [open,setOpen]=useState(false),[query,setQuery]=useState(''),root=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(!open)return;root.current?.querySelector('input')?.focus();const away=(e:MouseEvent)=>{if(!root.current?.contains(e.target as Node))setOpen(false);};document.addEventListener('mousedown',away);return()=>document.removeEventListener('mousedown',away);},[open]);
 const results=searchGuideReferences(query,30);
 return <div ref={root} className="guide-menu" onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();setOpen(false);}}}>
  <RibbonButton label="Item or game term" hint="Icon and Wiki link. Or type @ in the text" icon={<BookOpen size={18}/>} disabled={disabled} expanded={open} onClick={()=>{setOpen(!open);setQuery('');}}/>
  {open&&<div className="guide-term-menu" role="dialog" aria-label="Link a game term"><label className="search"><Search size={15} aria-hidden="true"/><input aria-label="Search game terms" placeholder="Item, prayer, spell, skill or quest…" value={query} onChange={e=>setQuery(e.target.value)}/></label><div className="guide-term-results">{results.map(r=><button type="button" key={r.kind+r.name} onMouseDown={e=>e.preventDefault()} onClick={()=>{onPick(r.name);setOpen(false);}}>{r.icon?<img src={r.icon} alt=""/>:<span className="guide-term-blank"/>}<span>{r.name}<small>{r.kind}</small></span></button>)}{!results.length&&<p className="fine">{query.trim()?'No matches.':'Type to search.'}</p>}</div><p className="guide-term-tip">Type an <b>s</b> straight after a term to make it plural.</p></div>}
 </div>;
}
/** One icon in the Insert bar, with its name and what it does on hover or focus. */
function RibbonButton({label,hint,icon,disabled,expanded,onClick}:{label:string;hint:string;icon:ReactNode;disabled:boolean;expanded?:boolean;onClick:()=>void}){
 return <button type="button" className="guide-ribbon-btn" aria-label={label} aria-expanded={expanded} aria-haspopup={expanded===undefined?undefined:'dialog'} disabled={disabled} onMouseDown={e=>e.preventDefault()} onClick={onClick}>{icon}<span className="guide-tip" role="tooltip"><b>{label}</b><small>{hint}</small></span></button>;
}
const RIBBON:{label:string;ids:string[]}[]=[
 {label:'Text',ids:['text:body','text:heading','text:list','text:numbered','divider']},
 {label:'Gear',ids:['gear','loadouts','inventory']},
 {label:'Boss info',ids:['requirements','costs','drops','odds']},
 {label:'Magic',ids:['prayers','spells']},
 {label:'Media',ids:['image']},
];
export function GuideDocument({guide,onChange,disabled,uploads=false}:{guide:Guide;onChange:(g:Guide)=>void;disabled:boolean;uploads?:boolean}) {
 const blocks=guideBlocks(guide),[active,setActive]=useState(blocks.at(-1)?.id??''),[insert,setInsert]=useState<InsertKind|null>(null),[editing,setEditing]=useState<string|null>(null);
 const [format,setFormat]=useState<GuideWritingCommand&{blockId:string}|undefined>();
 // Colour under the cursor, so the matching dot reads as selected.
 const [ink,setInk]=useState<GuideTone|null>(null);
 const focused=blocks.find(b=>b.id===active),text=focused?.kind==='text'?focused:null,full=disabled||blocks.length>=100,topic=guideTopicImage(guide.activity);
 useEffect(()=>{const read=()=>{const node=window.getSelection()?.anchorNode,el=node&&(node.nodeType===1?node as Element:node.parentElement),editor=el?.closest('.guide-document-text');if(!editor)return;const span=el!.closest<HTMLElement>('[data-tone]');setInk(span&&editor.contains(span)?span.dataset.tone as GuideTone:null);};document.addEventListener('selectionchange',read);return()=>document.removeEventListener('selectionchange',read);},[]);
 function update(next:GuideBlock[],extra:Partial<Guide>={}){onChange({...guide,...extra,blocks:next,strategy:next.filter((b):b is Extract<GuideBlock,{kind:'text'}>=>b.kind==='text').map(b=>b.text).join('\n')});}
 function add(block:GuideBlock,extra:Partial<Guide>={}){if(blocks.length>=100)return;const at=blocks.findIndex(b=>b.id===active);const next=[...blocks];next.splice(at<0?next.length:at+1,0,block);update(next,extra);setActive(block.id);}
 function patch(patch:object){update(blocks.map(b=>b.id===active?{...b,...patch} as GuideBlock:b));}
 function open(kind:InsertKind,id:string|null=null){setEditing(id);setInsert(kind);}
 const close=()=>{setInsert(null);setEditing(null);};
 function apply(block:GuideBlock,extra:Partial<Guide>){if(editing)update(blocks.map(b=>b.id===editing?{...block,id:editing}:b),extra);else add(block,extra);close();}
 function pick(id:string){if(id.startsWith('text:'))add(textBlock(id.slice(5) as GuideTextStyle));else if(id==='divider')add({id:crypto.randomUUID(),kind:'divider'});else open(id as InsertKind);}
 function move(i:number,by:number){const next=[...blocks];[next[i+by],next[i]]=[next[i],next[i+by]];update(next);}
 /** Highlighted text takes the colour; with nothing highlighted the whole section does. */
 function colour(tone:GuideTone){const selection=window.getSelection(),editor=document.querySelector(`[id="doc-${active}"] .guide-document-text`);if(editor&&selection&&!selection.isCollapsed&&editor.contains(selection.anchorNode))setFormat({kind:'tone',tone,id:Date.now(),blockId:active});else{patch({tone});setInk(null);}}
 const shown=ink??text?.tone??'default';
 return <div className="guide-doc-shell">
  <div className="guide-toolbar">
   <div className="guide-toolbar-row" role="toolbar" aria-label="Formatting">
    <select className="guide-tool-style" aria-label="Text style" disabled={disabled||!text} value={text?.style??'body'} onChange={e=>patch({style:e.target.value})}>{GUIDE_TEXT_STYLES.map(s=><option key={s} value={s}>{STYLE_LABEL[s]}</option>)}</select>
    <span className="guide-tool-sep" aria-hidden="true"/>
    <button type="button" className="guide-tool" disabled={disabled||!text} aria-label="Bold selected text" title="Bold selected text" onMouseDown={e=>e.preventDefault()} onClick={()=>setFormat({kind:'bold',id:Date.now(),blockId:active})}><Bold size={16} strokeWidth={2.6}/></button>
    <span className="guide-tones" role="group" aria-label="Text colour">{GUIDE_TONES.map(tone=><button key={tone} type="button" className={'guide-tone tone-'+tone} aria-label={TONE_LABEL[tone]} title={TONE_LABEL[tone]} aria-pressed={!!text&&shown===tone} disabled={disabled||!text} onMouseDown={e=>e.preventDefault()} onClick={()=>colour(tone)}><i/></button>)}</span>
    <span className="guide-doc-state">{disabled?'Read only':`${blocks.length} ${blocks.length===1?'section':'sections'}`}</span>
   </div>
   <div className="guide-ribbon" role="toolbar" aria-label="Insert">
    <div className="guide-ribbon-group"><small>In the text</small><div>
     <TermMenu disabled={disabled||!text} onPick={name=>setFormat({kind:'ref',name,id:Date.now(),blockId:active})}/>
     <ToolbarMenu label="Emoji" trigger={<><Smile size={18}/><span className="guide-tip" role="tooltip"><b>Emoji</b><small>Game icons and Rocky in the text</small></span></>} triggerClass="guide-ribbon-btn" menuClass="guide-emoji-menu" disabled={disabled||!text}>{close=>Object.entries(GUIDE_EMOJIS).map(([name,src])=><button key={name} type="button" role="menuitem" aria-label={guideEmojiLabel(name)} title={guideEmojiLabel(name)} onMouseDown={e=>e.preventDefault()} onClick={()=>{close();setFormat({kind:'emoji',name,id:Date.now(),blockId:active});}}><img src={src} alt=""/></button>)}</ToolbarMenu>
    </div></div>
    {RIBBON.map(g=><div key={g.label} className="guide-ribbon-group"><small>{g.label}</small><div>{g.ids.map(id=>{const item=INSERTS.find(x=>x.id===id)!;return <RibbonButton key={id} label={item.label} hint={item.hint} icon={item.icon} disabled={full} onClick={()=>pick(id)}/>;})}</div></div>)}
   </div>
  </div>
  <div className="guide-doc-workspace">
   <nav className="guide-doc-outline" aria-label="Document outline"><b>On this page</b><button type="button" onClick={()=>document.getElementById('guide-document-title')?.focus()}>{guide.title||'Untitled guide'}</button>{blocks.map(b=>(b.kind!=='text'||b.style==='heading'||b.style==='subheading')&&<button type="button" key={b.id} className={b.kind==='text'&&b.style==='subheading'?'is-sub':''} aria-current={active===b.id?'location':undefined} onClick={()=>{setActive(b.id);document.getElementById('doc-'+b.id)?.scrollIntoView({block:'center',behavior:'smooth'});}}>{b.kind==='text'?guidePlainText(b.text)||'Untitled heading':blockLabel(b)}</button>)}</nav>
   <article className="guide-doc-paper">
    <header><input id="guide-document-title" aria-label="Guide title" placeholder="Untitled guide" maxLength={100} value={guide.title} disabled={disabled} onChange={e=>onChange({...guide,title:e.target.value})}/><div className="guide-doc-topic">{topic&&<img src={topic} alt=""/>}<input className="guide-doc-activity" aria-label="Boss or activity" placeholder="Boss or activity" maxLength={100} value={guide.activity} disabled={disabled} onChange={e=>onChange({...guide,activity:e.target.value})}/></div><textarea aria-label="Guide introduction" placeholder="A short introduction to your guide…" rows={2} maxLength={500} value={guide.summary} disabled={disabled} onChange={e=>onChange({...guide,summary:e.target.value})}/></header>
    {blocks.map((b,i)=><section id={'doc-'+b.id} key={b.id} className={`guide-doc-block kind-${b.kind} ${active===b.id?'is-active':''} ${b.kind==='text'?`doc-${b.style} tone-${b.tone}`:''}`} onFocus={()=>setActive(b.id)} onClick={()=>setActive(b.id)}>
     <div className="guide-block-actions"><small>{blockLabel(b)}</small><button type="button" disabled={disabled||i===0} aria-label="Move section up" title="Move up" onClick={()=>move(i,-1)}><ArrowUp size={14}/></button><button type="button" disabled={disabled||i===blocks.length-1} aria-label="Move section down" title="Move down" onClick={()=>move(i,1)}><ArrowDown size={14}/></button>{b.kind!=='text'&&b.kind!=='divider'&&<button type="button" disabled={disabled} aria-label="Edit section" title="Edit" onClick={()=>open(b.kind as InsertKind,b.id)}><Pencil size={13}/></button>}<button type="button" className="is-danger" disabled={disabled||blocks.length===1} aria-label="Remove section" title="Remove" onClick={()=>update(blocks.filter(x=>x.id!==b.id))}><Trash2 size={13}/></button></div>
     {b.kind==='text'?<GuideWritingField label={`Section ${i+1}`} value={b.text} onChange={text=>update(blocks.map(x=>x.id===b.id?{...b,text}:x))} rows={b.style==='body'?3:1} disabled={disabled} placeholder={b.style==='body'?'Write your guide…':b.style==='list'||b.style==='numbered'?'One item per line…':'Write a heading…'} compact tone={b.tone} command={format?.blockId===b.id?format:undefined}/>:<><DocumentBlock guide={guide} block={b}/>{(b.kind==='loadouts'||b.kind==='gear'||b.kind==='inventory')&&!disabled&&<button type="button" className="guide-block-edit" onClick={()=>open(b.kind as InsertKind,b.id)}><Pencil size={14} aria-hidden="true"/>{b.kind==='loadouts'?'Edit tiers, gear and inventory':b.kind==='gear'?'Edit this gear':'Edit this inventory'}</button>}</>}
    </section>)}
    <button type="button" className="guide-add-paragraph" disabled={full} onClick={()=>{const block=textBlock();update([...blocks,block]);setActive(block.id);}}><Plus size={15} aria-hidden="true"/>Continue writing</button>
   </article>
  </div>
  {insert&&<InsertDialog key={insert+editing} kind={insert} guide={guide} block={blocks.find(b=>b.id===editing)} uploads={uploads} onClose={close} onApply={apply}/>}
 </div>;
}
export function GuideDocumentBlocks({guide}:{guide:Guide}) {return <div className="guide-document-published">{guideBlocks(guide).map(b=><section className={b.kind==='text'?`doc-${b.style} tone-${b.tone}`:''} key={b.id}><DocumentBlock guide={guide} block={b}/></section>)}</div>;}
function DocumentBlock({guide,block:b}:{guide:Guide;block:GuideBlock}) {
 if(b.kind==='text')return <FormattedText text={b.text}/>;
 if(b.kind==='divider')return <hr/>;
 if(b.kind==='requirements')return <section className="guide-requirements"><h3>Requirements</h3><RequirementGroups guide={guide}/><FormattedText text={guide.requirements}/>{!guideHasRequirements(guide)&&<p className="fine">Select Edit to add skills, quests, diaries, items or anything else.</p>}</section>;
 if(b.kind==='costs')return <CostTable title={b.title} rows={b.rows}/>;
 if(b.kind==='drops')return <GuideDrops page={b.page}/>;
 if(b.kind==='loadouts'){const setups=b.setupIds.map(id=>guideSetups(guide).find(s=>s.id===id)).filter(s=>!!s);return setups.length?<LoadoutTiers setups={setups} inventory={guideSetups(guide).find(s=>s.id===b.inventoryId)}/>:null;}
 if(b.kind==='odds')return <GuideOdds block={b}/>;
 if(b.kind==='prayers'||b.kind==='spells')return <section className="guide-casts"><h3>{b.kind==='prayers'?'Prayers':'Spells'}</h3><ul>{b.names.map(n=>{const r=guideReference(n);return <li key={n}><a href={r.href} target="_blank" rel="noreferrer">{r.icon&&<img src={r.icon} alt=""/>}<span>{r.name}</span></a></li>;})}</ul></section>;
 if(b.kind==='image')return <figure className="guide-image"><img src={b.url} alt={b.caption||'Guide image'} loading="lazy" referrerPolicy="no-referrer"/>{b.caption&&<figcaption>{b.caption}</figcaption>}</figure>;
 if(b.kind==='gear'||b.kind==='inventory'){const setup=guideSetups(guide).find(s=>s.id===b.setupId);if(!setup)return null;return <section className="guide-insert-profile"><div><span className="kicker">{b.kind==='gear'?'Worn equipment':'Inventory'}</span><h3>{setup.name}</h3></div>{b.kind==='gear'?<WornSlots setup={setup}/>:<BagSlots setup={setup}/>}</section>;}
 return null;
}
function GuideOdds({block:b}:{block:Extract<GuideBlock,{kind:'odds'}>}){
 const chart=oddsCurve(1/b.rate,b.count),maximum=chart.max||1;
 // Wide viewBox: the chart fills the guide column instead of shrinking to keep a tall aspect ratio.
 const X=48,W=900,T=18,B=200,line=chart.curve.map((p,i)=>`${i?'L':'M'} ${X+p.a/maximum*W} ${B-p.c*(B-T)}`).join(' '),mark=X+b.count/maximum*W;
 return <section className="guide-odds"><h3>{b.name}</h3><p className="fine">1/{num(b.rate,0)} per {b.unit.replace(/s$/,'')} · independent, constant-rate attempts</p><div className="guide-odds-stats"><span>Mean hunt<b>{num(b.rate,0)} {b.unit}</b></span><span>Chance by {num(b.count,0)}<b>{pct(chart.chance??0)}</b></span><span>Still dry<b>{pct(1-(chart.chance??0))}</b></span></div><div className="guide-chance-bar"><i style={{width:`${(chart.chance??0)*100}%`}}/></div><svg viewBox="0 0 960 228" role="img" aria-label={`Chance of obtaining a drop by ${b.count} ${b.unit}: ${pct(chart.chance??0)}`}><path d={`M${X} ${T}V${B}H${X+W}`} stroke="#635d4d" fill="none"/><path d={`${line} L ${X+W} ${B} L ${X} ${B} Z`} fill="#e6a13d14" stroke="none"/><path d={line} fill="none" stroke="#e6a13d" strokeWidth="2.5"/><line x1={mark} x2={mark} y1={T} y2={B} stroke="#edda7a" strokeDasharray="5 5"/><text x={X-8} y={T+5} textAnchor="end">100%</text><text x={X-8} y={B} textAnchor="end">0%</text><text x={X} y={B+22}>0</text><text x={X+W} y={B+22} textAnchor="end">{num(chart.max,0)} {b.unit}</text></svg><p className="fine">50% by {num(chart.at(.5),0)} · 90% by {num(chart.at(.9),0)} · 95% by {num(chart.at(.95),0)} {b.unit}. Estimates, not guarantees.</p></section>;
}
type RequirementKind='skill'|'quest'|'diary'|'item';
const FILTERS:[RequirementKind|'all',string][]=[['all','All'],['skill','Skills'],['quest','Quests'],['diary','Diaries'],['item','Items']];
type Candidate={kind:RequirementKind;id:string;label:string;detail?:string;icon:ReactNode;rank:number};
const rankOf=(name:string,q:string)=>{const n=name.toLowerCase();return n===q?0:n.startsWith(q)?1:n.split(/[^a-z0-9']+/).some(w=>w.startsWith(q))?2:n.includes(q)?3:9;};
/** One search across skills, quests, diaries and items, best matches first; filters narrow it to one kind. Custom requirements sit underneath. */
function RequirementPicker({guide,onChange}:{guide:Guide;onChange:(next:(g:Guide)=>Guide)=>void}){
 const [filter,setFilter]=useState<RequirementKind|'all'>('all'),[query,setQuery]=useState(''),[label,setLabel]=useState(''),[icon,setIcon]=useState<string|null>(null),[plain,setPlain]=useState<GuideIconKey>('task'),[iconQuery,setIconQuery]=useState('');
 const items=guide.requiredItems??[],picked=guide.requiredQuests??[],diaries=guide.requiredDiaries??[],skills=guide.requiredSkills??[],other=guide.requiredOther??[],q=query.trim().toLowerCase();
 const want=(k:RequirementKind)=>filter==='all'||filter===k;
 const pool:Candidate[]=[
  ...(want('skill')?GUIDE_SKILLS.map(n=>({kind:'skill' as const,id:n,label:n,detail:'Skill',icon:<img src={`/icons/skills/${n.toLowerCase()}.png`} alt=""/>,rank:q?rankOf(n,q):1})):[]),
  ...(want('quest')&&(q||filter==='quest')?guideQuests.map(n=>({kind:'quest' as const,id:n,label:n,detail:quests[n]?.difficulty?`${quests[n].difficulty} quest`:'Quest',icon:<img src="/icons/navigation/quest-point-icon.png" alt=""/>,rank:q?rankOf(n,q):1})):[]),
  ...(want('diary')&&(q||filter==='diary')?guideDiaryAreas.flatMap(a=>guideDiaryTiers.map(t=>({kind:'diary' as const,id:a+'|'+t,label:`${a} ${t}`,detail:'Achievement diary',icon:<img src="/icons/navigation/achievement-diaries-icon.png" alt=""/>,rank:q?Math.min(rankOf(a,q),rankOf(`${a} ${t}`,q)):1}))):[]),
  ...(want('item')&&q?searchGuideItems(query,guideItemChoices,40).map(([id,name])=>({kind:'item' as const,id,label:name,detail:'Item',icon:<ItemImage id={id}/>,rank:rankOf(name,q)+.5})):[]),
 ];
 const results=pool.filter(c=>c.rank<9).sort((a,b)=>a.rank-b.rank).slice(0,60);
 const added=(c:Candidate)=>c.kind==='skill'?skills.some(r=>r.skill===c.id):c.kind==='quest'?picked.includes(c.id):c.kind==='diary'?diaries.some(d=>d.area+'|'+d.tier===c.id):items.some(i=>i.id===c.id);
 function toggle(c:Candidate){
  const on=added(c);
  if(c.kind==='skill')onChange(g=>({...g,requiredSkills:on?(g.requiredSkills??[]).filter(r=>r.skill!==c.id):[...(g.requiredSkills??[]),{skill:c.id,level:50}]}));
  else if(c.kind==='quest')onChange(g=>({...g,requiredQuests:on?(g.requiredQuests??[]).filter(n=>n!==c.id):[...(g.requiredQuests??[]),c.id]}));
  else if(c.kind==='diary'){const [area,tier]=c.id.split('|');onChange(g=>({...g,requiredDiaries:on?(g.requiredDiaries??[]).filter(d=>d.area!==area||d.tier!==tier):[...(g.requiredDiaries??[]),{area,tier}]}));}
  else onChange(g=>({...g,requiredItems:on?(g.requiredItems??[]).filter(i=>i.id!==c.id):[...(g.requiredItems??[]),{id:c.id,quantity:1}]}));
 }
 const iconResults=iconQuery.trim()?searchGuideItems(iconQuery,guideItemChoices,12):[];
 return <div className="guide-req-picker">
  <label className="search guide-req-search"><Search size={16} aria-hidden="true"/><input aria-label="Search requirements" placeholder="Search skills, quests, diaries and items…" value={query} onChange={e=>setQuery(e.target.value)}/></label>
  <div className="guide-req-filters" role="radiogroup" aria-label="Show">{FILTERS.map(([k,l])=><button type="button" key={k} role="radio" aria-checked={filter===k} className={filter===k?'on':''} onClick={()=>setFilter(k)}>{l}</button>)}</div>
  <div className="guide-req-results">{results.map(c=>{const on=added(c);return <button type="button" key={c.kind+c.id} aria-pressed={on} onClick={()=>toggle(c)}>{c.icon}<span>{c.label}<small>{c.detail}</small></span>{on?<Check size={16} aria-label="Added"/>:<Plus size={16} aria-hidden="true"/>}</button>;})}{!results.length&&<p className="fine">{q?'No matches. Add it as a custom requirement below.':'Type to search, or pick a filter to browse.'}</p>}</div>
  <details className="guide-req-custom"><summary>Custom requirement</summary>
   <label>Requirement<input maxLength={100} placeholder="For example: Krack on Slayer reward unlocked" value={label} onChange={e=>setLabel(e.target.value)}/></label>
   <div className="guide-req-custom-icon">{icon&&<span className="guide-req-custom-preview" title="Item icon chosen"><OtherIcon itemId={icon}/></span>}<div className="guide-req-plain-icons" role="radiogroup" aria-label="Icon">{(Object.keys(GUIDE_OTHER_ICONS) as GuideIconKey[]).map(k=><button type="button" key={k} role="radio" aria-checked={!icon&&plain===k} title={GUIDE_OTHER_ICONS[k][0]} aria-label={GUIDE_OTHER_ICONS[k][0]} onClick={()=>{setIcon(null);setPlain(k);}}><img src={GUIDE_OTHER_ICONS[k][1]} alt=""/></button>)}</div><label className="search"><Search size={14} aria-hidden="true"/><input aria-label="Search an item icon" placeholder="Or use an item's icon…" value={iconQuery} onChange={e=>setIconQuery(e.target.value)}/></label></div>
   {iconResults.length>0&&<div className="guide-req-icon-results">{iconResults.map(([id,name])=><button type="button" key={id} title={name} aria-label={`Use the ${name} icon`} aria-pressed={icon===id} onClick={()=>setIcon(icon===id?null:id)}><ItemImage id={id}/></button>)}</div>}
   <button type="button" className="btn sm primary" disabled={other.length>=20||label.trim().length<2} onClick={()=>{onChange(g=>({...g,requiredOther:[...(g.requiredOther??[]),{label:label.trim(),itemId:icon,...(!icon&&plain!=='task'?{icon:plain}:{})}]}));setLabel('');setIcon(null);setPlain('task');setIconQuery('');}}>Add custom requirement</button>
  </details>
 </div>;
}

/** Find a drop table as you type: bosses and activities by name, or the page that holds a drop or pet. */
function DropSourceSearch({value,onChoose}:{value:string;onChoose:(page:string)=>void}){
 const [query,setQuery]=useState(''),[results,setResults]=useState<{page:string;match?:string;img?:string}[]>([]);
 useEffect(()=>{const q=query.trim();if(q.length<2){setResults([]);return;}let live=true;const t=setTimeout(()=>fetch('/api/drops?search='+encodeURIComponent(q)).then(r=>r.ok?r.json() as Promise<{results:typeof results}>:{results:[]}).then(d=>{if(live)setResults(d.results);}).catch(()=>{if(live)setResults([]);}),200);return()=>{live=false;clearTimeout(t);};},[query]);
 return <div className="drop-source">
  {value&&<div className="drop-source-chosen"><img src={pageIcon(value)} alt=""/><b>{value}</b><small>Drop table</small></div>}
  <label className="search"><Search size={16} aria-hidden="true"/><input aria-label="Search a boss, activity, drop or pet" placeholder={value?'Search another boss, drop or pet…':'Search a boss, activity, drop or pet…'} value={query} onChange={e=>setQuery(e.target.value)}/></label>
  {query.trim().length>=2&&<div className="drop-source-results" role="listbox" aria-label="Drop tables">{results.map(r=><button type="button" role="option" aria-selected={r.page===value} key={r.page} onClick={()=>{onChoose(r.page);setQuery('');}}><img src={r.match&&r.img?`/drops/${r.img}`:pageIcon(r.page)} alt=""/><span>{r.page}{r.match&&<small>Drops {r.match}</small>}</span></button>)}{!results.length&&<p className="fine">No drop table matches.</p>}</div>}
 </div>;
}
function InsertDialog({kind,guide,block,uploads,onClose,onApply}:{kind:InsertKind;guide:Guide;block?:GuideBlock;uploads:boolean;onClose:()=>void;onApply:(b:GuideBlock,extra:Partial<Guide>)=>void}) {
 const dialog=useRef<HTMLDialogElement>(null),setups=guideSetups(guide);
 const original=block&&(block.kind==='gear'||block.kind==='inventory')?setups.find(s=>s.id===block.setupId):undefined;
 const [setup,setSetup]=useState<GuideSetupProfile>(()=>structuredClone(original??newGuideSetup(`Setup ${setups.length+1}`,crypto.randomUUID())));
 const [slot,setSlot]=useState<EquipSlot|number>(kind==='inventory'?0:'head'),[query,setQuery]=useState('');
 const [requirements,setRequirements]=useState(()=>structuredClone(guide));
 const [chart,setChart]=useState<Extract<GuideBlock,{kind:'odds'}>>(()=>block?.kind==='odds'?block:{id:crypto.randomUUID(),kind:'odds',name:'Drop expectations',rate:3000,count:3000,unit:'kills'});
 const [costs,setCosts]=useState<Extract<GuideBlock,{kind:'costs'}>>(()=>block?.kind==='costs'?structuredClone(block):{id:crypto.randomUUID(),kind:'costs',title:'Weapon',rows:[]}),[costTarget,setCostTarget]=useState<number>(-1),[costQuery,setCostQuery]=useState('');
 const [dropBlock,setDropBlock]=useState<Extract<GuideBlock,{kind:'drops'}>>(()=>block?.kind==='drops'?structuredClone(block):{id:crypto.randomUUID(),kind:'drops',page:guide.activity});
 const [oddsPage,setOddsPage]=useState(guide.activity),[picked,setPicked]=useState<string|null>(()=>block?.kind==='odds'?block.name:null);
 const [tiers,setTiers]=useState<string[]>(()=>block?.kind==='loadouts'?block.setupIds:setups.map(s=>s.id));
 const [bagId,setBagId]=useState(()=>block?.kind==='loadouts'?block.inventoryId??'':'');
 const [notes,setNotes]=useState<Record<string,string>>(()=>Object.fromEntries(setups.map(s=>[s.id,s.note??''])));
 // Gear tiers edit their profiles in place: rename, change gear or inventory, or add a custom tier.
 const [profiles,setProfiles]=useState<GuideSetupProfile[]>(()=>structuredClone(setups)),[tierEdit,setTierEdit]=useState<{id:string;part:'gear'|'bag'}|null>(null);
 const editedProfile=tierEdit?profiles.find(p=>p.id===tierEdit.id):undefined;
 function putTier(id:string|null){if(!tierEdit)return;setProfiles(list=>list.map(p=>p.id!==tierEdit.id?p:typeof slot==='string'?{...p,equipment:equipItem(p.equipment,slot,id)}:{...p,inventory:p.inventory.map((old,i)=>i===slot?id:old)}));}
 const [casts,setCasts]=useState<string[]>(()=>block&&(block.kind==='prayers'||block.kind==='spells')?block.names:[]),[castQuery,setCastQuery]=useState('');
 const [image,setImage]=useState(()=>block?.kind==='image'?{url:block.url,caption:block.caption}:{url:'',caption:''});
 const [uploading,setUploading]=useState(false);
 // Uploads go straight to the site's image storage; the server checks the type and the size and daily caps again.
 async function upload(file:File){
  if(file.size>UPLOAD_LIMITS.fileBytes)return setError(`Images can be up to ${UPLOAD_LIMITS.fileBytes/1024/1024} MB. Shrink it or paste a link.`);
  setUploading(true);setError('');
  try{const r=await fetch('/api/staff/guides/upload',{method:'POST',headers:{'Content-Type':file.type||'application/octet-stream'},body:file});const j=await r.json().catch(()=>({})) as {url?:string;error?:string};if(!r.ok||!j.url)throw Error(j.error??'Could not upload that image.');setImage(i=>({...i,url:j.url!}));}
  catch(e){setError(e instanceof Error?e.message:'Could not upload that image.');}
  finally{setUploading(false);}
 }
 const [error,setError]=useState('');
 useEffect(()=>{dialog.current?.showModal();return()=>dialog.current?.close();},[]);
 const results=searchGuideItems(query,typeof slot==='string'?guideSlotChoices(slot):guideItemChoices,80);
 const itemPicker=(onPut:(id:string|null)=>void)=><section className="guide-picker"><div className="section-heading"><b>{typeof slot==='number'?`Slot ${slot+1}`:slot}</b><button className="btn sm ghost" onClick={()=>onPut(null)}>Clear slot</button></div><label className="search"><Search size={16} aria-hidden="true"/><input aria-label="Search loadout items" placeholder="Search items…" value={query} onChange={e=>setQuery(e.target.value)}/></label><div className="guide-item-results">{results.map(([id,name])=><button key={id} aria-label={name} title={name} onClick={()=>onPut(id)}><ItemImage id={id}/><span>{name}</span></button>)}</div><p className="fine">Showing up to 80 matches. Search to narrow the catalogue.</p></section>;
 function put(id:string|null){setSetup(s=>typeof slot==='string'?{...s,equipment:equipItem(s.equipment,slot,id)}:{...s,inventory:s.inventory.map((old,i)=>i===slot?id:old)});}
 function apply(){
  if(kind==='gear'||kind==='inventory'){if(!setup.name.trim())return setError('Give this profile a name.');const next=setups.some(s=>s.id===setup.id)?setups.map(s=>s.id===setup.id?setup:s):[...setups,setup];if(next.length>8)return setError('Choose an existing profile; a guide can contain up to eight.');if(new Set(next.map(s=>s.name.trim().toLowerCase())).size!==next.length)return setError('Use a different name for each profile.');onApply({id:block?.id??crypto.randomUUID(),kind,setupId:setup.id},{setups:next,equipment:next[0].equipment,inventory:next[0].inventory});}
  else if(kind==='requirements')onApply({id:block?.id??crypto.randomUUID(),kind},{requirements:requirements.requirements,requiredItems:requirements.requiredItems,requiredQuests:requirements.requiredQuests,requiredDiaries:requirements.requiredDiaries,requiredSkills:requirements.requiredSkills,requiredOther:requirements.requiredOther});
  else if(kind==='drops'){if(!dropBlock.page.trim())return setError('Name the boss or activity whose drop table to show.');onApply({...dropBlock,id:block?.id??dropBlock.id},{});}
  else if(kind==='costs'){if(!costs.rows.length||costs.rows.some(r=>!r.parts.length))return setError('Add at least one item, each with what one use consumes.');onApply({...costs,id:block?.id??costs.id},{});}
  else if(kind==='loadouts'){if(!tiers.length)return setError('Choose at least one tier.');if(Object.values(notes).some(n=>n.length>400))return setError('Keep each note to 400 characters.');if(profiles.some(p=>!p.name.trim()))return setError('Give every tier a name.');if(new Set(profiles.map(p=>p.name.trim().toLowerCase())).size!==profiles.length)return setError('Use a different name for each tier.');const next=profiles.map(s=>({...s,name:s.name.trim(),note:notes[s.id]?.trim()||undefined}));onApply({id:block?.id??crypto.randomUUID(),kind:'loadouts',setupIds:next.filter(s=>tiers.includes(s.id)).map(s=>s.id),...(bagId?{inventoryId:bagId}:{})},{setups:next});}
  else if(kind==='prayers'||kind==='spells'){if(!casts.length)return setError(`Choose at least one ${kind==='prayers'?'prayer':'spell'}.`);onApply({id:block?.id??crypto.randomUUID(),kind,names:casts},{});}
  else if(kind==='image'){if(!/^https:\/\//i.test(image.url.trim())&&!isUploadUrl(image.url.trim()))return setError('Upload an image or paste a link that starts with https://.');onApply({id:block?.id??crypto.randomUUID(),kind:'image',url:image.url.trim(),caption:image.caption.trim()},{});}
  else {if(!chart.name.trim()||!Number.isFinite(chart.rate)||chart.rate<1||chart.rate>1e12||!Number.isSafeInteger(chart.count)||chart.count<0||chart.count>1e12)return setError('Enter a valid rate and whole attempt count.');onApply(chart,{});}
 }
 const count=(requirements.requiredItems?.length??0)+(requirements.requiredQuests?.length??0)+(requirements.requiredDiaries?.length??0)+(requirements.requiredSkills?.length??0)+(requirements.requiredOther?.length??0);
 return <dialog ref={dialog} className="modal guide-insert-dialog" aria-label={`Insert ${kind}`} onCancel={onClose}><header><div><span className="kicker">{block?'Edit section':'Insert into document'}</span><h2>{kind==='gear'?'Gear profile':kind==='inventory'?'Inventory profile':kind==='requirements'?'Requirements':kind==='loadouts'?'Gear tiers':kind==='costs'?'Cost table':kind==='drops'?'Drop table':kind==='prayers'?'Prayers':kind==='spells'?'Spells':kind==='image'?'Image or GIF':'Drop odds & dry streak chart'}</h2></div><button className="icon-btn" aria-label="Close insert editor" onClick={onClose}>×</button></header><div className="guide-insert-body">{error&&<p role="alert">{error}</p>}
 {(kind==='gear'||kind==='inventory')&&<><div className="guide-insert-fields"><label>Profile<select aria-label="Choose loadout profile" value={setups.some(s=>s.id===setup.id)?setup.id:'new'} onChange={e=>setSetup(e.target.value==='new'?newGuideSetup(`Setup ${setups.length+1}`,crypto.randomUUID()):structuredClone(setups.find(s=>s.id===e.target.value)!))}><option value="new">Create a new profile</option>{setups.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>Profile name<input maxLength={60} value={setup.name} onChange={e=>setSetup(s=>({...s,name:e.target.value}))}/></label></div><div className="guide-insert-loadout"><div>{kind==='gear'?<WornSlots setup={setup} selected={slot} onSelect={s=>{setSlot(s);setQuery('');}}/>:<BagSlots setup={setup} selected={slot} onSelect={s=>{setSlot(s);setQuery('');}}/>}</div><section className="guide-picker"><div className="section-heading"><b>{typeof slot==='number'?`Slot ${slot+1}`:slot}</b><button className="btn sm ghost" onClick={()=>put(null)}>Clear slot</button></div><label className="search"><Search size={16} aria-hidden="true"/><input aria-label="Search loadout items" placeholder="Search items…" value={query} onChange={e=>setQuery(e.target.value)}/></label><div className="guide-item-results">{results.map(([id,name])=><button key={id} aria-label={name} title={name} onClick={()=>put(id)}><ItemImage id={id}/><span>{name}</span></button>)}</div><p className="fine">Showing up to 80 matches. Search to narrow the catalogue.</p></section></div></>}
 {kind==='requirements'&&<div className="guide-req-layout"><RequirementPicker guide={requirements} onChange={next=>setRequirements(next)}/><section className="guide-req-chosen"><h3>Added <small>{count}</small></h3>{count?<RequirementBadges guide={requirements} onQuantity={(id,quantity)=>setRequirements(g=>({...g,requiredItems:g.requiredItems?.map(i=>i.id===id?{...i,quantity}:i)}))} onRemoveItem={id=>setRequirements(g=>({...g,requiredItems:g.requiredItems?.filter(i=>i.id!==id)}))} onRemoveQuest={q=>setRequirements(g=>({...g,requiredQuests:g.requiredQuests?.filter(i=>i!==q)}))} onRemoveDiary={index=>setRequirements(g=>({...g,requiredDiaries:g.requiredDiaries?.filter((_,i)=>i!==index)}))} onLevel={(skill,lvl)=>setRequirements(g=>({...g,requiredSkills:g.requiredSkills?.map(r=>r.skill===skill?{...r,level:lvl}:r)}))} onRemoveSkill={skill=>setRequirements(g=>({...g,requiredSkills:g.requiredSkills?.filter(r=>r.skill!==skill)}))} onRemoveOther={index=>setRequirements(g=>({...g,requiredOther:g.requiredOther?.filter((_,i)=>i!==index)}))}/>:<p className="fine">Nothing added yet.</p>}<label className="guide-requirement-note">Additional requirements<textarea rows={3} maxLength={4000} value={requirements.requirements} onChange={e=>setRequirements(g=>({...g,requirements:e.target.value}))}/></label></section></div>}
 {kind==='drops'&&<div className="guide-cost-editor"><DropSourceSearch value={dropBlock.page} onChoose={page=>setDropBlock(d=>({...d,page}))}/>{dropBlock.page&&<div className="drop-source-table"><GuideDrops page={dropBlock.page}/></div>}<p className="fine">Shows the full drop table for this boss or activity, with links to the OSRS Wiki.</p></div>}
 {kind==='costs'&&<div className="guide-cost-editor"><label className="guide-cost-title">First column heading<input maxLength={80} value={costs.title} onChange={e=>setCosts(c=>({...c,title:e.target.value}))}/></label>
  {costs.rows.map((r,i)=><section className="guide-cost-row" key={r.itemId+i}><div className="guide-cost-row-head"><ItemImage id={r.itemId}/><b>{guideItemChoices.find(([id])=>id===r.itemId)?.[1]??r.itemId}</b><button type="button" className="link" onClick={()=>setCosts(c=>({...c,rows:c.rows.filter((_,n)=>n!==i)}))}>Remove</button></div><div className="guide-cost-parts-edit">{r.parts.map((p,k)=><label key={p.itemId} title={guideItemChoices.find(([id])=>id===p.itemId)?.[1]}><ItemImage id={p.itemId}/><input type="number" min={0.01} step="any" aria-label="Quantity per use" value={p.quantity} onChange={e=>setCosts(c=>({...c,rows:c.rows.map((x,n)=>n===i?{...x,parts:x.parts.map((y,m)=>m===k?{...y,quantity:Math.max(0.01,Number(e.target.value)||1)}:y)}:x)}))}/><button type="button" className="link" aria-label="Remove" onClick={()=>setCosts(c=>({...c,rows:c.rows.map((x,n)=>n===i?{...x,parts:x.parts.filter((_,m)=>m!==k)}:x)}))}>×</button></label>)}<button type="button" className="btn sm ghost" onClick={()=>{setCostTarget(i);setCostQuery('');}}>Add what it uses</button></div></section>)}
  <button type="button" className="btn sm" disabled={costs.rows.length>=12} onClick={()=>{setCostTarget(-1);setCostQuery('');}}>Add an item</button>
  <label className="search"><Search size={16} aria-hidden="true"/><input aria-label="Search items" placeholder={costTarget<0?'Search the item to add a row for…':'Search what this item uses per cast…'} value={costQuery} onChange={e=>setCostQuery(e.target.value)}/></label>
  <div className="guide-item-results">{(costQuery.trim()?searchGuideItems(costQuery,guideItemChoices,40):[]).map(([id,name])=><button key={id} type="button" aria-label={name} title={name} onClick={()=>{setCosts(c=>costTarget<0?{...c,rows:[...c.rows,{itemId:id,parts:[]}]}:{...c,rows:c.rows.map((x,n)=>n===costTarget&&!x.parts.some(p=>p.itemId===id)?{...x,parts:[...x.parts,{itemId:id,quantity:1}]}:x)});if(costTarget<0)setCostTarget(costs.rows.length);setCostQuery('');}}><ItemImage id={id}/><span>{name}</span></button>)}</div>
  <p className="fine">Costs use live Grand Exchange prices. Untradeable items show no price.</p></div>}
 {kind==='loadouts'&&(tierEdit&&editedProfile?<div className="guide-tier-editor"><div className="section-heading"><b>{tierEdit.part==='gear'?'Gear':'Inventory'} · {editedProfile.name}</b><button type="button" className="btn sm" onClick={()=>{setTierEdit(null);setQuery('');}}>Done</button></div><div className="guide-insert-loadout"><div>{tierEdit.part==='gear'?<WornSlots setup={editedProfile} selected={slot} onSelect={x=>{setSlot(x);setQuery('');}}/>:<BagSlots setup={editedProfile} selected={slot} onSelect={x=>{setSlot(x);setQuery('');}}/>}</div>{itemPicker(putTier)}</div></div>
  :<><div className="guide-insert-fields guide-tier-bag-field"><label>Inventory card<select value={bagId} onChange={e=>setBagId(e.target.value)}><option value="">No inventory card</option>{profiles.map(s=><option key={s.id} value={s.id}>{s.name}&apos;s inventory{s.inventory.some(Boolean)?'':' (empty)'}</option>)}</select></label>{bagId&&<button type="button" className="btn sm" onClick={()=>{setTierEdit({id:bagId,part:'bag'});setSlot(0);setQuery('');}}>Edit inventory</button>}</div>
  <p className="fine guide-tier-help">Tick the tiers to show side by side, rename them, and edit each one&apos;s gear. The note appears under each tier; the inventory sits beside them as one more card.</p>
  <div className="guide-tier-picker">{profiles.map(s=>{const on=tiers.includes(s.id);return <section className={'guide-tier-choice'+(on?' is-on':'')} key={s.id}><div className="guide-tier-toggle"><input type="checkbox" aria-label={`Show ${s.name}`} checked={on} onChange={e=>setTiers(t=>e.target.checked?[...t,s.id]:t.filter(x=>x!==s.id))}/><input className="guide-tier-name" aria-label="Tier name" maxLength={60} value={s.name} onChange={e=>setProfiles(list=>list.map(p=>p.id===s.id?{...p,name:e.target.value}:p))}/><small>{Object.values(s.equipment).filter(Boolean).length} items</small></div>
   <div className="guide-tier-actions"><button type="button" className="btn sm" onClick={()=>{setTierEdit({id:s.id,part:'gear'});setSlot('head');setQuery('');}}>Edit gear</button><button type="button" className="btn sm ghost" onClick={()=>{setTierEdit({id:s.id,part:'bag'});setSlot(0);setQuery('');}}>Edit inventory</button></div>
   <textarea aria-label={`Note under ${s.name}`} rows={3} maxLength={400} disabled={!on} placeholder="Cost, why this setup, what to upgrade next…" value={notes[s.id]??''} onChange={e=>setNotes(n=>({...n,[s.id]:e.target.value}))}/></section>;})}
   {profiles.length<8&&<button type="button" className="guide-tier-add" onClick={()=>{const id=crypto.randomUUID(),tier=newGuideSetup(`Tier ${profiles.length+1}`,id);setProfiles(list=>[...list,tier]);setTiers(t=>[...t,id]);}}><Plus size={18} aria-hidden="true"/>Add a tier</button>}</div></>)}
 {(kind==='prayers'||kind==='spells')&&(()=>{const list=kind==='prayers'?GUIDE_PRAYERS:GUIDE_SPELLS,q=castQuery.trim().toLowerCase(),shown=list.filter(n=>!q||n.toLowerCase().includes(q));return <div className="guide-cast-editor">
  <label className="search"><Search size={16} aria-hidden="true"/><input aria-label={`Search ${kind}`} placeholder={kind==='prayers'?'Search prayers…':'Search spells and teleports…'} value={castQuery} onChange={e=>setCastQuery(e.target.value)}/></label>
  <div className="guide-cast-options">{shown.map(n=>{const on=casts.includes(n),r=guideReference(n);return <button type="button" key={n} aria-pressed={on} onClick={()=>setCasts(c=>on?c.filter(x=>x!==n):c.length<16?[...c,n]:c)}>{r.icon&&<img src={r.icon} alt=""/>}<span>{n}</span>{on&&<Check size={14} aria-hidden="true"/>}</button>;})}</div>
  <p className="fine">{casts.length?`Chosen, in order: ${casts.join(', ')}`:`Pick the ${kind} in the order to use them (up to 16).`}</p></div>;})()}
 {kind==='image'&&<div className="guide-image-editor">{uploads&&<><label className={'guide-upload'+(uploading?' is-busy':'')}><Upload size={18} aria-hidden="true"/><span><b>{uploading?'Uploading…':isUploadUrl(image.url)?'Replace the uploaded image':'Upload an image or GIF'}</b><small>PNG, JPG, WebP or GIF, up to {UPLOAD_LIMITS.fileBytes/1024/1024} MB</small></span><input type="file" accept="image/png,image/jpeg,image/gif,image/webp" disabled={uploading} onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(f)void upload(f);}}/></label><p className="guide-upload-or">or paste a link</p></>}<label>Image or GIF link<input type="url" placeholder="https://…/picture.gif" value={isUploadUrl(image.url)?'':image.url} onChange={e=>setImage(i=>({...i,url:e.target.value}))}/></label><label>Caption (optional)<input maxLength={200} value={image.caption} onChange={e=>setImage(i=>({...i,caption:e.target.value}))}/></label>{(/^https:\/\//i.test(image.url.trim())||isUploadUrl(image.url))&&<figure className="guide-image"><img src={image.url.trim()} alt="Preview" referrerPolicy="no-referrer"/></figure>}<p className="fine">{uploads?'A direct link works too, for example from Imgur or the OSRS Wiki.':'Use a direct link to a PNG, JPG, WebP or GIF (for example from Imgur or the OSRS Wiki).'}</p></div>}
 {kind==='odds'&&<><DropSourceSearch value={oddsPage} onChoose={setOddsPage}/>{oddsPage&&<div className="drop-source-table"><GuideDrops page={oddsPage} edit={{name:picked,rate:chart.rate,onPick:(name,p)=>{setPicked(name);setChart(c=>({...c,name,...(p?{rate:Math.round(1/p),count:Math.round(1/p)}:{}),unit:'kills'}));},onRate:rate=>setChart(c=>({...c,rate}))}}/></div>}<p className="fine">Use the pen beside a drop or pet to chart it; its rate can be changed in the table or below.</p><div className="guide-insert-fields"><label>Chart title<input maxLength={100} value={chart.name} onChange={e=>setChart(c=>({...c,name:e.target.value}))}/></label><label>Drop rate: 1 in<input type="number" min={1} max={1e12} step="any" value={chart.rate} onChange={e=>setChart(c=>({...c,rate:Number(e.target.value)}))}/></label><label>Kill count<input type="number" min={0} max={1e12} value={chart.count} onChange={e=>setChart(c=>({...c,count:Number(e.target.value)}))}/></label><label>Unit<select value={chart.unit} onChange={e=>setChart(c=>({...c,unit:e.target.value}))}>{['kills','searches','rolls','runs','catches','actions'].map(u=><option key={u}>{u}</option>)}</select></label></div>{chart.rate>=1&&chart.count>=0&&Number.isFinite(chart.rate)&&Number.isFinite(chart.count)&&<GuideOdds block={chart}/>}<p className="fine">For a fixed independent chance per attempt. This chart does not model changing skilling or raid rates.</p></>}
 </div><footer><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" onClick={apply}>{block?'Update section':'Insert section'}</button></footer></dialog>;
}
