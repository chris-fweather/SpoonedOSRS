'use client';
import {rankNameClass} from '@/lib/staff-policy';
import {useEffect, useId, useState, type FormEvent} from 'react';
import {Search} from 'lucide-react';
import {DiscordLogin, type DiscordUser} from './DiscordLogin';
import {playerSuggestions, type PlayerSuggestion} from '@/lib/player-search';
import './site-brand.css';
import {StaffPrefix} from './StaffBadge';

const NAME = /^[A-Za-z0-9 _-]{1,12}$/;

export function SiteBrand() {
  return <a className="brand" href="/"><img src="/brand/rocky-mascot.webp" alt=""/><span>Spooned OSRS<small>OSRS pet &amp; drop tracker</small></span></a>;
}

export function PlayerSearch() {
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const [players, setPlayers] = useState<PlayerSuggestion[]>([]);
  const [open, setOpen] = useState(false), [requested, setRequested] = useState(false);
  const [loading, setLoading] = useState(false), [unavailable, setUnavailable] = useState(false);
  const [active, setActive] = useState(-1);
  const id = useId();
  const matches = playerSuggestions(players, q);
  const expanded = open && q.trim().length > 0;
  useEffect(() => {
    if (!requested) return;
    const abort = new AbortController();
    setLoading(true);
    const timer=setTimeout(()=>{
      fetch('/api/accounts?q='+encodeURIComponent(q.trim()),{signal:abort.signal}).then(async r=>{
        if(!r.ok)throw Error();const data=await r.json() as {accounts:string[]};
        if(!abort.signal.aborted){setPlayers(data.accounts.map(name=>({name})));setUnavailable(false);setLoading(false);}
      }).catch(()=>{if(!abort.signal.aborted){setUnavailable(true);setLoading(false);}});
    },250);
    return ()=>{clearTimeout(timer);abort.abort();};
  }, [requested,q]);
  function submit(event: FormEvent) {
    event.preventDefault();
    const name = expanded && active >= 0 && matches[active] ? matches[active].name : q.trim();
    if (!NAME.test(name)) {
      setError('Enter a RuneScape name of 1–12 letters, numbers, spaces, underscores or hyphens.');
      return;
    }
    setError('');
    window.location.assign('/player/' + encodeURIComponent(name));
  }
  return <form className="player-search" role="search" onSubmit={submit} onBlur={event => {if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);}}>
    <button type="submit" aria-label="Find player"><Search size={16} aria-hidden="true"/></button>
    <input aria-label="Search players" role="combobox" aria-autocomplete="list" aria-expanded={expanded} aria-controls={expanded ? id : undefined} aria-activedescendant={expanded && active >= 0 ? `${id}-${active}` : undefined} autoComplete="off" spellCheck={false} placeholder="Search a RuneScape name…" value={q} maxLength={12}
      onFocus={() => {setOpen(true); setRequested(true);}}
      onChange={event => {setQ(event.target.value); setOpen(true); setActive(-1); if (error) setError('');}}
      onKeyDown={event => {if (event.key === 'Escape') {setOpen(false); setActive(-1);} else if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && matches.length) {event.preventDefault(); setOpen(true); setActive(n => event.key === 'ArrowDown' ? (n + 1) % matches.length : (n <= 0 ? matches.length - 1 : n - 1));}}}/>
    {expanded && <div className="player-suggestions"><div className="suggestion-heading">{loading ? 'Finding saved profiles…' : 'Saved profiles'}</div><ul id={id} role="listbox" aria-label="Matching players">{matches.map((player, index) => <li key={player.name} id={`${id}-${index}`} role="option" aria-selected={active === index}><a href={'/player/' + encodeURIComponent(player.name)} tabIndex={-1} onMouseDown={e => e.preventDefault()} onMouseEnter={() => setActive(index)}><img src="/icons/navigation/stats-icon.png" alt=""/><span><b><StaffPrefix staff={player.staff} donation={player.donation}/><span className={rankNameClass(player.staff)}>{player.name}</span>{player.title && <small className="rs-title">{player.title}</small>}</b></span><span aria-hidden="true">↗</span></a></li>)}</ul>{!loading && !matches.length && <p>{unavailable ? 'Suggestions unavailable. You can still open a profile by name.' : 'No saved match yet. Look up this name to view its journal.'}</p>}{NAME.test(q.trim()) && <button type="button" className="direct-player" onMouseDown={e => e.preventDefault()} onClick={() => window.location.assign('/player/' + encodeURIComponent(q.trim()))}>Open “{q.trim()}” <span aria-hidden="true">→</span></button>}</div>}
    {error && <span className="search-error" role="alert">{error}</span>}
  </form>;
}

export function SiteAuth({onError}: {onError?: (message: string) => void}) {
  const [auth, setAuth] = useState<{user: DiscordUser | null; names: string[]}>({user: null, names: []});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    fetch('/api/auth/session').then(async response => {
      if (!response.ok || !live) return;
      setAuth(await response.json() as {user: DiscordUser | null; names: string[]});
    }).catch(() => {});
    return () => { live = false; };
  }, []);
  async function refresh() {
    try {
      const response = await fetch('/api/auth/session');
      if (response.ok) setAuth(await response.json() as {user: DiscordUser | null; names: string[]});
    } catch { /* the header stays on the last session it loaded */ }
  }
  async function claim(name: string) {
    setBusy(true);
    try {
      const response = await fetch('/api/accounts', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({username: name})});
      const body = await response.json() as {username?: string; error?: string};
      if (!response.ok) throw Error(body.error || 'Could not claim that name.');
      await refresh();
      if (body.username) window.location.assign('/player/' + encodeURIComponent(body.username));
      return true;
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Could not claim that name.');
      return false;
    } finally { setBusy(false); }
  }
  async function unlink(name: string) {
    setBusy(true);
    try {
      const response = await fetch('/api/accounts', {method: 'DELETE', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({username: name})});
      const body = await response.json() as {error?: string};
      if (!response.ok) throw Error(body.error || 'Could not unlink that name.');
      await refresh();
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Could not unlink that name.');
    } finally { setBusy(false); }
  }
  async function logout() {
    const response = await fetch('/api/auth/logout', {method: 'POST'});
    if (!response.ok) {
      const body = await response.json() as {error?: string};
      onError?.(body.error || 'Could not log out.');
      return;
    }
    setAuth({user: null, names: []});
  }
  return <DiscordLogin user={auth.user} names={auth.names} viewing="" disabled={busy} onSelect={name => window.location.assign('/player/' + encodeURIComponent(name))} onClaim={claim} onUnlink={unlink} onLogout={() => void logout()}/>;
}
