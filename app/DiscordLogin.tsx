'use client';
import {useEffect, useRef, useState} from 'react';
import {ChevronDown, EyeOff, Plus, LogOut, Unlink, X} from 'lucide-react';
import {type PublicStaff} from '@/lib/staff-policy';
import {AchievementTitle} from './AchievementTitle';
import type {LinkedMenuAccount} from '@/lib/account-menu';
import {HoverTip} from './HoverTip';
import {DiscordAvatar} from './DiscordAvatar';
import './account-release.css';

export type DiscordUser = {
  id: string;
  username: string;
  globalName: string | null;
  avatarUrl: string;
};

export function DiscordLogin({user, names, viewing, disabled, onSelect, onClaim, onUnlink, onLogout}: {
  user: DiscordUser | null;
  names: string[];
  viewing: string;
  disabled: boolean;
  onSelect: (name: string) => void;
  onClaim: (name: string) => Promise<boolean>;
  onUnlink: (name: string) => Promise<void>;
  onLogout: () => void;
}) {
  const menu = useRef<HTMLDetailsElement>(null);
  const [name, setName] = useState('');
  const [unlinkName,setUnlinkName]=useState<string|null>(null);
  const [linking,setLinking]=useState(false);
  const [linkError,setLinkError]=useState('');
  const [accounts,setAccounts]=useState<LinkedMenuAccount[]>([]);
  const [menuRefresh,setMenuRefresh]=useState(0);
  const [menuOpen,setMenuOpen]=useState(false);
  const namesKey=names.join('|');
  const [staff, setStaff] = useState<PublicStaff|null>(null);
  useEffect(() => {
    if (!user){setStaff(null);setAccounts([]);return;}
    const abort = new AbortController();
    fetch('/api/account-menu', {signal: abort.signal}).then(async r=>r.ok?await r.json() as {staff?:PublicStaff|null;accounts?:LinkedMenuAccount[]}:null).then(data=>{if(!abort.signal.aborted&&data){setStaff(data.staff??null);setAccounts(data.accounts??[]);}}).catch(()=>{});
    return ()=>abort.abort();
  }, [user?.id,namesKey,menuRefresh]);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (menu.current && !menu.current.contains(event.target as Node)) menu.current.open = false;
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);
  if (!user) return <div className="login-actions"><a className="btn sm" href="/api/auth/discord">Sign in / create account</a>{import.meta.env.DEV && <a className="btn sm ghost" href="/api/auth/preview">Local owner preview</a>}</div>;
  const label = user.globalName || user.username;
  const close = () => { if (menu.current) menu.current.open = false; };

  return (
    <>{staff&&<HoverTip className="feature-nav-wrap" touchPreview={false} label="Staff portal" tabIndex={-1}><a className="btn sm ghost feature-nav-icon" href="/staff" aria-label="Staff portal"><img src="/icons/skills/defence.png" alt=""/><span className="feature-nav-label">Staff portal</span></a></HoverTip>}<details className="account-picker discord-user account-release" ref={menu} onToggle={event=>{if(event.target===event.currentTarget){setMenuOpen(event.currentTarget.open);if(event.currentTarget.open)setMenuRefresh(n=>n+1);}}} onKeyDown={event => {
      if (event.key === 'Escape' && menu.current) { menu.current.open = false; menu.current.querySelector('summary')?.focus(); }
    }}>
      <summary>
        <DiscordAvatar src={user.avatarUrl} name={label}/>
        <span className="acct-trigger-name"><b>{label}</b><small>{names.length} linked {names.length===1?'account':'accounts'}</small></span>
        <ChevronDown size={16} className="acct-trigger-chevron"/>
      </summary>
      <div className="account-menu">
        <div className="acct-head"><DiscordAvatar src={user.avatarUrl} name={label}/><span className="acct-head-name"><b>{label}</b><small>Signed in with Discord</small></span><a className="acct-action" href="/account" aria-label="Account settings" title="Account settings"><img src="/icons/community/settings-icon.png" alt="" width={23} height={23}/></a></div>

        <span className="acct-eyebrow">Your RuneScape accounts</span>
        {names.length === 0 && <p className="acct-empty">No RuneScape names linked yet.</p>}
        <div className="acct-list">{names.map(linked => {const account=accounts.find(a=>a.name.toLowerCase()===linked.toLowerCase());const donated=account?.donation.amountMinor;return (
          <div className={'acct-row'+(linked.toLowerCase()===viewing.toLowerCase()?' is-viewing':'')} key={linked}>
            <button type="button" className="acct-profile" disabled={disabled} aria-current={linked.toLowerCase()===viewing.toLowerCase()?'page':undefined} onClick={() => { onSelect(linked); close(); }}>
              <img className="acct-portrait" src={account?.portrait??'/portraits/male-brown-default.svg'} alt=""/>
              <span className="acct-identity"><b className="acct-name">{linked}{account?.title&&<span className="linked-supporter-title"> {account.title}</span>}</b>{(account?.achievementTitle||donated!==null&&donated!==undefined||account?.donation.hidden)&&<span className="linked-title-line">{account?.achievementTitle&&<AchievementTitle label={account.achievementTitle} showHelp={false}/>} {donated!==null&&donated!==undefined&&<small className="linked-donation">{new Intl.NumberFormat('en-US',{style:'currency',currency:account?.donation.currency??'USD',maximumFractionDigits:0}).format(donated/100)}<span> {account?.donation.currency}</span></small>}{account?.donation.hidden&&<small className="linked-donation is-hidden" title="Your donation amount is hidden on your profile"><EyeOff size={11} aria-hidden="true"/> Hidden</small>}</span>}</span>
            </button>
            <a className="acct-action" href={'/player/'+encodeURIComponent(linked)+'?settings=profile'} aria-label={`Profile settings for ${linked}`} title={`Settings for ${linked}`}><img src="/icons/community/settings-icon.png" alt="" width={23} height={23}/></a>
            <button type="button" className="acct-action" aria-label={`Unlink ${linked}`} title={`Unlink ${linked}`} disabled={disabled} onClick={() => setUnlinkName(linked)}><Unlink size={16}/></button>
          </div>
        );})}</div>
        {unlinkName&&<div className="acct-confirm" role="group" aria-label="Confirm unlink">
          <b>Unlink {unlinkName}?</b><p>Your saved progress and privacy stay reserved to this Discord account. You can relink later.</p>
          <div><button type="button" className="btn sm ghost" disabled={disabled} onClick={()=>setUnlinkName(null)}><X size={14}/> Cancel</button><button type="button" className="btn sm" disabled={disabled} onClick={async()=>{await onUnlink(unlinkName);setUnlinkName(null);}}><Unlink size={14}/> Unlink</button></div>
        </div>}

        <details className="acct-add"><summary><span className="acct-add-slot" aria-hidden="true"><Plus size={16}/></span><span className="acct-add-label">Link another account</span></summary><form className="acct-add-form" onSubmit={async event => {
          event.preventDefault();
          setLinking(true);setLinkError('');
          try{if(await onClaim(name)){setName('');close();}else setLinkError('Could not link this name. Check the page message for details.');}
          finally{setLinking(false);}
        }}>
          <label htmlFor="claim-name">RuneScape name</label>
          <div className="acct-add-field"><input id="claim-name" value={name} maxLength={12} required pattern="[A-Za-z0-9 _-]{1,12}" placeholder="e.g. Zezima" autoComplete="off" spellCheck={false} onChange={event => setName(event.target.value)}/><button className="btn primary sm" type="submit" disabled={disabled || linking || !name.trim()}>{linking?'Linking…':'Link'}</button></div>
          <p className="acct-note">Link your own RuneScape name to edit this journal and choose its privacy. Discord sign-in does not verify ownership of the in-game account.</p>
          {linkError&&<p className="acct-error" role="alert">{linkError}</p>}
        </form></details>
        <footer className="acct-foot"><button type="button" className="acct-signout" onClick={() => { close(); onLogout(); }}><LogOut size={15}/> Sign out</button><a className="acct-details" href="/account">Privacy &amp; account details</a></footer>
      </div>
    </details></>
  );
}
