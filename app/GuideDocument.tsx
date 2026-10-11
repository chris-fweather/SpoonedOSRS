"use client";
import {useEffect,useRef,useState,type KeyboardEvent as ReactKeyboardEvent,type ReactNode} from 'react';
import {ArrowDown,ArrowUp,Bold,Check,Heading2,List,ListOrdered,Minus,Pencil,Pilcrow,Plus,Search,Smile,Trash2} from 'lucide-react';
import {GuideWritingField,type GuideWritingCommand} from './GuideWritingField';
import {BagSlots,WornSlots,ItemImage,RequirementBadges,FormattedText} from './GuideParts';
import {guideBlocks,guideItemChoices,guideSlotChoices,searchGuideItems,guideSetups,newGuideSetup,guideQuests,guideDiaryAreas,guideDiaryTiers,guidePlainText,GUIDE_TONES,GUIDE_TEXT_STYLES,type Guide,type GuideBlock,type GuideSetupProfile,type GuideTextStyle,type GuideTone} from '@/lib/guides';
import {GUIDE_EMOJIS,guideEmojiLabel} from '@/lib/guide-emojis';
import {guideTopicImage} from '@/lib/guide-topics';
import {equipItem,type EquipSlot} from '@/lib/flair';
import {oddsCurve} from '@/lib/odds-chart';
import {num,pct} from '@/lib/ui';
import questReference from '@/lib/quest-reference.json';
import './guide-document.css';
import './account-settings.css';
type InsertKind='gear'|'inventory'|'requirements'|'odds';
const textBlock=(style:GuideTextStyle='body'):GuideBlock=>({id:crypto.randomUUID(),kind:'text',text:'',style,tone:'default'});
const TONE_LABEL:Record<GuideTone,string>={default:'Default colour',gold:'Gold',orange:'Orange',green:'Green'};
const STYLE_LABEL:Record<GuideTextStyle,string>={body:'Paragraph',heading:'Heading',subheading:'Subheading',list:'Bulleted list',numbered:'Numbered list'};
const blockLabel=(b:GuideBlock)=>b.kind==='text'?STYLE_LABEL[b.style]:b.kind==='gear'?'Gear profile':b.kind==='inventory'?'Inventory profile':b.kind==='odds'?'Drop odds chart':b.kind==='requirements'?'Requirements':'Divider';
const quests=questReference.quests as Record<string,{difficulty?:string}>;
type MenuItem={id:string;label:string;hint:string;icon:ReactNode};
const INSERTS:MenuItem[]=[
 {id:'text:body',label:'Paragraph',hint:'Plain writing',icon:<Pilcrow size={18}/>},
 {id:'text:heading',label:'Heading',hint:'Start a new section',icon:<Heading2 size={18}/>},
 {id:'text:list',label:'Bulleted list',hint:'One item per line',icon:<List size={18}/>},
 {id:'text:numbered',label:'Numbered list',hint:'Steps in order',icon:<ListOrdered size={18}/>},
 {id:'gear',label:'Gear profile',hint:'Worn equipment loadout',icon:<img className="slot-silhouette" src="/ui/slots/body.png" alt=""/>},
 {id:'inventory',label:'Inventory profile',hint:'28-slot inventory',icon:<img src="/items/385.png" alt=""/>},
 {id:'requirements',label:'Requirements',hint:'Items, quests and diaries',icon:<img src="/icons/navigation/quest-list-icon.png" alt=""/>},
 {id:'odds',label:'Drop odds chart',hint:'Chance and dry-streak curve',icon:<img src="/icons/navigation/collection-log-icon.png" alt=""/>},
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
  <button ref={button} type="button" className={triggerClass} aria-haspopup="menu" aria-expanded={open} aria-label={label} title={label} disabled={disabled} onMouseDown={e=>e.preventDefault()} onClick={()=>setOpen(!open)}>{trigger}</button>
  {open&&<div className={menuClass} role="menu" aria-label={label}>{children(()=>{setOpen(false);button.current?.focus();})}</div>}
 </div>;
}
export function GuideDocument({guide,onChange,disabled}:{guide:Guide;onChange:(g:Guide)=>void;disabled:boolean}) {
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
  <div className="guide-toolbar" role="toolbar" aria-label="Formatting">
   <select className="guide-tool-style" aria-label="Text style" disabled={disabled||!text} value={text?.style??'body'} onChange={e=>patch({style:e.target.value})}>{GUIDE_TEXT_STYLES.map(s=><option key={s} value={s}>{STYLE_LABEL[s]}</option>)}</select>
   <span className="guide-tool-sep" aria-hidden="true"/>
   <button type="button" className="guide-tool" disabled={disabled||!text} aria-label="Bold selected text" title="Bold selected text" onMouseDown={e=>e.preventDefault()} onClick={()=>setFormat({kind:'bold',id:Date.now(),blockId:active})}><Bold size={16} strokeWidth={2.6}/></button>
   <span className="guide-tones" role="group" aria-label="Text colour">{GUIDE_TONES.map(tone=><button key={tone} type="button" className={'guide-tone tone-'+tone} aria-label={TONE_LABEL[tone]} title={TONE_LABEL[tone]} aria-pressed={!!text&&shown===tone} disabled={disabled||!text} onMouseDown={e=>e.preventDefault()} onClick={()=>colour(tone)}><i/></button>)}</span>
   <ToolbarMenu label="Insert emoji" trigger={<Smile size={17}/>} triggerClass="guide-tool" menuClass="guide-emoji-menu" disabled={disabled||!text}>{close=>Object.entries(GUIDE_EMOJIS).map(([name,src])=><button key={name} type="button" role="menuitem" aria-label={guideEmojiLabel(name)} title={guideEmojiLabel(name)} onMouseDown={e=>e.preventDefault()} onClick={()=>{close();setFormat({kind:'emoji',name,id:Date.now(),blockId:active});}}><img src={src} alt=""/></button>)}</ToolbarMenu>
   <span className="guide-tool-sep" aria-hidden="true"/>
   <ToolbarMenu label="Insert" trigger={<><Plus size={16} aria-hidden="true"/><span>Insert</span></>} triggerClass="guide-insert-trigger" menuClass="guide-insert-menu" disabled={full}>{close=>INSERTS.map(item=><button key={item.id} type="button" role="menuitem" onClick={()=>{close();pick(item.id);}}><span className="guide-insert-icon" aria-hidden="true">{item.icon}</span><span><b>{item.label}</b><small>{item.hint}</small></span></button>)}</ToolbarMenu>
   <span className="guide-doc-state">{disabled?'Read only':`${blocks.length} ${blocks.length===1?'section':'sections'}`}</span>
  </div>
  <div className="guide-doc-workspace">
   <nav className="guide-doc-outline" aria-label="Document outline"><b>On this page</b><button type="button" onClick={()=>document.getElementById('guide-document-title')?.focus()}>{guide.title||'Untitled guide'}</button>{blocks.map(b=>(b.kind!=='text'||b.style==='heading'||b.style==='subheading')&&<button type="button" key={b.id} className={b.kind==='text'&&b.style==='subheading'?'is-sub':''} aria-current={active===b.id?'location':undefined} onClick={()=>{setActive(b.id);document.getElementById('doc-'+b.id)?.scrollIntoView({block:'center',behavior:'smooth'});}}>{b.kind==='text'?guidePlainText(b.text)||'Untitled heading':blockLabel(b)}</button>)}</nav>
   <article className="guide-doc-paper">
    <header><input id="guide-document-title" aria-label="Guide title" placeholder="Untitled guide" maxLength={100} value={guide.title} disabled={disabled} onChange={e=>onChange({...guide,title:e.target.value})}/><div className="guide-doc-topic">{topic&&<img src={topic} alt=""/>}<input className="guide-doc-activity" aria-label="Boss or activity" placeholder="Boss or activity" maxLength={100} value={guide.activity} disabled={disabled} onChange={e=>onChange({...guide,activity:e.target.value})}/></div><textarea aria-label="Guide introduction" placeholder="A short introduction to your guide…" rows={2} maxLength={500} value={guide.summary} disabled={disabled} onChange={e=>onChange({...guide,summary:e.target.value})}/></header>
    {blocks.map((b,i)=><section id={'doc-'+b.id} key={b.id} className={`guide-doc-block kind-${b.kind} ${active===b.id?'is-active':''} ${b.kind==='text'?`doc-${b.style} tone-${b.tone}`:''}`} onFocus={()=>setActive(b.id)} onClick={()=>setActive(b.id)}>
     <div className="guide-block-actions"><small>{blockLabel(b)}</small><button type="button" disabled={disabled||i===0} aria-label="Move section up" title="Move up" onClick={()=>move(i,-1)}><ArrowUp size={14}/></button><button type="button" disabled={disabled||i===blocks.length-1} aria-label="Move section down" title="Move down" onClick={()=>move(i,1)}><ArrowDown size={14}/></button>{b.kind!=='text'&&b.kind!=='divider'&&<button type="button" disabled={disabled} aria-label="Edit section" title="Edit" onClick={()=>open(b.kind as InsertKind,b.id)}><Pencil size={13}/></button>}<button type="button" className="is-danger" disabled={disabled||blocks.length===1} aria-label="Remove section" title="Remove" onClick={()=>update(blocks.filter(x=>x.id!==b.id))}><Trash2 size={13}/></button></div>
     {b.kind==='text'?<GuideWritingField label={`Section ${i+1}`} value={b.text} onChange={text=>update(blocks.map(x=>x.id===b.id?{...b,text}:x))} rows={b.style==='body'?3:1} disabled={disabled} placeholder={b.style==='body'?'Write your guide…':b.style==='list'||b.style==='numbered'?'One item per line…':'Write a heading…'} compact tone={b.tone} command={format?.blockId===b.id?format:undefined}/>:<DocumentBlock guide={guide} block={b}/>}
    </section>)}
    <button type="button" className="guide-add-paragraph" disabled={full} onClick={()=>{const block=textBlock();update([...blocks,block]);setActive(block.id);}}><Plus size={15} aria-hidden="true"/>Continue writing</button>
   </article>
  </div>
  {insert&&<InsertDialog key={insert+editing} kind={insert} guide={guide} block={blocks.find(b=>b.id===editing)} onClose={close} onApply={apply}/>}
 </div>;
}
export function GuideDocumentBlocks({guide}:{guide:Guide}) {return <div className="guide-document-published">{guideBlocks(guide).map(b=><section className={b.kind==='text'?`doc-${b.style} tone-${b.tone}`:''} key={b.id}><DocumentBlock guide={guide} block={b}/></section>)}</div>;}
function DocumentBlock({guide,block:b}:{guide:Guide;block:GuideBlock}) {
 if(b.kind==='text')return <FormattedText text={b.text}/>;
 if(b.kind==='divider')return <hr/>;
 if(b.kind==='requirements')return <section className="guide-insert-requirements"><h3>Requirements</h3><RequirementBadges guide={guide}/><FormattedText text={guide.requirements}/>{!guide.requiredItems?.length&&!guide.requiredQuests?.length&&!guide.requiredDiaries?.length&&!guide.requirements&&<p className="fine">Select Edit to add items, quests or diaries.</p>}</section>;
 if(b.kind==='odds')return <GuideOdds block={b}/>;
 if(b.kind==='gear'||b.kind==='inventory'){const setup=guideSetups(guide).find(s=>s.id===b.setupId);if(!setup)return null;return <section className="guide-insert-profile"><div><span className="kicker">{b.kind==='gear'?'Worn equipment':'Inventory'}</span><h3>{setup.name}</h3></div>{b.kind==='gear'?<WornSlots setup={setup}/>:<BagSlots setup={setup}/>}</section>;}
 return null;
}
function GuideOdds({block:b}:{block:Extract<GuideBlock,{kind:'odds'}>}){
 const chart=oddsCurve(1/b.rate,b.count),maximum=chart.max||1;
 const line=chart.curve.map((p,i)=>`${i?'L':'M'} ${35+p.a/maximum*500} ${165-p.c*140}`).join(' ');
 return <section className="guide-odds"><h3>{b.name}</h3><p className="fine">1/{num(b.rate,0)} per {b.unit.replace(/s$/,'')} · independent, constant-rate attempts</p><div className="guide-odds-stats"><span>Mean hunt<b>{num(b.rate,0)} {b.unit}</b></span><span>Chance by {num(b.count,0)}<b>{pct(chart.chance??0)}</b></span><span>Still dry<b>{pct(1-(chart.chance??0))}</b></span></div><div className="guide-chance-bar"><i style={{width:`${(chart.chance??0)*100}%`}}/></div><svg viewBox="0 0 560 195" role="img" aria-label={`Chance of obtaining a drop by ${b.count} ${b.unit}: ${pct(chart.chance??0)}`}><path d="M35 25V165H535" stroke="#635d4d" fill="none"/><path d={line} fill="none" stroke="#e6a13d" strokeWidth="2"/><line x1={35+b.count/maximum*500} x2={35+b.count/maximum*500} y1={25} y2={165} stroke="#edda7a" strokeDasharray="4 4"/><text x="6" y="30">100%</text><text x="16" y="167">0%</text><text x="35" y="184">0</text><text x="535" y="184" textAnchor="end">{num(chart.max,0)} {b.unit}</text></svg><p className="fine">50% by {num(chart.at(.5),0)} · 90% by {num(chart.at(.9),0)} · 95% by {num(chart.at(.95),0)} {b.unit}. Estimates, not guarantees.</p></section>;
}
type RequirementKind='item'|'quest'|'diary';
const KIND_LABEL:Record<RequirementKind,string>={item:'Items',quest:'Quests',diary:'Diaries'};
/** Search the whole item catalogue, every quest or every diary; each result shows its official icon and adds with one click. */
function RequirementPicker({guide,onChange}:{guide:Guide;onChange:(next:(g:Guide)=>Guide)=>void}){
 const [kind,setKind]=useState<RequirementKind>('item'),[query,setQuery]=useState(''),[tier,setTier]=useState('Hard');
 const items=guide.requiredItems??[],picked=guide.requiredQuests??[],diaries=guide.requiredDiaries??[],q=query.trim().toLowerCase();
 const full=kind==='item'?items.length>=40:kind==='quest'?picked.length>=40:diaries.length>=48;
 const results:{id:string;label:string;detail?:string;icon:ReactNode;added:boolean}[]=
  kind==='item'?(q?searchGuideItems(query,guideItemChoices,60):[]).map(([id,name])=>({id,label:name,icon:<ItemImage id={id}/>,added:items.some(i=>i.id===id)}))
  :kind==='quest'?guideQuests.filter(n=>n.toLowerCase().includes(q)).slice(0,60).map(n=>({id:n,label:n,detail:quests[n]?.difficulty,icon:<img src="/icons/navigation/quest-point-icon.png" alt=""/>,added:picked.includes(n)}))
  :guideDiaryAreas.filter(a=>a.toLowerCase().includes(q)).map(a=>({id:a,label:a,icon:<img src="/icons/navigation/achievement-diaries-icon.png" alt=""/>,added:diaries.some(d=>d.area===a&&d.tier===tier)}));
 function toggle(id:string,added:boolean){
  if(kind==='item')onChange(g=>({...g,requiredItems:added?(g.requiredItems??[]).filter(i=>i.id!==id):[...(g.requiredItems??[]),{id,quantity:1}]}));
  else if(kind==='quest')onChange(g=>({...g,requiredQuests:added?(g.requiredQuests??[]).filter(n=>n!==id):[...(g.requiredQuests??[]),id]}));
  else onChange(g=>({...g,requiredDiaries:added?(g.requiredDiaries??[]).filter(d=>d.area!==id||d.tier!==tier):[...(g.requiredDiaries??[]),{area:id,tier}]}));
 }
 return <div className="guide-req-picker">
  <div className="guide-choices" role="radiogroup" aria-label="Requirement type">{(['item','quest','diary'] as const).map(k=><label key={k} className="account-choice"><input type="radio" name="guide-requirement-kind" checked={kind===k} onChange={()=>{setKind(k);setQuery('');}}/>{KIND_LABEL[k]}</label>)}</div>
  <label className="search"><Search size={16} aria-hidden="true"/><input aria-label={`Search ${KIND_LABEL[kind].toLowerCase()}`} placeholder={kind==='item'?'Search any item…':kind==='quest'?'Search quests…':'Search diaries…'} value={query} onChange={e=>setQuery(e.target.value)}/></label>
  {kind==='diary'&&<div className="guide-choices is-four" role="radiogroup" aria-label="Diary tier">{guideDiaryTiers.map(t=><label key={t} className="account-choice"><input type="radio" name="guide-diary-tier" checked={tier===t} onChange={()=>setTier(t)}/>{t}</label>)}</div>}
  <div className="picture-options guide-req-results">{results.map(r=><button type="button" key={r.id} aria-pressed={r.added} disabled={!r.added&&full} onClick={()=>toggle(r.id,r.added)}>{r.icon}<span>{r.label}{r.detail&&<small>{r.detail}</small>}</span>{r.added?<Check size={16} aria-label="Added"/>:<Plus size={16} aria-hidden="true"/>}</button>)}{!results.length&&<p className="fine">{kind==='item'&&!q?'Type an item name.':'No matches.'}</p>}</div>
 </div>;
}
function InsertDialog({kind,guide,block,onClose,onApply}:{kind:InsertKind;guide:Guide;block?:GuideBlock;onClose:()=>void;onApply:(b:GuideBlock,extra:Partial<Guide>)=>void}) {
 const dialog=useRef<HTMLDialogElement>(null),setups=guideSetups(guide);
 const original=block&&(block.kind==='gear'||block.kind==='inventory')?setups.find(s=>s.id===block.setupId):undefined;
 const [setup,setSetup]=useState<GuideSetupProfile>(()=>structuredClone(original??newGuideSetup(`Setup ${setups.length+1}`,crypto.randomUUID())));
 const [slot,setSlot]=useState<EquipSlot|number>(kind==='inventory'?0:'head'),[query,setQuery]=useState('');
 const [requirements,setRequirements]=useState(()=>structuredClone(guide));
 const [chart,setChart]=useState<Extract<GuideBlock,{kind:'odds'}>>(()=>block?.kind==='odds'?block:{id:crypto.randomUUID(),kind:'odds',name:'Drop expectations',rate:3000,count:3000,unit:'kills'});
 const [error,setError]=useState('');
 useEffect(()=>{dialog.current?.showModal();return()=>dialog.current?.close();},[]);
 const results=searchGuideItems(query,typeof slot==='string'?guideSlotChoices(slot):guideItemChoices,80);
 function put(id:string|null){setSetup(s=>typeof slot==='string'?{...s,equipment:equipItem(s.equipment,slot,id)}:{...s,inventory:s.inventory.map((old,i)=>i===slot?id:old)});}
 function apply(){
  if(kind==='gear'||kind==='inventory'){if(!setup.name.trim())return setError('Give this profile a name.');const next=setups.some(s=>s.id===setup.id)?setups.map(s=>s.id===setup.id?setup:s):[...setups,setup];if(next.length>8)return setError('Choose an existing profile; a guide can contain up to eight.');if(new Set(next.map(s=>s.name.trim().toLowerCase())).size!==next.length)return setError('Use a different name for each profile.');onApply({id:block?.id??crypto.randomUUID(),kind,setupId:setup.id},{setups:next,equipment:next[0].equipment,inventory:next[0].inventory});}
  else if(kind==='requirements')onApply({id:block?.id??crypto.randomUUID(),kind},{requirements:requirements.requirements,requiredItems:requirements.requiredItems,requiredQuests:requirements.requiredQuests,requiredDiaries:requirements.requiredDiaries});
  else {if(!chart.name.trim()||!Number.isFinite(chart.rate)||chart.rate<1||chart.rate>1e12||!Number.isSafeInteger(chart.count)||chart.count<0||chart.count>1e12)return setError('Enter a valid rate and whole attempt count.');onApply(chart,{});}
 }
 const count=(requirements.requiredItems?.length??0)+(requirements.requiredQuests?.length??0)+(requirements.requiredDiaries?.length??0);
 return <dialog ref={dialog} className="modal guide-insert-dialog" aria-label={`Insert ${kind}`} onCancel={onClose}><header><div><span className="kicker">{block?'Edit section':'Insert into document'}</span><h2>{kind==='gear'?'Gear profile':kind==='inventory'?'Inventory profile':kind==='requirements'?'Requirements':'Drop odds & dry streak chart'}</h2></div><button className="icon-btn" aria-label="Close insert editor" onClick={onClose}>×</button></header><div className="guide-insert-body">{error&&<p role="alert">{error}</p>}
 {(kind==='gear'||kind==='inventory')&&<><div className="guide-insert-fields"><label>Profile<select aria-label="Choose loadout profile" value={setups.some(s=>s.id===setup.id)?setup.id:'new'} onChange={e=>setSetup(e.target.value==='new'?newGuideSetup(`Setup ${setups.length+1}`,crypto.randomUUID()):structuredClone(setups.find(s=>s.id===e.target.value)!))}><option value="new">Create a new profile</option>{setups.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>Profile name<input maxLength={60} value={setup.name} onChange={e=>setSetup(s=>({...s,name:e.target.value}))}/></label></div><div className="guide-insert-loadout"><div>{kind==='gear'?<WornSlots setup={setup} selected={slot} onSelect={s=>{setSlot(s);setQuery('');}}/>:<BagSlots setup={setup} selected={slot} onSelect={s=>{setSlot(s);setQuery('');}}/>}</div><section className="guide-picker"><div className="section-heading"><b>{typeof slot==='number'?`Slot ${slot+1}`:slot}</b><button className="btn sm ghost" onClick={()=>put(null)}>Clear slot</button></div><label className="search"><Search size={16} aria-hidden="true"/><input aria-label="Search loadout items" placeholder="Search items…" value={query} onChange={e=>setQuery(e.target.value)}/></label><div className="guide-item-results">{results.map(([id,name])=><button key={id} aria-label={name} title={name} onClick={()=>put(id)}><ItemImage id={id}/><span>{name}</span></button>)}</div><p className="fine">Showing up to 80 matches. Search to narrow the catalogue.</p></section></div></>}
 {kind==='requirements'&&<div className="guide-req-layout"><RequirementPicker guide={requirements} onChange={next=>setRequirements(next)}/><section className="guide-req-chosen"><h3>Added <small>{count}</small></h3>{count?<RequirementBadges guide={requirements} onQuantity={(id,quantity)=>setRequirements(g=>({...g,requiredItems:g.requiredItems?.map(i=>i.id===id?{...i,quantity}:i)}))} onRemoveItem={id=>setRequirements(g=>({...g,requiredItems:g.requiredItems?.filter(i=>i.id!==id)}))} onRemoveQuest={q=>setRequirements(g=>({...g,requiredQuests:g.requiredQuests?.filter(i=>i!==q)}))} onRemoveDiary={index=>setRequirements(g=>({...g,requiredDiaries:g.requiredDiaries?.filter((_,i)=>i!==index)}))}/>:<p className="fine">Nothing added yet.</p>}<label className="guide-requirement-note">Additional requirements<textarea rows={3} maxLength={4000} value={requirements.requirements} onChange={e=>setRequirements(g=>({...g,requirements:e.target.value}))}/></label></section></div>}
 {kind==='odds'&&<><div className="guide-insert-fields"><label>Chart title<input maxLength={100} value={chart.name} onChange={e=>setChart(c=>({...c,name:e.target.value}))}/></label><label>Drop rate: 1 in<input type="number" min={1} max={1e12} step="any" value={chart.rate} onChange={e=>setChart(c=>({...c,rate:Number(e.target.value)}))}/></label><label>Attempts<input type="number" min={0} max={1e12} value={chart.count} onChange={e=>setChart(c=>({...c,count:Number(e.target.value)}))}/></label><label>Unit<select value={chart.unit} onChange={e=>setChart(c=>({...c,unit:e.target.value}))}>{['kills','searches','rolls','runs','catches','actions'].map(u=><option key={u}>{u}</option>)}</select></label></div>{chart.rate>=1&&chart.count>=0&&Number.isFinite(chart.rate)&&Number.isFinite(chart.count)&&<GuideOdds block={chart}/>}<p className="fine">For a fixed independent chance per attempt. This chart does not model changing skilling or raid rates.</p></>}
 </div><footer><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" onClick={apply}>{block?'Update section':'Insert section'}</button></footer></dialog>;
}
