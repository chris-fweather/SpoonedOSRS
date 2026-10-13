'use client';
import {diaryRequirementGroups,requirementCompletion,type AdventureRequirements} from '@/lib/adventure-requirements';
import {BOARD_SKILLS} from '@/lib/community';
import './adventure-requirements.css';
import {useMemo, useState} from 'react';
import {ArrowLeft, ExternalLink} from 'lucide-react';
import type {Journal} from '@/lib/model';
import data from '@/lib/adventure-data.json';
import qraw from '@/lib/quest-reference.json';
import qitems from '@/lib/quest-items.json';
import draw from '@/lib/diary-tasks.json';
import diaryItems from '@/lib/diary-requirement-items.json';
import craw from '@/lib/ca-combos.json';
import {bossArtwork} from '@/lib/artwork';
import {combatGroupProgress} from '@/lib/combat-progress';
import {decodeWiki} from '@/lib/wiki-text';
import {num, wiki} from '@/lib/ui';
import {ChipRow, FilterBar, IconBox, SearchBox, SortMenu} from './Controls';
import {ProgressHeader as ScoreHead} from './ProgressHeader';
import {ProfileEmpty} from './ProfileEmpty';
import {TileProgress} from './TileProgress';
import {Meter, Count} from './Meter';
import {PopHead, Stats, type PopApi} from './Pop';

type QuestInfo = {mem: boolean; mini: boolean; d?: string; l?: string; s?: string; r?: string; qp?: number};
type CaTask = [monster: string, name: string, desc: string, type: string, tier: string, pts: number, comp: string];
type Quest = NonNullable<Journal['profile']>['quests'][number] & {info: QuestInfo};
type Diary = NonNullable<Journal['profile']>['diaries'][number];
type QRef = {difficulty?: string; length?: string; start?: string; description?: string; items?: string; enemies?: string; skills?: {skill: string; level: number; ironman?:boolean; boostable?:boolean}[]; quests?: string[]; wiki?: string};
type DTask = {task: string; requirements: string};
type DArea = {wiki: string; tiers: {tier: string; tasks: DTask[]}[]};

const QUESTS = (data as {quests: Record<string, QuestInfo>}).quests;
const TASKS = (data as unknown as {ca: CaTask[]}).ca;
const QREF = qraw as {lengthNote: string; quests: Record<string, QRef>};
const QITEMS = qitems as Record<string, {name: string; id: number}[]>;
const QBY = new Map(Object.entries(QREF.quests).map(([k, v]) => [k.toLowerCase(), v]));
const DIARY_ITEMS=diaryItems as Record<string,{id:number;name:string}[]>;
const DREF = (draw as {areas: Record<string, DArea>}).areas;
const COMBOS = (craw as {combos: Record<string, string[]>}).combos;
const DIFFS = ['Novice', 'Intermediate', 'Experienced', 'Master', 'Grandmaster', 'Special'];
const TIERS = ['Easy', 'Medium', 'Hard', 'Elite'];
const CA_TIERS = ['Easy', 'Medium', 'Hard', 'Elite', 'Master', 'Grandmaster'];
const CA_TOTALS = Object.fromEntries(CA_TIERS.map(tier=>[tier,TASKS.filter(t=>t[4]===tier).length]));
const caIcon = (t: string) => `/icons/tiers/ca-${t.toLowerCase()}.png`;
const diffIcon = (d?: string) => d && DIFFS.includes(d) ? `/icons/tiers/${d.toLowerCase()}.png` : '';
const STATE: Record<string, [string, string]> = {finished: ['Completed', 'good'], in_progress: ['In progress', 'warn'], started: ['In progress', 'warn'], not_started: ['Not started', 'bad']};

