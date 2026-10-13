// Staff ranks, workspace access and the corrections review queue, against the built Worker.
import assert from 'node:assert/strict';
import {seal,SESSION_COOKIE} from '../lib/session.ts';
import {startWorker} from './worker-harness.mjs';
const {origin:base,secret,fetch,sql,dispose}=await startWorker();
const people={owner:'31000000000000001',admin:'31000000000000002',admin2:'31000000000000003',moderator:'31000000000000004',helper:'31000000000000005',target:'31000000000000006',stranger:'31000000000000007'};
const names={owner:'SR Owner',admin:'SR Admin',admin2:'SR Admin2',moderator:'SR Mod',helper:'SR Helper',target:'SR Target',stranger:'SR Stranger'};
async function auth(who,origin=base){return {'Content-Type':'application/json',Origin:origin,Cookie:`${SESSION_COOKIE}=${await seal(secret,{id:people[who],username:'Staff QA '+who,globalName:null,avatar:null,exp:Math.floor(Date.now()/1000)+300})}`};}
async function api(path,headers,body,status=200){
 const r=await fetch(base+path,{headers,...(body?{method:'POST',body:JSON.stringify(body)}:{})});const raw=await r.text();let b;try{b=JSON.parse(raw);}catch{b={error:raw};}
 assert.equal(r.status,status,path+' '+JSON.stringify(body??{})+': '+JSON.stringify(b));return b;
}
const role=async who=>(await api('/api/staff/access',await auth(who))).staff?.role??null;
const grant=async(who,target,next,status=200,origin)=>api('/api/staff',await auth(who,origin),{action:'grant',username:names[target],role:next},status);

for(const [who,id] of Object.entries(people)){
 await sql('INSERT INTO users(discord_id,username,updated_at) VALUES(?,?,0)',[id,'Staff QA '+who]);
 await sql('INSERT INTO claimed_names(rsn,display_name,discord_id,claimed_at) VALUES(?,?,?,0)',[names[who].toLowerCase(),names[who],id]);
}
for(const who of ['owner','admin','admin2','moderator','helper'])await sql("INSERT INTO staff_members(discord_id,role,revision) VALUES(?,?,'fixture')",[people[who],who.replace(/2$/,'')]);

// Who counts as staff, and who can open the portal.
assert.deepEqual(await api('/api/staff/access',{}),{staff:null});
assert.equal(await role('stranger'),null);assert.equal(await role('helper'),'helper');assert.equal(await role('owner'),'owner');
await api('/api/staff',{},null,401);
await api('/api/staff',await auth('stranger'),null,403);
const helperView=await api('/api/staff',await auth('helper'));
assert.deepEqual([helperView.members.length,helperView.audit.length,helperView.players.length],[0,0,0],'helpers see no staff list, audit or player directory');
assert.deepEqual(helperView.viewer.permissions,{guides:true,publish:false,corrections:true,planning:true,review:false,ownership:false,holds:false},'helpers propose but do not approve');
const listed=new Set((await api('/api/staff',await auth('owner'))).members.map(m=>m.discord_id));
assert.ok(['owner','admin','admin2','moderator','helper'].every(who=>listed.has(people[who])),'the owner sees the staff list');
// The Permissions tab (team, rank permissions, access history) is for admins and the owner; moderators see none of it.
const adminView=await api('/api/staff',await auth('admin'));
assert.ok(adminView.members.length>0&&adminView.rolePermissions,'admins see the team and rank permissions');
const modTeam=await api('/api/staff',await auth('moderator'));
assert.deepEqual([modTeam.members.length,modTeam.audit.length,modTeam.rolePermissions],[0,0,null],'moderators see no team, access history or rank permissions');
assert.ok(adminView.players.length>0,'admins keep the player directory');

// Ranks: admins manage helpers and moderators; only the owner manages admins; nobody changes their own rank or the owner's.
await grant('helper','target','helper',403);
await grant('moderator','target','helper',403);
await grant('admin','target','moderator',403,'https://evil.example');
assert.equal(await role('target'),null);
await grant('admin','target','moderator');assert.equal(await role('target'),'moderator');
await grant('admin','target','admin',403);
await grant('admin','admin2','helper',403);
await grant('admin','admin','helper',403);
await grant('admin','owner',null,403);
await grant('owner','target','owner',400);
await grant('owner','owner','admin',403);
await api('/api/staff',await auth('admin'),{action:'grant',username:'SR Unlinked',role:'helper'},400);
await grant('owner','target','admin');assert.equal(await role('target'),'admin');
await grant('owner','target',null);assert.equal(await role('target'),null);
const audit=await sql("SELECT action,detail FROM staff_audit WHERE target_id=? ORDER BY id",[people.target]);
assert.deepEqual(audit.map(([action,detail])=>[action,JSON.parse(detail)]),[['grant',{from:null,to:'moderator'}],['grant',{from:'moderator',to:'admin'}],['revoke',{from:'admin',to:null}]]);
await api('/api/staff',await auth('helper'),{action:'prefix',prefix:'Lord'},400);
await api('/api/staff',await auth('helper'),{action:'prefix',prefix:'Sir'});
assert.equal((await api('/api/staff/access',await auth('helper'))).staff.prefix,'Sir');

