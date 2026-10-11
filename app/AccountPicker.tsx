'use client';
import {useEffect, useRef} from 'react';
import {Check, ChevronDown} from 'lucide-react';

export function AccountPicker({username, accounts, disabled, onSelect}: {
  username: string;
  accounts: string[];
  disabled: boolean;
  onSelect: (name: string) => void;
}) {
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (menu.current && !menu.current.contains(event.target as Node)) menu.current.open = false;
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);
  return (
    <details className="account-picker" ref={menu} onKeyDown={event => {
      if (event.key === 'Escape' && menu.current) { menu.current.open = false; menu.current.querySelector('summary')?.focus(); }
    }}>
      <summary>
        <span className="avatar">{username[0]}</span>
        <span><b>{username}</b></span>
        <ChevronDown size={16}/>
      </summary>
      <div className="account-menu">
        <span className="eyebrow">YOUR ACCOUNTS</span>
        {accounts.map(account => (
          <button key={account} type="button" disabled={disabled} onClick={() => { onSelect(account); if (menu.current) menu.current.open = false; }}>
            <span>{account}</span>{account === username && <Check size={16}/>}
          </button>
        ))}
      </div>
    </details>
  );
}
