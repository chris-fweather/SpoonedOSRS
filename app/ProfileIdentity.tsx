import {StaffPrefix} from './StaffBadge';
import {AccountModeBadge} from './AccountModeBadge';
import {AchievementTitle} from './AchievementTitle';
import {HoverTip} from './HoverTip';
import {donationLabel,type Donation} from '@/lib/presentation';
import {rankNameClass,type PublicStaff} from '@/lib/staff-policy';
import type {Journal} from '@/lib/model';
import './profile-identity.css';
export type IdentityProps={username:string;accountMode:Journal['accountMode'];staff?:PublicStaff|null;donation?:Donation;title:string|null;earnedTitle:string|null};
/** A player's name block as their profile shows it: staff scimitar and Sir, account mode, name, donation title, then the achievement title.
 * The name and the achievement title start at the same edge (as in the account menu), so Sir always sits right beside the name. */
export function ProfileIdentity({username,accountMode,staff,donation,title,earnedTitle}:IdentityProps){
 return <div className={`char-name ${username.length>9?'long-name':''}`}><div className="profile-identity"><span className="profile-prefixes"><StaffPrefix staff={staff} donation={donation}/></span><span className="profile-mode"><AccountModeBadge mode={accountMode}/></span><div className="profile-name-lines"><b><span className={rankNameClass(staff)}>{username}</span>{title && <HoverTip className="rs-title" label={donationLabel(donation)}>{title}</HoverTip>}</b>{earnedTitle && <AchievementTitle label={earnedTitle}/>}</div></div></div>;
}