// Corrections: evidence is required, helpers propose but cannot approve, and nobody approves their own proposal.
const record={action:'propose',kind:'record',pet:'Pet chaos elemental',username:'SR Target',count:420,unit:'kills',reason:'Screenshot shows the drop at 420 kills.',source:'https://example.com/proof.png'};
await api('/api/staff',await auth('moderator'),{...record,source:'http://example.com/proof.png'},400);
await api('/api/staff',await auth('moderator'),{...record,reason:'Too short'},400);
await api('/api/staff',await auth('moderator'),{...record,kind:'rate',target:'unknown',denominator:5000,source:'https://example.com/rate'},400);
await api('/api/staff',await auth('moderator'),record);
const [[id]]=await sql("SELECT id FROM staff_changes WHERE actor_id=? AND state='pending'",[people.moderator]);
await api('/api/staff',await auth('moderator'),{action:'review',id,decision:'approved'},403);
await api('/api/staff',await auth('helper'),{action:'review',id,decision:'approved'},403);
await api('/api/staff',await auth('admin'),{action:'review',id,decision:'maybe'},400);
await api('/api/staff',await auth('admin'),{action:'review',id,decision:'approved'});
await api('/api/staff',await auth('owner'),{action:'review',id,decision:'rejected'},409);
assert.deepEqual(await sql("SELECT state,reviewer_id FROM staff_changes WHERE id=?",[id]),[['approved',people.admin]]);
assert.equal(JSON.parse((await sql("SELECT payload FROM staff_overrides WHERE kind='record' AND target=?",['Pet chaos elemental']))[0][0]).count,420);
assert.ok((await api('/api/staff',await auth('moderator'))).changes.some(c=>c.id===id&&c.state==='approved'));
// Helpers propose by default; a moderator approves it.
await api('/api/staff',await auth('helper'),{...record,count:421});
const [[helperChange]]=await sql("SELECT id FROM staff_changes WHERE actor_id=? AND state='pending'",[people.helper]);
await api('/api/staff',await auth('helper'),{action:'review',id:helperChange,decision:'rejected'},403);
await api('/api/staff',await auth('moderator'),{action:'review',id:helperChange,decision:'rejected'});

