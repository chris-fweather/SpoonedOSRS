// The profile cog's staff panel against the built Worker: rank changes, profile settings, unlink and relink,
// with every refusal (rank, own account, owner, cross-origin, unconfirmed, moderation hold) and the audit rows.
import assert from 'node:assert/strict';
import {seal,SESSION_COOKIE} from '../lib/session.ts';
import {startWorker} from './worker-harness.mjs';
import {initial} from '../lib/model.ts';
const {origin:base,secret,fetch,sql,dispose}=await startWorker();
const people={owner:'32000000000000001',admin:'32000000000000002',admin2:'32000000000000003',moderator:'32000000000000004',helper:'32000000000000005',member:'32000000000000006'};
const names={owner:'SP Owner',admin:'SP Admin',admin2:'SP Admin2',moderator:'SP Mod',helper:'SP Helper',member:'SP Member'};
async function auth(who,origin=base){return {'Content-Type':'application/json',Origin:origin,Cookie:`${SESSION_COOKIE}=${await seal(secret,{id:people[who],username:'panel_'+who,globalName:null,avatar:null,exp:Math.floor(Date.now()/1000)+300})}`};}
async function api(path,headers,body,status=200){
 const r=await fetch(base+path,{headers,...(body?{method:'POST',body:JSON.stringify(body)}:{})});const raw=await r.text();let b;try{b=JSON.parse(raw);}catch{b={error:raw};}
 assert.equal(r.status,status,path+' '+JSON.stringify(body??{})+': '+JSON.stringify(b));return b;
}
const view=async(who,name)=>api('/api/staff/profile?username='+encodeURIComponent(names[name]??name),await auth(who));
const panel=async(who,name,body,status=200,origin)=>api('/api/staff/profile',await auth(who,origin),{username:names[name]??name,...body},status);
const actions=async rsn=>(await sql("SELECT action,actor_id,detail FROM account_actions WHERE rsn=? AND action LIKE 'staff %' ORDER BY id",[rsn.toLowerCase()])).map(([action,actor,detail])=>{const d=JSON.parse(detail);delete d.token;return [action,actor,d];});

for(const [who,id] of Object.entries(people)){
 await sql('INSERT INTO users(discord_id,username,updated_at) VALUES(?,?,0)',[id,'panel_'+who]);
 await sql('INSERT INTO claimed_names(rsn,display_name,discord_id,claimed_at) VALUES(?,?,?,0)',[names[who].toLowerCase(),names[who],id]);
 await sql('INSERT INTO profile_link_owners(rsn,discord_id,linked_at) VALUES(?,?,0)',[names[who].toLowerCase(),id]);
}
// The member has one pet: the Pet Hunter title and the 1 pet badge are theirs, nothing rarer.
const journal=structuredClone(initial);journal.username=names.member;journal.pets[0].obtained=true;
await sql('INSERT INTO journals(id,data,revision) VALUES(?,?,0)',[names.member.toLowerCase(),JSON.stringify(journal)]);
for(const who of ['owner','admin','admin2','moderator','helper'])await sql("INSERT INTO staff_members(discord_id,role,revision) VALUES(?,?,'fixture')",[people[who],who.replace(/2$/,'')]);

// Only admins and the owner open the panel; it says what this viewer may change.
await api('/api/staff/profile?username=SP%20Member',{},null,401);
for(const who of ['moderator','helper'])await api('/api/staff/profile?username=SP%20Member',await auth(who),null,403);
await api('/api/staff/profile?username=bad%3Cname',await auth('admin'),null,400);
const memberView=await view('admin','member');
assert.deepEqual([memberView.role,memberView.allowed,memberView.manage,memberView.account.linked,memberView.account.canUnlink,memberView.profile.visibility],[null,['helper','moderator',null],true,true,true,'public']);
assert.deepEqual((await view('owner','member')).allowed,['helper','moderator','admin',null]);
const adminOnAdmin=await view('admin','admin2');assert.deepEqual([adminOnAdmin.allowed,adminOnAdmin.manage,adminOnAdmin.account.canUnlink],[[],false,false]);
assert.equal((await view('admin','owner')).manage,false);assert.equal((await view('admin','admin')).manage,false);

