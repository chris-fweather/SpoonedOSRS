import {env} from 'cloudflare:workers';
import {HttpError} from './auth';
import {db,sameOrigin} from './storage';
import {areaGuard,requireStaffArea} from './staff-store';
import {publicMessage} from './request-body';
import {parseGuide,mayEditGuide} from './guides';
/** Rechecked inside each write, so access removed mid-request cannot still save. */
const guides=areaGuard('guides');
type Row={id:string;author_id:string;title:string;draft:string;published:string|null;revision:number;updated_at:string;published_at:string|null};
/** Published guides with a public byline: the author's earliest claimed name with a public profile (never a private one), their staff rank, when the guide first went live and when it was last updated. */
export async function publicGuides(){
 const rows=await db().prepare(`SELECT g.id,g.published,g.published_at,
  (SELECT c.display_name FROM claimed_names c LEFT JOIN profile_visibility v ON v.rsn=c.rsn WHERE c.discord_id=g.author_id AND COALESCE(v.visibility,'public')='public' ORDER BY c.claimed_at LIMIT 1) AS author,
  (SELECT s.role FROM staff_members s WHERE s.discord_id=g.author_id) AS author_role,
  (SELECT MIN(a.created_at) FROM staff_audit a WHERE a.target_id=g.id AND a.action='guide-publish') AS first_published
  FROM community_guides g WHERE g.published IS NOT NULL ORDER BY g.published_at DESC LIMIT 200`).all<{id:string;published:string;published_at:string;author:string|null;author_role:string|null;first_published:string|null}>();
 return rows.results.map(r=>({id:r.id,guide:JSON.parse(r.published),publishedAt:r.first_published??r.published_at,updatedAt:r.published_at,author:r.author?{name:r.author,role:r.author_role}:null}));
}
export async function guideDashboard(req:Request){const viewer=await requireStaffArea(req,'guides');const rows=await db().prepare('SELECT * FROM community_guides ORDER BY updated_at DESC LIMIT 200').all<Row>();return {viewer:{id:viewer.id,role:viewer.role,canPublish:viewer.permissions.publish,canUpload:!!env.UPLOADS},guides:rows.results.map(r=>({id:r.id,authorId:r.author_id,guide:JSON.parse(r.draft),revision:r.revision,publishedAt:r.published_at,changesPending:r.published!==null&&r.published!==r.draft,updatedAt:r.updated_at,canEdit:mayEditGuide(viewer.role,viewer.id,r.author_id)}))};}
export async function writeGuide(req:Request,body:Record<string,unknown>){
 try{sameOrigin(req);}catch{throw new HttpError(403,'Use the guide editor to save.');}
 const actor=await requireStaffArea(req,'guides'),database=db(),now=new Date().toISOString();
 const id=typeof body.id==='string'?body.id:'';
 const prior=id?await database.prepare('SELECT * FROM community_guides WHERE id=?').bind(id).first<Row>():null;
 if(id&&!prior)throw new HttpError(404,'Guide not found.');
 if(prior&&body.revision!==prior.revision)throw new HttpError(409,'This guide changed. Reload before saving.');
 if(body.action==='save'){
  if(prior&&!mayEditGuide(actor.role,actor.id,prior.author_id))throw new HttpError(403,'You can edit your own drafts. Admins may maintain other guides.');
  let guide;try{guide=parseGuide(body.guide);}catch(e){throw new HttpError(400,publicMessage(e,'Check the guide fields and try again.'));}
  if(!prior){const key=crypto.randomUUID();const result=await database.prepare(`INSERT INTO community_guides(id,author_id,title,draft,updated_at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM staff_members s WHERE ${guides} AND s.discord_id=?)`).bind(key,actor.id,guide.title,JSON.stringify(guide),now,actor.id).run();if(!result.meta.changes)throw new HttpError(409,'Staff access changed. Reload.');return {id:key};}
  const result=await database.prepare(`UPDATE community_guides SET title=?,draft=?,revision=revision+1,updated_at=? WHERE id=? AND revision=? AND EXISTS(SELECT 1 FROM staff_members s WHERE ${guides} AND s.discord_id=? AND s.role=?)`).bind(guide.title,JSON.stringify(guide),now,id,prior.revision,actor.id,actor.role).run();if(!result.meta.changes)throw new HttpError(409,'Guide or staff access changed. Reload.');return {id};
 }
 if(body.action==='publish'||body.action==='unpublish'){
  if(!prior)throw new HttpError(400,'Save the guide before publishing.');
  if(!actor.permissions.publish)throw new HttpError(403,'Your staff access does not include publishing guides.');
  const publish=body.action==='publish';
  const result=await database.batch([
   database.prepare(`UPDATE community_guides SET published=?,published_at=?,publisher_id=?,revision=revision+1 WHERE id=? AND revision=? AND EXISTS(SELECT 1 FROM staff_members s WHERE ${guides} AND ${areaGuard('publish')} AND s.discord_id=? AND s.role=?)`).bind(publish?prior.draft:null,publish?now:null,actor.id,id,prior.revision,actor.id,actor.role),
   database.prepare("INSERT INTO staff_audit(actor_id,target_id,action,detail,created_at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM community_guides WHERE id=? AND revision=? AND publisher_id=?)").bind(actor.id,id,publish?'guide-publish':'guide-unpublish',prior.title,now,id,prior.revision+1,actor.id)
  ]);if(!result[0].meta.changes)throw new HttpError(409,'Guide or staff access changed. Reload.');return {id};
 }
 throw new HttpError(400,'Unknown guide action.');
}