function questRef(name: string) { return QREF.quests[name] ?? QBY.get(name.toLowerCase()); }
function diaryRef(area: string) { return DREF[area] ?? Object.entries(DREF).find(([k]) => k.toLowerCase() === area.toLowerCase())?.[1]; }
function firstLine(s: string) { return s.split('\n')[0].trim(); }
function RequirementGroups({groups,journal}:{groups:AdventureRequirements;journal:Journal}){
  const hasRequirements=Object.values(groups).some(rows=>rows.length);
  return <section className="pop-block adventure-requirements"><span className="kicker">Requirements</span>
    {(['skills','quests','items','other'] as const).map(group=>{
      const rows=groups[group];if(!rows.length)return null;
      return <div className="adventure-requirement-group" key={group}><h3>{{skills:'Skills',quests:'Quests',items:'Items',other:'Other conditions'}[group]}</h3>
        {group==='items'?<ul className="adventure-requirement-list">{groups.items.map((row,index)=><li key={index}><span className="adventure-item-icons" aria-hidden="true">{row.items.map(item=><img key={item.id} src={`/items/${item.id}.png`} alt=""/>)}</span><span>{decodeWiki(row.label)}</span></li>)}</ul>
        :<ul className="adventure-requirement-list">{groups[group].map((row,index)=>{
          const met=requirementCompletion(row,journal.hiscores.skills,journal.profile?.quests);
          const icon=row.skill?bossArtwork(row.skill):group==='quests'?'/icons/navigation/quest-point-icon.png':undefined;
          return <li key={index} className={met===null?'':met?'req-met':'req-miss'}>{icon&&<img src={icon} alt=""/>}<span>{row.quest?<a href={wiki(row.quest)} target="_blank" rel="noreferrer">{decodeWiki(row.label)}</a>:decodeWiki(row.label)}{row.note&&<small>{row.note}</small>}</span>{met===true&&<b className="requirement-check" aria-label="Requirement met">✓</b>}</li>;
        })}</ul>}
      </div>;
    })}
    {!hasRequirements&&<p className="muted">None listed.</p>}
  </section>;
}

type Props = {journal: Journal; pop: PopApi; onSync: () => void; busy: boolean; canEdit?: boolean};

/* ---------------- Quests ---------------- */
const DIFF_FILTERS = ['Novice', 'Intermediate', 'Experienced', 'Master', 'Grandmaster'];
function questDifficulty(r: {name: string; info: QuestInfo}) {
  return r.info.d || questRef(r.name)?.difficulty || '';
}

export function Quests({journal: j, pop, onSync, busy, canEdit=false}: Props) {
  const [q, setQ] = useState(''), [status, setStatus] = useState('all'), [sort, setSort] = useState('name'), [diff, setDiff] = useState('all');
  const all = j.profile?.quests;
  const rows: Quest[] = useMemo(() => (all ?? []).map(x => ({...x, info: QUESTS[x.name] ?? {mem: x.type !== 'free', mini: x.type === 'mini'}})), [all]);
  if (!all?.length) return <ProfileEmpty section="Quests" icon="/icons/navigation/quest-point-icon.png" onSync={onSync} busy={busy} canEdit={canEdit}/>;
  const isMini = (r: Quest) => r.info.mini || r.type === 'mini';
  const qp = rows.filter(r => r.state === 'finished').reduce((s, r) => s + r.points, 0);
  const totalQp = rows.reduce((s, r) => s + r.points, 0);
  const shown = rows.filter(r => (status === 'all' || (status === 'done' ? r.state === 'finished' : r.state !== 'finished')) && (diff === 'all' || questDifficulty(r) === diff) && r.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => sort === 'points' ? b.points - a.points || a.name.localeCompare(b.name) : a.name.localeCompare(b.name));
  const groups: [string, Quest[]][] = [
    ['Free', shown.filter(r => !isMini(r) && r.info.mem === false)],
    ['Members', shown.filter(r => !isMini(r) && r.info.mem !== false)],
    ['Miniquests', shown.filter(isMini)],
  ];
  return <div className="list-panel">
    <ScoreHead icon="/icons/navigation/quest-point-icon.png" kicker="Quest points" done={qp} total={totalQp} remaining={false} extra={<small className="remaining-count">{rows.filter(r=>!isMini(r)&&r.state!=='finished').length} quests left</small>}/>
    <FilterBar>
      <SearchBox label="Search quests" placeholder="Search quests…" value={q} onChange={setQ}/>
      <SortMenu label="Quest status" value={status} onChange={setStatus} options={[{value:"all",label:"All quests"},{value:"todo",label:"To do"},{value:"done",label:"Done"}]}/>
      <SortMenu label="Sort quests" value={sort} onChange={setSort} options={[{value: 'name', label: 'Name A–Z'}, {value: 'points', label: 'Quest points'}]}/>
      <span className="muted sm">{shown.length} shown</span>
    </FilterBar>
    <ChipRow label="Quest difficulty" chips={DIFF_FILTERS.map(name => ({id: name, label: name, pressed: diff === name, onClick: () => setDiff(diff === name ? 'all' : name)}))}/>

    <div className="adv-scroll q-scroll">{groups.map(([label, list]) => list.length ? <details className="quest-group" key={`${label}:${q}:${status}:${diff}`} open={label === 'Members' || !!q || status !== 'all' || diff !== 'all'}>
      <summary>{label}<span>{list.filter(r => r.state === 'finished').length} / {list.length} complete</span></summary>
      {list.map(r => {const key = 'quest:' + r.id, done = r.state === 'finished';
        return <button type="button" key={r.id} className={`q-row ${pop.key === key ? 'sel' : ''}`} onClick={() => pop.key === key ? pop.close() : pop.show(key, jj => <QuestDetail journal={jj} q={r}/>)}>
          <IconBox src={diffIcon(questDifficulty(r)) || '/icons/navigation/quest-point-icon.png'} alt={questDifficulty(r) || 'Quest'}/>
          <span className={done ? 'done' : ''}>{r.name}</span>
          <small>{r.points || ''}</small>
        </button>;})}
    </details> : null)}</div>
  </div>;
}