// Rank permissions: only the owner edits what each rank opens; members of that rank pick it up, own rows still win.
const roleBody=(role,permissions)=>({action:'role-permissions',role,permissions});
const shipped={helper:{guides:true,publish:false,corrections:true,planning:true,review:false,ownership:false,holds:false},moderator:{guides:true,publish:true,corrections:true,planning:true,review:true,ownership:true,holds:true},admin:{guides:true,publish:true,corrections:true,planning:true,review:true,ownership:true,holds:true}};
const helperApproves={guides:true,publish:true,corrections:true,planning:false,review:true,ownership:false,holds:false};
assert.deepEqual((await api('/api/staff',await auth('owner'))).rolePermissions,shipped);
for(const who of ['admin','moderator','helper'])await api('/api/staff',await auth(who),roleBody('helper',helperApproves),403);
await api('/api/staff',await auth('owner','https://evil.example'),roleBody('helper',helperApproves),403);
await api('/api/staff',await auth('owner'),roleBody('owner',helperApproves),400);
await api('/api/staff',await auth('owner'),roleBody('helper',{...helperApproves,review:'yes'}),400);
await api('/api/staff',await auth('owner'),roleBody('helper',{guides:true,corrections:true,planning:false,review:true}),400);
await api('/api/staff',await auth('owner'),roleBody('helper',{...helperApproves,admin:true}),400);
assert.deepEqual((await api('/api/staff',await auth('helper'))).viewer.permissions,shipped.helper,'rejected requests change nothing');
await api('/api/staff',await auth('owner'),roleBody('helper',helperApproves));
assert.deepEqual((await api('/api/staff',await auth('helper'))).viewer.permissions,helperApproves,'helpers pick up the new rank default');
assert.deepEqual((await api('/api/staff',await auth('owner'))).rolePermissions.helper,helperApproves);
// The write guard follows the rank row: with approval on, a helper can decide a proposal from their rank (never their own),
// but never one from a higher rank.
await api('/api/staff',await auth('moderator'),{...record,count:426});
const [[modChange]]=await sql("SELECT id FROM staff_changes WHERE actor_id=? AND state='pending'",[people.moderator]);
await api('/api/staff',await auth('helper'),{action:'review',id:modChange,decision:'rejected'},403);
await api('/api/staff',await auth('admin'),{action:'review',id:modChange,decision:'rejected'});
await sql("INSERT INTO users(discord_id,username,updated_at) VALUES('helper-two','Helper two',0)");await sql("INSERT INTO staff_members(discord_id,role,revision) VALUES('helper-two','helper','t')");
await sql("INSERT INTO staff_changes(kind,target,payload,source,reason,base_revision,actor_id,actor_name,state,created_at) VALUES('record','Pet chaos elemental','{}','https://example.com/x','Second helper proposal for review.',0,'helper-two','Helper two','pending','2026-01-01T00:00:00Z')");
const [[peerChange]]=await sql("SELECT id FROM staff_changes WHERE actor_id='helper-two'");
await api('/api/staff',await auth('helper'),{action:'review',id:peerChange,decision:'rejected'});
// A moderator never signs off an admin's proposal; an admin or the owner does.
await api('/api/staff',await auth('admin'),{...record,count:427});
const [[adminChange]]=await sql("SELECT id FROM staff_changes WHERE actor_id=? AND state='pending'",[people.admin]);
await api('/api/staff',await auth('moderator'),{action:'review',id:adminChange,decision:'approved'},403);
await api('/api/staff',await auth('owner'),{action:'review',id:adminChange,decision:'rejected'});
// Notes and decision reasons join the correction's timeline and stay out of the access history.
await api('/api/staff',await auth('helper'),{action:'correction-note',id:adminChange,note:'x'},400);
await api('/api/staff',await auth('helper'),{action:'correction-note',id:adminChange,note:'Checked the Wiki history too.'});
await api('/api/staff',await auth('admin'),{...record,count:429});
const [[reasonChange]]=await sql("SELECT id FROM staff_changes WHERE actor_id=? AND state='pending'",[people.admin]);
await api('/api/staff',await auth('owner'),{action:'review',id:reasonChange,decision:'rejected',reason:'Screenshot does not show the kill count.'});
{const d=await api('/api/staff',await auth('owner'));const n=d.changes.find(c=>c.id===adminChange).notes;assert.deepEqual(n.map(x=>[x.kind,x.text]),[['note','Checked the Wiki history too.']]);
 assert.deepEqual(d.changes.find(c=>c.id===reasonChange).notes.map(x=>[x.kind,x.text]),[['reason','Screenshot does not show the kill count.']]);
 assert.ok(!d.audit.some(a=>a.action.startsWith('correction-')),'correction notes stay out of the access history');}
assert.deepEqual(await sql("SELECT action,target_id,actor_id,detail FROM staff_audit WHERE action='role-permissions'"),[['role-permissions','role:helper',people.owner,JSON.stringify({role:'helper',from:shipped.helper,to:helperApproves})]]);
await api('/api/staff',await auth('owner'),roleBody('helper',shipped.helper));
// A member's own row wins over the rank, and clearing it restores the rank default.
const guidesOnly={guides:true,publish:false,corrections:false,planning:false,review:false,ownership:false,holds:false};
await api('/api/staff',await auth('owner'),{action:'permissions',username:names.helper,permissions:guidesOnly});
assert.equal((await api('/api/staff',await auth('helper'))).viewer.permissions.corrections,false);
await api('/api/staff',await auth('helper'),{...record,count:422},403);
assert.equal((await api('/api/staff',await auth('owner'))).members.find(m=>m.discord_id===people.helper).custom,true);
// Admins and the owner give or clear a member's own access within their grant reach; moderators and helpers are refused.
for(const who of ['moderator','helper'])for(const permissions of [null,shipped.helper])
 await api('/api/staff',await auth(who),{action:'permissions',username:names.helper,permissions},403);
await api('/api/staff',await auth('admin'),{action:'permissions',username:names.admin2,permissions:guidesOnly},403);
await api('/api/staff',await auth('admin'),{action:'permissions',username:names.admin,permissions:guidesOnly},403);
await api('/api/staff',await auth('owner','https://evil.example'),{action:'permissions',username:names.helper,permissions:null},403);
assert.equal((await api('/api/staff',await auth('helper'))).viewer.permissions.corrections,false,'refused requests change nothing');
await api('/api/staff',await auth('admin'),{action:'permissions',username:names.helper,permissions:null});
assert.equal((await api('/api/staff',await auth('helper'))).viewer.permissions.corrections,true);
assert.equal((await api('/api/staff',await auth('owner'))).members.find(m=>m.discord_id===people.helper).custom,false);
assert.deepEqual((await sql("SELECT actor_id,detail FROM staff_audit WHERE action='permissions' AND target_id=? ORDER BY id",[people.helper])).map(([actor,detail])=>[actor,JSON.parse(detail)]),
 [[people.owner,guidesOnly],[people.admin,{reset:true}]],'every member grant is in the audit trail, with who made it');