// Rank from the panel: the shared grant action, same limits, audited.
const grant=async(who,target,role,status=200,origin)=>api('/api/staff',await auth(who,origin),{action:'grant',username:names[target],role},status);
await grant('moderator','member','helper',403);
await grant('admin','member','admin',403);
await grant('admin','member','moderator',403,'https://evil.example');
await grant('admin','member','owner',400);
await grant('admin','member','moderator');
assert.equal((await view('admin','member')).role,'moderator');
await grant('admin','member',null);
assert.equal((await view('admin','member')).role,null);
assert.deepEqual((await sql("SELECT action,actor_id,detail FROM staff_audit WHERE target_id=? ORDER BY id",[people.member])).map(([a,actor,d])=>[a,actor,JSON.parse(d)]),
 [['grant',people.admin,{from:null,to:'moderator'}],['revoke',people.admin,{from:'moderator',to:null}]]);

// Profile settings: refused for moderators, other admins' accounts, your own, the owner's, cross-origin and bad values.
await panel('moderator','member',{action:'visibility',visibility:'private'},403);
await panel('helper','member',{action:'visibility',visibility:'private'},403);
await panel('admin','admin2',{action:'visibility',visibility:'private'},403);
await panel('admin','admin',{action:'visibility',visibility:'private'},403);
await panel('admin','owner',{action:'visibility',visibility:'private'},403);
await panel('admin','member',{action:'visibility',visibility:'private'},403,'https://evil.example');
await panel('admin','member',{action:'visibility',visibility:'hidden'},400);
await panel('admin','member',{action:'rename'},400);
assert.equal((await sql('SELECT COUNT(*) FROM profile_visibility WHERE rsn=?',[names.member.toLowerCase()]))[0][0],0,'refusals change nothing');
assert.ok((await api('/api/leaderboard',{})).rows.some(r=>r.name===names.member),'public profiles are on the leaderboard');
await panel('admin','member',{action:'visibility',visibility:'private'});
assert.equal((await view('admin','member')).profile.visibility,'private');
assert.ok(!(await api('/api/leaderboard',{})).rows.some(r=>r.name===names.member),'a private profile leaves the leaderboards');
await panel('owner','admin2',{action:'visibility',visibility:'private'});
// Clearing an achievement title and a display badge.
await sql("INSERT INTO profile_presentation(rsn,title_choice) VALUES(?,'auto')",[names.member.toLowerCase()]);
await sql("UPDATE claimed_names SET pinned_mark='pets-1' WHERE rsn=?",[names.member.toLowerCase()]);
await panel('moderator','member',{action:'clear-title'},403);
await panel('admin','member',{action:'clear-title'});
await panel('admin','member',{action:'clear-badge'});
assert.deepEqual(await sql('SELECT p.title_choice,c.pinned_mark FROM profile_presentation p JOIN claimed_names c ON c.rsn=p.rsn WHERE p.rsn=?',[names.member.toLowerCase()]),[['none',null]]);
// Assigning a title and a badge: only real, unlocked titles and earned badges; "none" clears.
const lists=(await view('admin','member')).profile;
assert.ok(lists.titles.some(t=>t.id==='pet-hunter'&&t.unlocked)&&lists.titles.some(t=>t.id==='maxed'&&!t.unlocked),'every title is listed, locked ones marked');
assert.deepEqual(lists.badges.map(b=>b.id),['pets-1'],'only earned badges are offered');
await panel('moderator','member',{action:'set-title',title:'pet-hunter'},403);
await panel('admin','admin2',{action:'set-title',title:'pet-hunter'},403);
await panel('admin','owner',{action:'set-badge',badge:'pets-1'},403);
await panel('admin','member',{action:'set-title',title:'pet-hunter'},403,'https://evil.example');
await panel('admin','member',{action:'set-title',title:'the Greatest'},400);
await panel('admin','member',{action:'set-title',title:'maxed'},400);
await panel('admin','member',{action:'set-badge',badge:'pets-60'},400);
await panel('admin','member',{action:'set-badge',badge:42},400);
await panel('admin','member',{action:'set-title',title:'pet-hunter'});
await panel('owner','member',{action:'set-badge',badge:'pets-1'});
const assigned=(await view('admin','member')).profile;
assert.deepEqual([assigned.title,assigned.titleId,assigned.badge,assigned.badgeId],['the Pet Hunter','pet-hunter','1 pet','pets-1']);
await panel('admin','member',{action:'set-badge',badge:null});
await panel('admin','member',{action:'set-title',title:'none'});
assert.deepEqual(await sql('SELECT p.title_choice,c.pinned_mark FROM profile_presentation p JOIN claimed_names c ON c.rsn=p.rsn WHERE p.rsn=?',[names.member.toLowerCase()]),[['none',null]]);
assert.deepEqual(await actions(names.member),[['staff visibility',people.admin,{from:'public',to:'private'}],['staff title cleared',people.admin,{from:'auto'}],['staff badge cleared',people.admin,{from:'pets-1'}],
 ['staff title set',people.admin,{from:'none',to:'pet-hunter'}],['staff badge set',people.owner,{from:null,to:'pets-1'}],['staff badge cleared',people.admin,{from:'pets-1'}],['staff title cleared',people.admin,{from:'pet-hunter'}]]);