function QuestDetail({q, journal}: {q: Quest; journal: Journal}) {
  const [label, tone] = STATE[q.state] ?? [q.state, ''];
  const ref = questRef(q.name);
  const skills = (ref?.skills ?? []).filter(s => s.skill !== 'Quest point');
  const points = (ref?.skills ?? []).find(s => s.skill === 'Quest point');
  const items = QITEMS[q.name] ?? QITEMS[Object.keys(QITEMS).find(key => key.toLowerCase() === q.name.toLowerCase()) ?? ''] ?? [];
  const groups:AdventureRequirements={skills:skills.map(skill=>({label:`${skill.level} ${skill.skill}`,skill:skill.skill,level:skill.level,note:[skill.ironman?'Ironman requirement':null,skill.boostable?'Boostable':null].filter(Boolean).join(' · ')})),quests:[...(points?[{label:`${points.level} Quest points`,points:points.level}]:[]),...(ref?.quests??[]).map(name=>({label:name,quest:name}))],items:items.map(item=>({label:item.name,items:[item]})),other:[]};
  return <>
    <PopHead img={diffIcon(q.info.d || ref?.difficulty) || '/icons/navigation/quest-point-icon.png'} kicker={q.info.mini || q.type === 'mini' ? 'Miniquest' : 'Quest'} title={decodeWiki(q.name)} sub={<span className={tone}>{label}</span>}/>
    <Stats rows={[
      ['Difficulty', ref?.difficulty || q.info.d || '—'],
      ['Length', ref?.length || q.info.l || '—'],
      ['Quest points', q.points ? String(q.points) : '—', 'y'],
    ]}/>
    <RequirementGroups groups={groups} journal={journal}/>
    <div className="pop-links">
      <a className="btn primary sm" href={wiki(q.name) + '/Quick_guide'} target="_blank" rel="noreferrer">Quick guide <ExternalLink size={13}/></a>
      <a className="btn ghost sm" href={ref?.wiki || wiki(q.name)} target="_blank" rel="noreferrer">Wiki <ExternalLink size={13}/></a>
    </div>
  </>;
}