// End to end: custom access opens exactly what it says, on the read and on the write, for a moderator too.
await api('/api/staff',await auth('admin'),{action:'permissions',username:names.moderator,permissions:{guides:false,publish:false,corrections:false,planning:true,review:false,ownership:true,holds:true}});
const modView=await api('/api/staff',await auth('moderator'));
assert.deepEqual(modView.viewer.permissions,{guides:false,publish:false,corrections:false,planning:true,review:false,ownership:true,holds:true});
await api('/api/staff/guides',await auth('moderator'),null,403);
await api('/api/staff',await auth('moderator'),{...record,count:425},403);
await api('/api/staff',await auth('owner'),{action:'permissions',username:names.moderator,permissions:null});
assert.deepEqual((await api('/api/staff',await auth('moderator'))).viewer.permissions,shipped.moderator);
// The owner edits the admin rank too; every admin picks it up, the owner never loses an area.
await api('/api/staff',await auth('owner'),roleBody('admin',{...shipped.admin,guides:false}));
for(const who of ['admin','admin2'])assert.equal((await api('/api/staff',await auth(who))).viewer.permissions.guides,false,who+' follows the admin rank');
await api('/api/staff/guides',await auth('admin'),null,403);
await api('/api/staff',await auth('admin'),roleBody('admin',shipped.admin),403);
await api('/api/staff',await auth('owner'),roleBody('admin',shipped.admin));
assert.equal((await api('/api/staff',await auth('admin'))).viewer.permissions.guides,true);
// The access history shows the rank edits and member grants with who made them.
const history=(await api('/api/staff',await auth('owner'))).audit;
assert.ok(history.some(a=>a.action==='role-permissions'&&a.target_id==='role:admin'&&a.actor_id===people.owner),'rank edits are in the access history');
assert.ok(history.some(a=>a.action==='permissions'&&a.target_id===people.moderator&&a.target_name==='Staff QA moderator'),'member grants are in the access history');
// Turning approval off for a rank closes reviewing for that rank (the owner keeps everything).
await api('/api/staff',await auth('owner'),roleBody('moderator',{...shipped.moderator,review:false}));
await api('/api/staff',await auth('helper'),{...record,count:428});
const [[helperLater]]=await sql("SELECT id FROM staff_changes WHERE actor_id=? AND state='pending'",[people.helper]);
await api('/api/staff',await auth('moderator'),{action:'review',id:helperLater,decision:'rejected'},403);
assert.deepEqual((await api('/api/staff',await auth('owner'))).viewer.permissions,shipped.admin);
await api('/api/staff',await auth('owner'),roleBody('moderator',shipped.moderator));
await api('/api/staff',await auth('moderator'),{action:'review',id:helperLater,decision:'rejected'});
assert.equal((await sql("SELECT COUNT(*) FROM staff_audit WHERE action='role-permissions'"))[0][0],6);

// Bot setup is owner-only and same-origin.
await api('/api/staff/discord',await auth('admin'),{},403);
await api('/api/staff/discord',await auth('owner','https://evil.example'),{},403);
// Drop-rate search for Corrections: only staff with the corrections area, results carry the item icon.
await api('/api/staff/targets?q=kraken',await auth('stranger'),undefined,403);
const found=(await api('/api/staff/targets?q=kraken tentacle',await auth('owner'))).targets;
assert.ok(found.length&&found[0].item==='Kraken tentacle'&&found[0].img,'Rate search finds the tentacle with its icon');
assert.deepEqual((await api('/api/staff/targets?q=k',await auth('owner'))).targets,[]);
console.log('PASS: helpers propose and only approvers approve; admins edit helpers\' and moderators\' own access; staff access and portal visibility by rank; admins manage helpers and moderators only; owner manages admins; no self, owner or cross-origin rank changes; rank audit trail; prefix validation; corrections need evidence, cannot be self-approved or reviewed by helpers, publish once; only the owner sees the Permissions data and edits rank permissions (helper, moderator, admin) and member access (same-origin, audited; admins and moderators get 403), ranks and members pick them up end to end, member rows win and can be reset; bot setup is owner-only.');
await dispose();
