import type {PlayerLookup} from '@/lib/player-lookup';
export function PlayerStatus({lookup,username,saved,onRetry}:{lookup:PlayerLookup|null;username:string;saved:boolean;onRetry:()=>void}){
 if(lookup?.state!=='not_found')return null;
 return <div className="player-status not_found" role="status"><span><b>Player not found in public sources</b><small>Check the spelling of {username}. A missing public listing does not prove the account does not exist.{saved?' Saved progress is still shown.':''}</small></span><button type="button" className="link" onClick={onRetry}>Check again</button></div>;
}
