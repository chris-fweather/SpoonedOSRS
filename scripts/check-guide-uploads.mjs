// Local, disposable staff fixtures; never run against production.
import assert from 'node:assert/strict';
import {seal,SESSION_COOKIE} from '../lib/session.ts';
import {emptyGuide} from '../lib/guides.ts';
import {startWorker} from './worker-harness.mjs';
const png=n=>{const b=new Uint8Array(n);b.set([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);b[n-1]=n%251;return b;};
async function auth(w,id){return {Origin:w.origin,Cookie:`${SESSION_COOKIE}=${await seal(w.secret,{id,username:'Upload QA',globalName:null,avatar:null,exp:Math.floor(Date.now()/1000)+300})}`};}
async function upload(w,h,body,status=200){const r=await w.fetch(w.origin+'/api/staff/guides/upload',{method:'POST',headers:{...h,'Content-Type':'image/png'},body});const j=await r.json();assert.equal(r.status,status,JSON.stringify(j));return j;}
// Without a bucket (a deploy before R2 exists): the editor hides uploads and the route explains.
{
 const w=await startWorker();
 try{
  await w.sql('INSERT INTO users(discord_id,username,updated_at) VALUES(?,?,0)',['98100000000000001','Upload QA']);await w.sql("INSERT INTO staff_members(discord_id,role,revision) VALUES('98100000000000001','helper','t')");
  const h=await auth(w,'98100000000000001');
  const d=await (await w.fetch(w.origin+'/api/staff/guides',{headers:h})).json();assert.equal(d.viewer?.canUpload,false,JSON.stringify(d));
  assert.match((await upload(w,h,png(100),503)).error,/not set up/);
 }finally{await w.dispose();}
}
const w=await startWorker({r2:true});
try{
 const helper='98200000000000001',stranger='98300000000000001';
 await w.sql('INSERT INTO users(discord_id,username,updated_at) VALUES(?,?,0)',[helper,'Upload QA']);await w.sql("INSERT INTO staff_members(discord_id,role,revision) VALUES(?,'helper','t')",[helper]);
 const h=await auth(w,helper);
 assert.equal((await (await w.fetch(w.origin+'/api/staff/guides',{headers:h})).json()).viewer.canUpload,true);
 // Only staff with guide access, from the site, with a real image.
 await upload(w,{Origin:w.origin},png(100),401);
 await upload(w,await auth(w,stranger),png(100),403);
 await upload(w,{...h,Origin:'https://example.invalid'},png(100),403);
 assert.match((await upload(w,h,new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'),415)).error,/PNG, JPG, GIF or WebP/);
 assert.match((await upload(w,h,png(3*1024*1024+1),413)).error,/3 MB/);
 // Stored once by content, served with a year of caching and the right type.
 const first=await upload(w,h,png(2048));assert.match(first.url,/^\/api\/uploads\?f=[0-9a-f]{64}\.png$/);assert.equal(first.reused,false);
 assert.equal((await upload(w,h,png(2048))).reused,true);
 assert.deepEqual(await w.sql('SELECT bytes,type FROM guide_uploads'),[[2048,'image/png']]);
 const served=await w.fetch(w.origin+first.url);assert.equal(served.status,200);assert.equal(served.headers.get('content-type'),'image/png');assert.match(served.headers.get('cache-control'),/immutable/);assert.equal((await served.arrayBuffer()).byteLength,2048);
 assert.equal((await w.fetch(w.origin+'/api/uploads?f=../../secret')).status,404);
 assert.equal((await w.fetch(w.origin+'/api/uploads?f='+'0'.repeat(64)+'.png')).status,404);
 // A guide may use the upload; any other site path is still refused.
 const guide={...emptyGuide(),title:'Upload QA',activity:'Kraken',summary:'Disposable upload fixture.',strategy:'Local-only fixture for upload checks.',blocks:[{id:'pic',kind:'image',url:first.url,caption:'Kraken'}]};
 const save=async(g,status)=>{const r=await w.fetch(w.origin+'/api/staff/guides',{method:'POST',headers:{...h,'Content-Type':'application/json'},body:JSON.stringify({action:'save',guide:g})});assert.equal(r.status,status,await r.text());};
 await save(guide,200);
 await save({...guide,blocks:[{id:'pic',kind:'image',url:'/api/staff/guides',caption:''}]},400);
 // Space caps: the whole bucket, then the person's daily allowance.
 await w.sql("INSERT INTO guide_uploads(key,uploader_id,bytes,type,created_at) VALUES('guides/big.png','someone',1073741000,'image/png','2020-01-01T00:00:00Z')");
 assert.match((await upload(w,h,png(4096),507)).error,/storage is full/);
 await w.sql("DELETE FROM guide_uploads WHERE key='guides/big.png'");
 for(let i=0;i<24;i++)await w.sql("INSERT INTO guide_uploads(key,uploader_id,bytes,type,created_at) VALUES(?,?,10,'image/png',?)",['guides/day'+i+'.png',helper,new Date().toISOString()]);
 assert.match((await upload(w,h,png(4096),429)).error,/25 images/);
 console.log('PASS guide uploads: staff only, real images, size, daily and total caps, dedupe, caching, guide links');
}finally{await w.dispose();}