/* ---------------- Diaries ---------------- */
export function Diaries({journal: j, pop, onSync, busy, canEdit=false}: Props) {
  const ds = j.profile?.diaries;
  const [areaId, setAreaId] = useState<number | null>(null);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('name');
  const [taskSort, setTaskSort] = useState('order');
  const [tier, setTier] = useState('All');
  if (!ds?.length) return <ProfileEmpty section="Achievement diaries" icon="/icons/navigation/achievement-diaries-icon.png" onSync={onSync} busy={busy} canEdit={canEdit}/>;
  const all = ds.flatMap(d => d.tiers), done = all.reduce((s, t) => s + t.completed, 0), total = all.reduce((s, t) => s + t.total, 0);
  const selected = ds.find(d => d.areaId === areaId);
  const tiersFor = (d:Diary) => d.tiers.filter(t=>tier==='All'||t.tier===tier);
  const areas = [...ds].sort((a, b) => {
    if (sort !== 'progress') return a.area.localeCompare(b.area);
    const ratio = (d: Diary) => {const ts=tiersFor(d), got=ts.reduce((s,t)=>s+t.completed,0), total=ts.reduce((s,t)=>s+t.total,0);return total?got/total:0;};
    return ratio(a)-ratio(b)||a.area.localeCompare(b.area);
  });
  const needle=q.trim().toLowerCase();
  const shown=areas.filter(d=>!needle||d.area.toLowerCase().includes(needle)||diaryRef(d.area)?.tiers.some(t=>(tier==='All'||t.tier===tier)&&t.tasks.some(task=>task.task.toLowerCase().includes(needle))));
  return <div className={`clog3 diary-board ${selected?'is-open':''}`}>
    <ScoreHead icon="/icons/navigation/achievement-diaries-icon.png" kicker="Achievement diaries" done={done} total={total}/>
    <FilterBar>
      <SearchBox label={selected?'Search diary tasks':'Search diaries'} placeholder={selected?'Search tasks…':'Search areas or tasks…'} value={q} onChange={setQ}/>
      <SortMenu label={selected?'Sort diary tasks':'Sort diaries'} value={selected?taskSort:sort} onChange={selected?setTaskSort:setSort} options={selected?[{value:'order',label:'Task order'},{value:'name',label:'Name A–Z'}]:[{value:'name',label:'Name A–Z'},{value:'progress',label:'Least complete'}]}/>
    </FilterBar>
    <ChipRow label="Diary difficulty" chips={['All',...TIERS].map(name=>{const ts=(selected?.tiers??all).filter(t=>name==='All'||t.tier===name);return {id:name,label:name,count:`${ts.reduce((s,t)=>s+t.completed,0)}/${ts.reduce((s,t)=>s+t.total,0)}`,pressed:tier===name,onClick:()=>{setTier(name);pop.close();}};})}/>
    <div className={`cl-body ${selected?'has-page':''}`}>
      {selected ? <DiaryTasks d={selected} tier={tier} query={q} sort={taskSort} pop={pop} onBack={()=>{setAreaId(null);setQ('');pop.close();}}/> : <div className="diary-areas adv-scroll">{shown.map(d=>{
        const ts=tiersFor(d),got=ts.reduce((s,t)=>s+t.completed,0),total=ts.reduce((s,t)=>s+t.total,0);
        return <button type="button" key={d.areaId} className={`diary-area ${got>=total?'complete':''}`} onClick={()=>{setAreaId(d.areaId);setQ('');pop.close();}}>
          <img src="/icons/navigation/achievement-diaries-icon.png" alt=""/><b>{d.area}</b><Count done={got} total={total}>{got}/{total}</Count>
          <span className="diary-segments">{ts.map(t=><span key={t.tier}><small>{t.tier}</small><Meter done={t.completed} total={t.total}/><small className={t.completed>=t.total?'good':''}>{t.completed}/{t.total}</small></span>)}</span><small className="tile-remaining">{got>=total?'Complete':`${total-got} tasks left`}</small>
        </button>;
      })}{!shown.length&&<p className="muted pad">No matching diary areas or tasks.</p>}</div>}
    </div>
  </div>;
}

