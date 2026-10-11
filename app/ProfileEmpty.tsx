import './profile-placeholders.css';
export function ProfileEmpty({section,icon}:{section:string;icon:string;canEdit?:boolean;busy?:boolean;onSync?:()=>void}) {
 return <div className="profile-empty profile-empty-minimal" role="status" aria-label={`${section}: not yet synced`}><img src={icon} alt=""/><h3>Not yet synced</h3></div>;
}
