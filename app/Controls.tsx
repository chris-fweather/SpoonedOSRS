'use client';
import type {ReactNode} from 'react';
import {Search} from 'lucide-react';

export function FilterBar({children}: {children: ReactNode}) {
  return <div className="filter-bar">{children}</div>;
}

export function SearchBox({label, placeholder, value, onChange}: {label: string; placeholder: string; value: string; onChange: (value: string) => void}) {
  return <label className="search small"><Search size={14}/><input aria-label={label} placeholder={placeholder} value={value} onChange={event => onChange(event.target.value)}/></label>;
}

export function ChipRow({label, chips}: {label: string; chips: {id: string; label: string; count?: string; pressed: boolean; onClick: () => void}[]}) {
  return <div className="cats" role="group" aria-label={label}>{chips.map(chip => <button key={chip.id} type="button" aria-pressed={chip.pressed} onClick={chip.onClick}>{chip.label}{chip.count != null && <small>{chip.count}</small>}</button>)}</div>;
}

export function SortMenu({label, value, onChange, options}: {label: string; value: string; onChange: (value: string) => void; options: {value: string; label: string}[]}) {
  return <select className="sort-menu" aria-label={label} value={value} onChange={event => onChange(event.target.value)}>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>;
}

/** One image size for pets, quests, diaries, combat, and the collection log. */
export function IconBox({src, alt = ''}: {src?: string; alt?: string}) {
  return <span className="icon-box">{src ? <img src={src} alt={alt}/> : null}</span>;
}