function DiaryTasks({d,tier,query,sort,pop,onBack}:{d:Diary;tier:string;query:string;sort:string;pop:PopApi;onBack:()=>void}) {
  const pack=diaryRef(d.area),needle=query.trim().toLowerCase();
  const dd=d.tiers.reduce((s,t)=>s+t.completed,0),da=d.tiers.reduce((s,t)=>s+t.total,0);
  const tasks=(pack?.tiers??[]).filter(t=>tier==='All'||t.tier===tier).flatMap(t=>t.tasks.map((task,i)=>({task,i,tier:t.tier}))).filter(({task})=>!needle||task.task.toLowerCase().includes(needle));
  if(sort==='name')tasks.sort((a,b)=>firstLine(a.task.task).localeCompare(firstLine(b.task.task)));
  return <div className="cl-page diary-page">
    <div className="cl-page-h">
      <button type="button" className="btn ghost sm" onClick={onBack}><ArrowLeft size={15}/> Diaries</button>
      <div><h3>{d.area}</h3><div className="cl-sub"><span>Completed: <Count done={dd} total={da}/></span></div></div>
      <Meter done={dd} total={da} className="cl-meter"/>
      <a className="icon-btn" aria-label={`${d.area} Diary on the OSRS Wiki`} href={pack?.wiki||wiki(`${d.area} Diary`)} target="_blank" rel="noreferrer"><ExternalLink size={16}/></a>
    </div>
    <div className="adv-scroll diary-task-list">
      {tasks.map(({task,i,tier:taskTier})=>{const key=`diary:${d.areaId}:${taskTier}:${i}`,current=d.tiers.find(t=>t.tier===taskTier),complete=!!current&&current.completed>=current.total;
        return <button type="button" key={key} className={`task-row ${pop.key===key?'sel':''}`} onClick={()=>pop.key===key?pop.close():pop.show(key,jj=><DiaryTask d={d} tier={taskTier} task={task} journal={jj}/>)}>
          <span className={complete?'task-state good':'task-state muted'} aria-label={complete?'Completed task':'Individual completion unavailable'}><img src="/icons/navigation/achievement-diaries-icon.png" alt=""/></span>
          <span>{decodeWiki(firstLine(task.task))}{tier==='All'&&<small className="diary-task-tier">{taskTier}</small>}</span><span className={complete?'task-check':'muted'} aria-hidden="true">{complete?'Done':'›'}</span>
        </button>;
      })}
      {!tasks.length&&<p className="muted pad">{pack?'No matching diary tasks.':'No task list is stored for this area.'}</p>}
    </div>
    <p className="fine diary-task-note">{d.tiers.filter(t=>tier==='All'||t.tier===tier).every(t=>t.completed>=t.total)?'All tasks in this selection are complete.':'RuneProfile supplies tier totals; individual ticks are unavailable for unfinished tiers.'}</p>
  </div>;
}

function DiaryTask({d, tier, task, journal}: {d: Diary; tier: string; task: DTask; journal:Journal}) {
  const groups=diaryRequirementGroups(task.requirements.split('\n').map(decodeWiki),Object.keys(QREF.quests),BOARD_SKILLS.map(s=>s.name),DIARY_ITEMS);
  const notes=task.task.split('\n').slice(1).join('\n').replace(/^Note:\s*/,'').trim();
  return <>
    <PopHead img="/icons/navigation/achievement-diaries-icon.png" kicker={`${d.area} · ${tier}`} title={firstLine(task.task)}/>
    <RequirementGroups groups={groups} journal={journal}/>
    {notes&&<div className="pop-block"><span className="kicker">Notes</span><p>{decodeWiki(notes)}</p></div>}
    <div className="pop-links">
      <a className="btn primary sm" href={wiki(`${d.area} Diary`) + '#' + tier} target="_blank" rel="noreferrer">Diary guide <ExternalLink size={13}/></a>
    </div>
    <p className="fine">{d.tiers.find(t => t.tier === tier)?.completed === d.tiers.find(t => t.tier === tier)?.total ? 'Completed: this entire tier is finished.' : 'Individual completion is unavailable; RuneProfile supplies the tier total.'}</p>
  </>;
}

