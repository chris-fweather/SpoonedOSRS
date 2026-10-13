// Isolated fixtures in a throwaway Worker (scripts/worker-harness.mjs). Never run this against production.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {seal,SESSION_COOKIE} from '../lib/session.ts';
import {startWorker} from './worker-harness.mjs';
const {origin:base,secret,fetch,rows:sql,dispose}=await startWorker();
const stamp=Date.now(),ids=['11','12','13','14','15','16'].map(p=>p+'00'+stamp),[helper,mod,admin,source,target,outsider]=ids;
const rsn=('mq'+String(stamp).slice(-8)).toLowerCase(),rsn2=('mh'+String(stamp).slice(-8)).toLowerCase();
async function headers(id){return {'Content-Type':'application/json',Origin:base,Cookie:`${SESSION_COOKIE}=${await seal(secret,{id,username:'Moderation QA',globalName:null,avatar:null,exp:Math.floor(Date.now()/1000)+600})}`};}
async function call(path,h,body,status=200){const r=await fetch(base+path,{headers:h,...(body?{method:'POST',body:JSON.stringify(body)}:{})});const raw=await r.text();let d;try{d=JSON.parse(raw);}catch{d={error:raw};}assert.equal(r.status,status,path+' '+JSON.stringify(d));return d;}
const reason='Verified ownership evidence in this isolated test.';
try{
 for(const id of [helper,mod,admin,source])await sql('INSERT INTO users(discord_id,username,updated_at) VALUES(?,?,0)',[id,'Moderation QA']);
 for(const [id,role] of [[helper,'helper'],[mod,'moderator'],[admin,'admin']])await sql('INSERT INTO staff_members(discord_id,role,prefix,revision) VALUES(?,?,NULL,?)',[id,role,'test-'+id]);
 const journal=JSON.parse(readFileSync('lib/seed.json','utf8'));journal.username=rsn;journal.pets.forEach(p=>{p.obtained=false;p.notes='Private former owner note';p.priority=true;});journal.log={obtained:0,total:1717,tabs:[]};journal.hiscores={skills:[],activities:[]};
 await sql('INSERT INTO journals(id,data,revision) VALUES(?,?,1)',[rsn,JSON.stringify(journal)]);
 await sql('INSERT INTO claimed_names(rsn,display_name,discord_id,claimed_at) VALUES(?,?,?,0)',[rsn,rsn,source]);
 await sql('INSERT INTO profile_link_owners(rsn,discord_id,linked_at) VALUES(?,?,0)',[rsn,source]);
 const h=await headers(helper),m=await headers(mod),a=await headers(admin),o=await headers(outsider);
 await call('/api/staff/cases',{},undefined,401);await call('/api/staff/cases',o,undefined,403);
 const create={action:'create',username:rsn,operation:'relink',targetId:target,reason};
 await call('/api/staff/cases',{...h,Origin:'https://invalid.example'},create,403);
 const c=await call('/api/staff/cases',h,create);
 const byProfile=await call('/api/staff/cases?q='+rsn,m);assert.ok(byProfile.users.some(u=>u.discord_id===source));
 const byDiscord=await call('/api/staff/cases?q='+encodeURIComponent('Moderation QA'),m);assert.ok(byDiscord.items.some(item=>item.id===c.id));
 assert.deepEqual((await call('/api/staff/cases?q='+rsn,h)).users,[]);
 const approve={action:'review',id:c.id,decision:'approved',confirmed:true,reason};
 await call('/api/staff/cases',h,approve,403);
 await call('/api/staff/cases',m,{...approve,confirmed:false},400);
 // Crossing the boundary after creation must promote the pending case to admin review.
 journal.pets.slice(0,50).forEach(p=>p.obtained=true);
 await sql('UPDATE journals SET data=?,revision=revision+1 WHERE id=?',[JSON.stringify(journal),rsn]);
 await call('/api/staff/cases',m,approve,403);
 await call('/api/staff/cases',h,create,403);
 await call('/api/staff/cases?id='+c.id,h,undefined,403);
 await call('/api/staff/cases',a,approve);
 assert.equal((await sql('SELECT discord_id FROM claimed_names WHERE rsn=?',[rsn]))[0].discord_id,target);
 assert.equal((await sql('SELECT visibility FROM profile_visibility WHERE rsn=?',[rsn]))[0].visibility,'private');
 const stored=JSON.parse((await sql('SELECT data FROM journals WHERE id=?',[rsn]))[0].data);assert.equal(stored.pets[0].notes,'');assert.equal(stored.pets[0].priority,false);assert.equal(stored.pets.filter(p=>p.obtained).length,50);
 assert.ok((await sql('SELECT 1 FROM transfer_private_archives WHERE case_id=?',[c.id])).length);
 await call('/api/staff/cases',a,approve,409);
 await call('/api/journal',await headers(source),{username:rsn,pet:stored.pets[0],revision:3},403);
 await call('/api/staff/progress?username='+rsn,m,undefined,403);
 const loaded=await call('/api/staff/progress?username='+rsn,a);assert.ok(loaded.journal.pets.every(p=>p.notes===''));
 const pet={...loaded.journal.pets[0],date:'2026-10-01',notes:'must not overwrite private notes'};
 const patch={username:rsn,pet,revision:loaded.journal.revision,reason,confirmed:true};
 await call('/api/staff/progress',m,patch,403);await call('/api/staff/progress',a,{...patch,confirmed:false},400);
 await call('/api/staff/progress',a,patch);await call('/api/staff/progress',a,patch,409);
 assert.equal(JSON.parse((await sql('SELECT data FROM journals WHERE id=?',[rsn]))[0].data).pets[0].date,'2026-10-01');
 assert.equal(JSON.parse((await sql('SELECT data FROM journals WHERE id=?',[rsn]))[0].data).pets[0].notes,'');
 const c2=await call('/api/staff/cases',m,{...create,operation:'unlink'});await call('/api/staff/cases',a,{...approve,id:c2.id});
 assert.equal((await sql('SELECT * FROM claimed_names WHERE rsn=?',[rsn])).length,0);assert.match((await sql('SELECT discord_id FROM profile_link_owners WHERE rsn=?',[rsn]))[0].discord_id,/^moderation-hold:/);
 // A held name cannot be held twice; releasing the hold frees it, and the released case still opens.
 await call('/api/staff/cases',m,{...create,operation:'unlink'},400);
 const c3=await call('/api/staff/cases',m,{action:'create',username:rsn,operation:'release',reason});
 await call('/api/staff/cases',m,{...approve,id:c3.id},403);await call('/api/staff/cases',a,{...approve,id:c3.id});
 assert.equal((await sql('SELECT * FROM profile_link_owners WHERE rsn=?',[rsn])).length,0);assert.equal((await sql('SELECT * FROM profile_visibility WHERE rsn=?',[rsn])).length,0);
 assert.equal((await call('/api/staff/cases?id='+c3.id,a)).item.action,'release');assert.ok((await call('/api/staff/cases?q='+rsn,a)).items.some(item=>item.id===c3.id));
 await call('/api/staff/cases',a,{action:'create',username:rsn,operation:'release',reason},404);
 assert.ok((await sql("SELECT 1 FROM account_actions WHERE rsn=? AND action='progress corrected'",[rsn])).length);
 // Hold names: a moderator holds an unprotected name straight away; a helper (no permission) only opens a request.
 await sql('INSERT INTO journals(id,data,revision) VALUES(?,?,1)',[rsn2,JSON.stringify({...journal,username:rsn2,pets:journal.pets.map(p=>({...p,obtained:false})),log:{obtained:0,total:1717,tabs:[]}})]);
 await sql('INSERT INTO claimed_names(rsn,display_name,discord_id,claimed_at) VALUES(?,?,?,0)',[rsn2,rsn2,source]);
 await sql('INSERT INTO profile_link_owners(rsn,discord_id,linked_at) VALUES(?,?,0)',[rsn2,source]);
 const pendingHold=await call('/api/staff/cases',h,{action:'create',username:rsn2,operation:'unlink',reason});
 assert.equal((await sql('SELECT state FROM staff_cases WHERE id=?',[pendingHold.id]))[0].state,'pending');
 await call('/api/staff/cases',a,{...approve,id:pendingHold.id,decision:'rejected'});
 const held=await call('/api/staff/cases',m,{action:'create',username:rsn2,operation:'unlink',reason});
 const row=(await sql('SELECT state,reviewer_id FROM staff_cases WHERE id=?',[held.id]))[0];assert.equal(row.state,'approved');assert.equal(row.reviewer_id,mod);
 assert.equal((await sql('SELECT * FROM claimed_names WHERE rsn=?',[rsn2])).length,0);assert.match((await sql('SELECT discord_id FROM profile_link_owners WHERE rsn=?',[rsn2]))[0].discord_id,/^moderation-hold:/);
 console.log('PASS: CSRF/auth, helper and moderator limits, changed protection thresholds, unknown destination ID, no self-approval, atomic transfer, private-note isolation, old-owner revocation, admin progress confirmation/revision/audit, unlink hold, hold release and immediate holds under the Hold names permission.');
}finally{
 for(const table of ['transfer_private_archives'])await sql(`DELETE FROM ${table} WHERE case_id IN (SELECT id FROM staff_cases WHERE rsn=?)`,[rsn]);
 for(const name of [rsn,rsn2])for(const table of ['claimed_names','profile_link_owners','profile_visibility','profile_presentation','profile_supporter_totals','account_actions','staff_cases'])await sql(`DELETE FROM ${table} WHERE rsn=?`,[name]);await sql('DELETE FROM journals WHERE id=?',[rsn2]);
 await sql('DELETE FROM journals WHERE id=?',[rsn]);for(const id of ids){await sql('DELETE FROM staff_members WHERE discord_id=?',[id]);await sql('DELETE FROM users WHERE discord_id=?',[id]);}
}
await dispose();
