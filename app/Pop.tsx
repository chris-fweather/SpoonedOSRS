'use client';
import './side-panel.css';
import {shortStat} from '@/lib/ui';
import type {ReactNode} from 'react';
import {X} from 'lucide-react';
import type {Journal} from '@/lib/model';

/** Side pop-out: anything clickable can open its details here instead of a modal. */
export type PopNode = ReactNode | ((j: Journal) => ReactNode);
export type PopApi = {key: string | null; show: (key: string, node: PopNode) => void; close: () => void};

export function PopShell({onClose, children}: {onClose: () => void; children: ReactNode}) {
  const empty = children == null;
  return <aside className={`pop osrs-panel ${empty ? 'pop-placeholder' : ''}`} aria-label="Details" aria-hidden={empty}>
    {!empty && <div className="pop-bar"><button type="button" className="icon-btn pop-close" aria-label="Close details" onClick={onClose}><X size={16}/></button></div>}
    {!empty && <div className="pop-scroll">{children}</div>}
  </aside>;
}

/** Header used by every pop-out: icon, title, sub line. */
export function PopHead({img, title, sub, kicker, wide}: {img?: string; title: string; sub?: ReactNode; kicker?: ReactNode; wide?: boolean}) {
  return <div className="pop-h">
    {img && <span className={`art ${wide ? 'lg' : 'md'}`}><img src={img} alt=""/></span>}
    <div>{kicker && <span className="kicker">{kicker}</span>}<h3>{title}</h3>{sub && <div className="pop-sub">{sub}</div>}</div>
  </div>;
}

export function Stats({rows}: {rows: [ReactNode, ReactNode, string?][]}) {
  return <dl className="pop-dl">{rows.map(([k, v, c], i) => <div key={i}><dt>{k}</dt><dd className={c} title={typeof v==='string'?v:undefined}>{typeof v==='string'?shortStat(v):v}</dd></div>)}</dl>;
}

// OSRS experience table
const XP: number[] = (() => { const t = [0, 0]; let pts = 0; for (let l = 1; l < 127; l++) { pts += Math.floor(l + 300 * 2 ** (l / 7)); t.push(Math.floor(pts / 4)); } return t; })();
export const xpFor = (level: number) => XP[Math.max(1, Math.min(126, level))];
export function levelFor(xp: number) { let l = 1; while (l < 126 && XP[l + 1] <= xp) l++; return l; }