/* ---------------- Combat achievements ---------------- */
export function Combat({journal: j, pop, onSync, busy, canEdit=false}: Props) {
  const [mode, setMode] = useState<'tiers' | 'monsters' | 'tasks'>('tiers');
  const [tier, setTier] = useState('');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('name');
  const bosses = useMemo(() => {
    const map = new Map<string, CaTask[]>();
    for (const t of TASKS) map.set(t[0], [...(map.get(t[0]) ?? []), t]);
    return [...map.entries()].map(([name, tasks]) => ({name, tasks, avg: tasks.reduce((s, t) => s + (parseFloat(t[6]) || 0), 0) / tasks.length})).sort((a, b) => a.name.localeCompare(b.name));
  }, []);
  const combat = j.profile?.combat;
  if (!combat?.length) return <ProfileEmpty section="Combat achievements" icon="/icons/navigation/combat-achievements.png" onSync={onSync} busy={busy} canEdit={canEdit}/>;

  function openTask(t: CaTask) {
    const siblings = TASKS.filter(x => x[0] === t[0]);
    pop.show('ca:' + t[0] + ':' + t[1], <TaskDetail t={t} onPick={name => {const hit = TASKS.find(x => x[1] === name); if (hit) openTask(hit);}} onBack={() => openBoss(t[0], siblings)}/>);
  }
  function openBoss(name: string, tasks: CaTask[]) {
    pop.show('boss:' + name, <BossDetail name={name} tasks={tasks} combat={combat!} onPick={openTask}/>);
  }

  const done = combat.reduce((s, c) => s + c.completed, 0), total = combat.reduce((s, c) => s + c.total, 0);
  const needle = q.toLowerCase();
  const sortOptions = mode === 'tiers'
    ? [{value: 'order', label: 'Tier order'}, {value: 'progress', label: 'Least complete'}]
    : mode === 'monsters'
      ? [{value: 'name', label: 'Name A–Z'}, {value: 'share', label: 'Wiki share'}]
      : [{value: 'name', label: 'Name A–Z'}, {value: 'points', label: 'Points'}, {value: 'share', label: 'Wiki share'}];
  const sortValue = sortOptions.some(option => option.value === sort) ? sort : sortOptions[0].value;
  const tierRows = CA_TIERS.flatMap(name => {
    const row = combat.find(x => x.name === name);
    return row && (!tier || row.name === tier) ? [{...row}] : [];
  });
  if (sortValue === 'progress') tierRows.sort((a, b) => (a.total ? a.completed / a.total : 0) - (b.total ? b.completed / b.total : 0));
  const monsters = bosses.filter(b => (!tier || b.tasks.some(t => t[4] === tier)) && (!needle || b.name.toLowerCase().includes(needle) || b.tasks.some(t => t[1].toLowerCase().includes(needle))))
    .sort((a, b) => sortValue === 'share' ? b.avg - a.avg || a.name.localeCompare(b.name) : a.name.localeCompare(b.name));
  const tasks = TASKS.filter(t => (!tier || t[4] === tier) && (!needle || `${t[0]} ${t[1]}`.toLowerCase().includes(needle)))
    .sort((a, b) => sortValue === 'points' ? b[5] - a[5] || a[1].localeCompare(b[1]) : sortValue === 'share' ? (parseFloat(b[6]) || 0) - (parseFloat(a[6]) || 0) || a[1].localeCompare(b[1]) : a[1].localeCompare(b[1]));

  return <div className="ca-board">
    <ScoreHead icon="/icons/navigation/combat-achievements.png" kicker="Combat achievements" done={done} total={total}/>
    <FilterBar>
      <SearchBox label="Search combat achievements" placeholder="Search…" value={q} onChange={value => { setQ(value); if (value && mode === 'tiers') setMode('tasks'); }}/>
      <SortMenu label="Combat view" value={mode} onChange={v=>{setMode(v as typeof mode);setQ('');pop.close();}} options={[{value:"tiers",label:"Tiers"},{value:"monsters",label:"Monsters"},{value:"tasks",label:"Tasks"}]}/>
      <SortMenu label="Sort combat achievements" value={sortValue} onChange={setSort} options={sortOptions}/>
      <span className="muted sm">{mode === 'monsters' ? `${monsters.length} monsters` : mode === 'tasks' ? `${tasks.length} tasks` : `${tierRows.length} tiers`}</span>
    </FilterBar>
    <ChipRow label="Combat tier" chips={[{id: 'all', label: 'All tiers', pressed: tier === '', onClick: () => setTier('')}, ...CA_TIERS.map(name => ({id: name, label: name, pressed: tier === name, onClick: () => setTier(name)}))]}/>
    {mode === 'tiers' && <div className="ca-tiers adv-scroll">{tierRows.map(c => (
      <button type="button" key={c.name} className={`ca-tier ${tier === c.name ? 'sel' : ''}`} onClick={() => { setTier(c.name); setMode('tasks'); }}>
        <IconBox src={caIcon(c.name)} alt=""/>
        <b>{c.name}</b>
        <TileProgress done={c.completed} total={c.total} unit="tasks"/>
      </button>))}
    </div>}
    {mode==='monsters'&&<p className="fine combat-data-note">Monster progress is unknown for unfinished tiers; RuneProfile only supplies tier totals.</p>}
    {mode === 'monsters' && <div className="ca-grid adv-scroll">{monsters.map(b => {
      const key = 'boss:' + b.name;
      const done=combatGroupProgress(b.tasks.map(t=>t[4]),combat,CA_TOTALS);
      return <button type="button" key={b.name} className={`ca-tile ${pop.key === key ? 'sel' : ''}`} onClick={() => pop.key === key ? pop.close() : openBoss(b.name, b.tasks)}>
        <IconBox src={bossArtwork(b.name) || '/icons/navigation/combat-achievements.png'} alt=""/>
        <b>{b.name === 'N/A' ? 'General challenges' : b.name}</b>

        <TileProgress done={done} total={b.tasks.length} unit="tasks"/>
      </button>;})}
    </div>}
    {mode === 'tasks' && <div className="adv-scroll task-scroll">{tasks.map(t => {
      const key = 'ca:' + t[0] + ':' + t[1];
      return <button type="button" key={t[0] + t[1]} className={`task-row ca ${pop.key === key ? 'sel' : ''}`} onClick={() => pop.key === key ? pop.close() : openTask(t)}>
        <IconBox src={caIcon(t[4])} alt={t[4]}/>
        <span><b>{t[1]}</b><small>{t[0]}</small></span>
        <em title="Completion across Wiki players, not your account">Wiki {t[6]}</em>
      </button>;})}
    </div>}
  </div>;
}

