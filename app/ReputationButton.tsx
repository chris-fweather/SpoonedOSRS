'use client';
import {useEffect, useState} from 'react';
import {ThumbsUp} from 'lucide-react';
import {reputationHint, type Reputation} from '@/lib/reputation';
import {num} from '@/lib/ui';

export function ReputationButton({username, viewerKey, previewCount}: {username:string; viewerKey:string; previewCount?:number}) {
  const [rep, setRep] = useState<Reputation|null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [retry, setRetry] = useState(0);
  const url = '/api/reputation?' + new URLSearchParams({username});
  useEffect(() => {
    if(previewCount!==undefined){setRep({count:previewCount,given:false,signedIn:false,ownProfile:true,available:true});return;}
    const abort = new AbortController();
    setRep(null); setError(''); setNotice('');
    fetch(url, {signal:abort.signal}).then(async r => {
      const data = await r.json() as Reputation & {error?:string};
      if (!r.ok) throw Error(data.error || 'Could not load respect.');
      if (!abort.signal.aborted) setRep(data);
    }).catch(e => {if (!abort.signal.aborted) setError(e.message);});
    return () => abort.abort();
  }, [url, viewerKey, retry, previewCount]);

  async function vote() {
    if (previewCount!==undefined || !rep || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const r = await fetch(url, {method:rep.given ? 'DELETE' : 'PUT'});
      const data = await r.json() as Reputation & {error?:string};
      if (!r.ok) throw Error(data.error || 'Could not update respect.');
      setRep(data); setNotice(data.given ? 'Respect given. Thank you!' : 'Your respect was removed.');
    } catch(e) {setError((e as Error).message);}
    finally {setBusy(false);}
  }

  const disabled = previewCount!==undefined || busy || !rep || (!rep.given && (!rep.available || rep.ownProfile || rep.canVote===false || rep.networkUsed===true));
  const hint = previewCount!==undefined?'Sample reputation · no real votes':rep ? reputationHint(rep) : 'Loading respect…';
  return <div className="profile-reputation" onPointerDown={e=>e.stopPropagation()}>
    <button type="button" className={'rep-button' + (rep?.given ? ' given' : '')} disabled={disabled}
      aria-label={`${rep?.given ? 'Undo your respect' : 'Give +1 respect'} to ${username}${rep ? `; ${rep.count} total` : ''}`}
      aria-pressed={rep?.given ?? false} title={hint} onClick={()=>void vote()}>
      <ThumbsUp size={20} fill={rep?.given ? 'currentColor' : 'none'}/>
      <b>{rep ? num(rep.count,0) : '—'}</b>
    </button>
    <span className="rep-hint" aria-hidden="true">{hint}</span>
    <span className="sr-only" role="status">{notice}</span>
    {error && <div className="rep-error" role="alert">{error}<button type="button" onClick={()=>setRetry(n=>n+1)}>Retry</button></div>}
  </div>;
}
