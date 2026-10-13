// Disposable local fixtures only; no production requests or upstream imports.
import assert from 'node:assert/strict';
import {seal,SESSION_COOKIE} from '../lib/session.ts';
import {initial} from '../lib/model.ts';
import {emptyGuide} from '../lib/guides.ts';
import {startWorker} from './worker-harness.mjs';
const {origin:base,secret,fetch,sql,dispose}=await startWorker();
const stamp=Date.now(),ids=['owner','helper','stranger'].map((_,i)=>'97'+stamp+i),names=['W'+String(stamp).slice(-7)+'A','W'+String(stamp).slice(-7)+'B'],guideIds=[];
async function auth(id){const token=await seal(secret,{id,username:'Workspace fixture',globalName:null,avatar:null,exp:Math.floor(Date.now()/1000)+300});return {'Content-Type':'application/json',Origin:base,Cookie:`${SESSION_COOKIE}=${token}`};}
async function api(path,headers,body,status=200){const r=await fetch(base+path,{headers,method:body?'POST':'GET',...(body?{body:JSON.stringify(body)}:{})});const raw=await r.text();let b;try{b=JSON.parse(raw);}catch{b={error:raw};}assert.equal(r.status,status,path+': '+JSON.stringify(b));return b;}
try{
 for(const id of ids)await sql('INSERT INTO users(discord_id,username,updated_at) VALUES(?,?,0)',[id,'Workspace fixture']);
 for(const [i,role] of ['owner','helper'].entries())await sql('INSERT INTO staff_members(discord_id,role,revision) VALUES(?,?,?)',[ids[i],role,'fixture']);
 for(const name of names)await sql('INSERT INTO claimed_names(rsn,display_name,discord_id,claimed_at) VALUES(?,?,?,?)',[name.toLowerCase(),name,ids[1],Math.floor(stamp/1000)]);
 const owner=await auth(ids[0]),helper=await auth(ids[1]),stranger=await auth(ids[2]);
 await api('/api/account-settings',{},null,401);
 const account=await api('/api/account-settings',helper);assert.equal(account.accounts.length,2);
 const privacy={username:names[0],visibility:'private',details:{pets:false,log:false,skills:false},showDonation:false};
 await api('/api/account-settings',stranger,privacy,403);
 await api('/api/account-settings',{...helper,Origin:'https://evil.invalid'},privacy,403);
 await api('/api/profile',helper,{username:names[0],appearance:{body:'male',hair:'brown',background:'castle'}});
 await api('/api/account-settings',helper,privacy);
 assert.equal((await sql('SELECT background FROM profile_options WHERE rsn=?',[names[0].toLowerCase()]))[0][0],'castle');
 assert.equal((await api('/api/account-settings',helper)).accounts.find(a=>a.name===names[0]).visibility,'private');
 assert.equal((await api('/api/account-settings',helper)).accounts.find(a=>a.name===names[1]).visibility,'public');
 const journal=structuredClone(initial);journal.username=names[1];journal.revision=0;journal.log={obtained:1,total:1,tabs:[{name:'Bosses',pages:[{name:'Test',obtained:1,total:1,items:[{id:4151,name:'Abyssal whip',quantity:1}]}]}]};
 await sql('INSERT INTO journals(id,data,revision) VALUES(?,?,0)',[names[1].toLowerCase(),JSON.stringify(journal)]);
 const dateBody={username:names[1],itemId:4151,date:'2025-08-22',revision:0};
 await api('/api/collection-date',stranger,dateBody,403);
 await api('/api/collection-date',{...helper,Origin:'https://evil.invalid'},dateBody,403);
 await api('/api/collection-date',helper,{...dateBody,date:'2025-02-30'},400);
 const dated=await api('/api/collection-date',helper,dateBody);assert.equal(dated.collectionDates['4151'],'2025-08-22');
 await api('/api/collection-date',helper,dateBody,409);
 const cleared=await api('/api/collection-date',helper,{...dateBody,date:'',revision:dated.revision});assert.equal(cleared.collectionDates['4151'],undefined);
 const controls=await api('/api/staff/profile?username='+names[1],owner);assert.equal(controls.linkedNames.length,2);
 await api('/api/staff',owner,{action:'permissions',username:names[0],permissions:{guides:true,publish:false,corrections:false,planning:false,review:false,ownership:false,holds:false}});
 const dashboard=await api('/api/staff',helper);assert.equal(dashboard.viewer.permissions.guides,true);assert.equal(dashboard.changes.length,0);assert.equal(dashboard.players.length,0);assert.equal(dashboard.observations.length,0);
 await api('/api/staff',helper,{action:'propose',kind:'rate'},403);
 await api('/api/staff',helper,{action:'permissions',username:names[0],permissions:{guides:true,publish:true,corrections:true,planning:true,review:true,ownership:true,holds:true}},403);
 const guide={...emptyGuide(),title:'Workspace QA',activity:'Kraken',summary:'Disposable local integration fixture.',strategy:'Prepare the supplied equipment before starting this activity.',requiredItems:[{id:'385',quantity:2,privateField:'discard'}]};
 guideIds.push((await api('/api/staff/guides',helper,{action:'save',guide})).id);
 assert.ok(!(await api('/api/staff/guides',helper)).guides.find(g=>g.id===guideIds[0]).guide.requiredItems[0].privateField);
 await api('/api/staff',owner,{action:'permissions',username:names[1],permissions:{guides:false,publish:false,corrections:false,planning:false,review:false,ownership:false,holds:false}});
 await api('/api/staff/guides',helper,null,403);
 await api('/api/staff/guides',helper,{action:'save',guide},403);
 console.log('PASS: collection date persistence/clear/validation/stale revision and access checks; account-scoped privacy, cross-user/origin rejection, wallpaper preservation, linked-name staff scope, guide-only permissions and denied workspace reads/writes.');
}finally{
 for(const id of guideIds)await sql('DELETE FROM community_guides WHERE id=?',[id]);
 for(const name of names){await sql('DELETE FROM journals WHERE id=?',[name.toLowerCase()]);for(const table of ['profile_options','profile_visibility','profile_presentation','profile_appearance','profile_link_owners','claimed_names'])await sql(`DELETE FROM ${table} WHERE rsn=?`,[name.toLowerCase()]);}
 for(const id of ids){await sql('DELETE FROM staff_audit WHERE actor_id=? OR target_id=?',[id,id]);await sql('DELETE FROM staff_permissions WHERE discord_id=?',[id]);await sql('DELETE FROM staff_members WHERE discord_id=?',[id]);await sql('DELETE FROM users WHERE discord_id=?',[id]);}
}
await dispose();
