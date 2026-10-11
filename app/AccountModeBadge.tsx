import {ACCOUNT_MODES,type AccountMode} from '@/lib/account-mode';
import {HoverTip} from './HoverTip';
import './account-mode-badge.css';
/** The account type's badge from the site icon pack; hovering names the account type. */
/** Inside a link (board rows) the badge uses a plain title instead of its own focusable hover tip. */
export function AccountModeBadge({mode,showHelp=true}:{mode?:AccountMode|null;showHelp?:boolean}){
 if(!mode||mode==='normal')return null;
 const label=ACCOUNT_MODES[mode];if(!label)return null;
 const img=<img src={`/icons/account-modes/${mode.replaceAll('_','-')}.png`} width={10} height={13} alt={label}/>;
 return showHelp?<HoverTip className="account-mode-badge" label={label}>{img}</HoverTip>:<span className="account-mode-badge" title={label}>{img}</span>;
}
