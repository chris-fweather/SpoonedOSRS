import {env} from 'cloudflare:workers';
import {HttpError} from './auth';
import {db,sameOrigin} from './storage';
import {areaGuard,requireStaffArea} from './staff-store';
import {takeBudget} from './request-controls';
import {UPLOAD_LIMITS,sniffImage,typeOfFile,uploadFile,uploadKey,uploadUrl} from './guide-upload-rules';
const guides=areaGuard('guides');
const mb=(n:number)=>Math.round(n/1024/1024);
/** Store a guide image from staff with guide access. Refuses anything over the per-file, daily or total caps before writing. */
export async function uploadGuideImage(req:Request){
 try{sameOrigin(req);}catch{throw new HttpError(403,'Upload from the guide editor.');}
 const bucket=env.UPLOADS;if(!bucket)throw new HttpError(503,'Image uploads are not set up yet. Paste a link instead.');
 const actor=await requireStaffArea(req,'guides');await takeBudget('guide-upload:'+actor.id,10,60);
 const declared=Number(req.headers.get('content-length'));if(declared>UPLOAD_LIMITS.fileBytes)throw new HttpError(413,`Images can be up to ${mb(UPLOAD_LIMITS.fileBytes)} MB.`);
 const reader=req.body?.getReader();if(!reader)throw new HttpError(400,'Choose an image to upload.');
 const chunks:Uint8Array[]=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>UPLOAD_LIMITS.fileBytes){await reader.cancel();throw new HttpError(413,`Images can be up to ${mb(UPLOAD_LIMITS.fileBytes)} MB.`);}chunks.push(value);}
 const bytes=new Uint8Array(size);let n=0;for(const c of chunks){bytes.set(c,n);n+=c.length;}
 const type=sniffImage(bytes);if(!type)throw new HttpError(415,'Upload a PNG, JPG, GIF or WebP image.');
 const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join(''),key=uploadKey(hash,type),database=db();
 // The same picture is stored once; uploading it again costs nothing.
 if(await database.prepare('SELECT 1 FROM guide_uploads WHERE key=?').bind(key).first())return {url:uploadUrl(key),bytes:size,reused:true};
 const since=new Date(Date.now()-86_400_000).toISOString();
 const usage=await database.prepare('SELECT (SELECT COALESCE(SUM(bytes),0) FROM guide_uploads) AS total,(SELECT COUNT(*) FROM guide_uploads WHERE uploader_id=? AND created_at>?) AS files,(SELECT COALESCE(SUM(bytes),0) FROM guide_uploads WHERE uploader_id=? AND created_at>?) AS mine').bind(actor.id,since,actor.id,since).first<{total:number;files:number;mine:number}>();
 if(!usage)throw new HttpError(503,'Uploads are temporarily unavailable.');
 if(usage.total+size>UPLOAD_LIMITS.totalBytes)throw new HttpError(507,'Image storage is full. Paste a link instead, or ask the owner to clear old uploads.');
 if(usage.files>=UPLOAD_LIMITS.dailyFiles||usage.mine+size>UPLOAD_LIMITS.dailyBytes)throw new HttpError(429,`You can upload ${UPLOAD_LIMITS.dailyFiles} images (${mb(UPLOAD_LIMITS.dailyBytes)} MB) a day. Try again tomorrow or paste a link.`);
 // Record first (only while the uploader still has guide access), then store, so a failed write never leaves an uncounted file.
 const now=new Date().toISOString();
 const row=await database.prepare(`INSERT OR IGNORE INTO guide_uploads(key,uploader_id,bytes,type,created_at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM staff_members s WHERE ${guides} AND s.discord_id=?)`).bind(key,actor.id,size,type,now,actor.id).run();
 if(!row.meta.changes&&!await database.prepare('SELECT 1 FROM guide_uploads WHERE key=?').bind(key).first())throw new HttpError(409,'Staff access changed. Reload.');
 try{await bucket.put(key,bytes,{httpMetadata:{contentType:type,cacheControl:'public, max-age=31536000, immutable'}});}
 catch{await database.prepare('DELETE FROM guide_uploads WHERE key=? AND created_at=?').bind(key,now).run();throw new HttpError(503,'Could not store the image. Try again.');}
 return {url:uploadUrl(key),bytes:size,reused:false};
}
/** Serve an upload. Files never change (named by content hash), so browsers and Cloudflare's edge cache keep them for a year. */
export async function serveGuideImage(req:Request){
 const file=uploadFile(new URL(req.url).searchParams.get('f'));if(!file)return new Response('Not found',{status:404});
 const cache=(globalThis.caches as unknown as {default?:Cache}|undefined)?.default;
 // Keyed by address alone, never by the visitor's cookies.
 const key=new URL(req.url).origin+'/api/uploads?f='+file;
 const hit=await cache?.match(key);if(hit)return hit;
 const object=await env.UPLOADS?.get('guides/'+file);if(!object)return new Response('Not found',{status:404,headers:{'Cache-Control':'no-store'}});
 const res=new Response(object.body,{headers:{'Content-Type':typeOfFile(file),'Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox",'Content-Disposition':'inline'}});
 if(cache)await cache.put(key,res.clone()).catch(()=>{});
 return res;
}