// Unlink: admin+ only, confirmed, the name stays reserved to its Discord account; relink only back to that account.
await panel('moderator','member',{action:'unlink',confirmed:true},403);
await panel('admin','admin2',{action:'unlink',confirmed:true},403);
await panel('admin','member',{action:'unlink'},400);
await panel('admin','member',{action:'unlink',confirmed:true},403,'https://evil.example');
assert.equal((await sql('SELECT discord_id FROM claimed_names WHERE rsn=?',[names.member.toLowerCase()]))[0][0],people.member);
await panel('admin','member',{action:'unlink',confirmed:true});
assert.deepEqual(await sql('SELECT discord_id FROM claimed_names WHERE rsn=?',[names.member.toLowerCase()]),[]);
assert.deepEqual(await sql('SELECT discord_id FROM profile_link_owners WHERE rsn=?',[names.member.toLowerCase()]),[[people.member]]);
const unlinked=await view('admin','member');
assert.deepEqual([unlinked.account.linked,unlinked.account.canRelink,unlinked.account.username,unlinked.profile],[false,true,'panel_member',null]);
await panel('admin','member',{action:'unlink',confirmed:true},409);
await panel('admin','member',{action:'visibility',visibility:'public'},409);
await panel('moderator','member',{action:'relink',confirmed:true},403);
await panel('owner','member',{action:'relink'},400);
await panel('owner','member',{action:'relink',confirmed:true});
assert.deepEqual(await sql('SELECT discord_id,display_name FROM claimed_names WHERE rsn=?',[names.member.toLowerCase()]),[[people.member,names.member]]);
await panel('owner','member',{action:'relink',confirmed:true},409);
assert.deepEqual((await actions(names.member)).slice(-2),[['staff unlink',people.admin,{from:people.member}],['staff relink',people.owner,{to:people.member}]]);
// A moderation hold is released only by a reviewed account request.
await sql("INSERT INTO profile_link_owners(rsn,discord_id,linked_at) VALUES('sp held','moderation-hold:case-1',0)");
const held=await view('owner','SP Held');assert.deepEqual([held.account.hold,held.account.canRelink,held.manage],[true,false,false]);
await panel('owner','SP Held',{action:'relink',confirmed:true},404);
console.log('PASS: staff panel opens for admins and the owner only; rank changes keep the grant limits and audit; visibility (and leaderboard exclusion), title and badge assignment from the real unlocked lists and clears, unlink (reserved to the same Discord account) and relink are audited; moderators, helpers, other admins, own and owner accounts, cross-origin, bad values, unconfirmed and stale requests are refused; moderation holds stay with account requests.');
await dispose();
