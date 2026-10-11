"use client";
import {useEffect,useState} from 'react';
import {DiscordMark} from './DiscordMark';
import {Check,RefreshCw} from 'lucide-react';
/** Records the member's consent for the role bridge, which polls and applies website staff and supporter roles in the Discord server. Nicknames are never changed. */
export function DiscordSyncPreferences(){
 const [configured,setConfigured]=useState<boolean|null>(null),[message,setMessage]=useState(''),[state,setState]=useState<'idle'|'busy'|'done'|'error'>('idle');
 useEffect(()=>{const c=new AbortController();fetch('/api/account-discord',{signal:c.signal}).then(async r=>{if(!r.ok)throw Error('Discord role syncing is unavailable right now.');setConfigured(((await r.json()) as {configured?:boolean}).configured===true);}).catch(e=>{if(!c.signal.aborted){setState('error');setMessage(e.message);}});return()=>c.abort();},[]);
 async function sync(){setState('busy');setMessage('');try{const r=await fetch('/api/account-discord',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nickname:null,supporterRole:true})});const b=await r.json().catch(()=>({})) as {error?:string};if(!r.ok)throw Error(b.error||'Could not sync your Discord roles. Try again.');setState('done');setMessage(configured===false?'Saved. Role syncing turns on once the server bot is running.':'Done. Your roles will update in the server within a few minutes.');}catch(e){setState('error');setMessage((e as Error).message);}}
 return <section className="community-panel discord-roles-panel" aria-labelledby="discord-roles-title">
  <span className="discord-roles-icon" aria-hidden="true"><DiscordMark/></span>
  <div className="discord-roles-copy"><h2 id="discord-roles-title">Discord server</h2><p>If you&apos;re in the SpoonedOSRS Discord server, your website roles (staff and supporter) are applied there.</p></div>
  <div className="discord-roles-action"><button type="button" className="btn primary save-button" disabled={state==='busy'||configured===null&&state!=='error'} onClick={()=>void sync()}>{state==='busy'?<RefreshCw size={15} className="spin" aria-hidden="true"/>:state==='done'?<Check size={15} aria-hidden="true"/>:<RefreshCw size={15} aria-hidden="true"/>}{state==='busy'?'Syncing…':'Sync Discord roles'}</button></div>
  <p className={'discord-roles-status'+(state==='error'?' is-error':state==='done'?' is-done':'')} role="status">{message}</p>
 </section>;
}