function BossDetail({name, tasks, combat, onPick}: {name: string; tasks: CaTask[]; combat:NonNullable<Journal['profile']>['combat']; onPick: (t: CaTask) => void}) {
  const done=combatGroupProgress(tasks.map(t=>t[4]),combat,CA_TOTALS);
  const avg = tasks.reduce((s, t) => s + (parseFloat(t[6]) || 0), 0) / Math.max(1, tasks.length);
  return <>
    <PopHead img={bossArtwork(name) || '/icons/navigation/combat-achievements.png'} kicker="Combat achievements" title={name} sub={<span className="muted">{done??"?"}/{tasks.length} tasks · {done===null?"remaining unknown":`${tasks.length-done} left`}</span>}/>
    <div className="pop-block"><span className="kicker">Wiki share of players</span><Meter done={avg} total={100}/><small className="muted">{avg.toFixed(1)}% average · not your ticks</small></div>
    <div className="pick-list combat-picks">{tasks.map(t => <button type="button" key={t[1]} onClick={() => onPick(t)}><IconBox src={caIcon(t[4])} alt=""/><span>{t[1]}</span><small title="Wiki player completion, not your progress">{t[6]}</small></button>)}</div>
    <div className="pop-links">
      <a className="btn primary sm" href={wiki(name) + '/Strategies'} target="_blank" rel="noreferrer">Strategy <ExternalLink size={13}/></a>
      <a className="btn ghost sm" href={wiki(name)} target="_blank" rel="noreferrer">Wiki <ExternalLink size={13}/></a>
    </div>
  </>;
}

function TaskDetail({t, onPick, onBack}: {t: CaTask; onPick: (name: string) => void; onBack: () => void}) {
  const parts = COMBOS[t[1]] ?? [];
  const c = parseFloat(t[6]) || 0;
  return <>
    <PopHead img={caIcon(t[4])} kicker={`${t[4]} · ${t[3]} · ${t[5]} pts`} title={t[1]} sub={<span className="muted">{t[0]}</span>}/>
    <p className="pop-desc">{t[2]}</p>
    <Stats rows={[['Tier', t[4]], ['Type', t[3]], ['Points', String(t[5]), 'y'], ['Wiki share of players', t[6]]]}/>
    <div className="pop-block"><Meter done={c} total={100}/><small className="muted">Not your account. Ticks need a plugin.</small></div>
    {!!parts.length && <div className="pop-block"><span className="kicker">Tasks named in this one</span><div className="pick-list">{parts.map(name => <button type="button" key={name} onClick={() => onPick(name)}><span>{name}</span></button>)}</div><p className="fine">Other catalogue names that appear in the wiki description. Not an account checklist.</p></div>}
    <div className="pop-links">
      <a className="btn primary sm" href={wiki(t[1])} target="_blank" rel="noreferrer">Task <ExternalLink size={13}/></a>
      <a className="btn ghost sm" href={wiki(t[1]) + '#Strategy'} target="_blank" rel="noreferrer">Guide <ExternalLink size={13}/></a>
      <a className="btn ghost sm" href={wiki(t[0]) + '/Strategies'} target="_blank" rel="noreferrer">{t[0]} <ExternalLink size={13}/></a>
      <button type="button" className="btn ghost sm" onClick={onBack}>All {t[0]}</button>
    </div>
  </>;
}
