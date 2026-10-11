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
assert.deepEqual(helperView.viewer.permissions,{guides:true,corrections:false,planning:false});
const listed=new Set((await api('/api/staff',await auth('owner'))).members.map(m=>m.discord_id));
assert.ok(['owner','admin','admin2','moderator','helper'].every(who=>listed.has(people[who])),'the owner sees the staff list');
// The Permissions tab (team, rank permissions, custom access, access history) is the owner's alone.
for(const who of ['admin','moderator']){
 const view=await api('/api/staff',await auth(who));
 assert.deepEqual([view.members.length,view.audit.length,view.rolePermissions],[0,0,null],who+' sees no team, access history or rank permissions');
}
assert.ok((await api('/api/staff',await auth('admin'))).players.length>0,'admins keep the player directory');

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

// Corrections: evidence is required, helpers cannot propose or review, and nobody approves their own proposal.
const record={action:'propose',kind:'record',pet:'Pet chaos elemental',username:'SR Target',count:420,unit:'kills',reason:'Screenshot shows the drop at 420 kills.',source:'https://example.com/proof.png'};
await api('/api/staff',await auth('helper'),record,403);
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

// Rank permissions: only the owner edits what each rank opens; members of that rank pick it up, own rows still win.
const roleBody=(role,permissions)=>({action:'role-permissions',role,permissions});
const helperCorrections={guides:true,corrections:true,planning:false};
assert.deepEqual((await api('/api/staff',await auth('owner'))).rolePermissions,{helper:{guides:true,corrections:false,planning:false},moderator:{guides:true,corrections:true,planning:true},admin:{guides:true,corrections:true,planning:true}});
for(const who of ['admin','moderator','helper'])await api('/api/staff',await auth(who),roleBody('helper',helperCorrections),403);
await api('/api/staff',await auth('owner','https://evil.example'),roleBody('helper',helperCorrections),403);
await api('/api/staff',await auth('owner'),roleBody('owner',helperCorrections),400);
await api('/api/staff',await auth('owner'),roleBody('helper',{guides:true,corrections:'yes',planning:false}),400);
await api('/api/staff',await auth('owner'),roleBody('helper',{...helperCorrections,admin:true}),400);
assert.deepEqual((await api('/api/staff',await auth('helper'))).viewer.permissions,{guides:true,corrections:false,planning:false},'rejected requests change nothing');
await api('/api/staff',await auth('owner'),roleBody('helper',helperCorrections));
assert.deepEqual((await api('/api/staff',await auth('helper'))).viewer.permissions,helperCorrections,'helpers pick up the new rank default');
assert.deepEqual((await api('/api/staff',await auth('owner'))).rolePermissions.helper,helperCorrections);
// The write guard follows the rank row too: the helper can now propose, but reviewing still needs a moderator.
await api('/api/staff',await auth('helper'),{...record,count:421});
const [[helperChange]]=await sql("SELECT id FROM staff_changes WHERE actor_id=? AND state='pending'",[people.helper]);
await api('/api/staff',await auth('helper'),{action:'review',id:helperChange,decision:'rejected'},403);
assert.deepEqual(await sql("SELECT action,target_id,actor_id,detail FROM staff_audit WHERE action='role-permissions'"),[['role-permissions','role:helper',people.owner,JSON.stringify({role:'helper',from:{guides:true,corrections:false,planning:false},to:helperCorrections})]]);
// A member's own row wins over the rank, and clearing it restores the rank default.
await api('/api/staff',await auth('owner'),{action:'permissions',username:names.helper,permissions:{guides:true,corrections:false,planning:false}});
assert.equal((await api('/api/staff',await auth('helper'))).viewer.permissions.corrections,false);
await api('/api/staff',await auth('helper'),{...record,count:422},403);
assert.equal((await api('/api/staff',await auth('owner'))).members.find(m=>m.discord_id===people.helper).custom,true);
// Only the owner gives or clears a member's own access: admins and moderators are refused and nothing changes.
for(const who of ['admin','moderator','helper'])for(const permissions of [null,{guides:true,corrections:true,planning:true}])
 await api('/api/staff',await auth(who),{action:'permissions',username:names.helper,permissions},403);
await api('/api/staff',await auth('owner','https://evil.example'),{action:'permissions',username:names.helper,permissions:null},403);
assert.equal((await api('/api/staff',await auth('helper'))).viewer.permissions.corrections,false,'refused requests change nothing');
await api('/api/staff',await auth('owner'),{action:'permissions',username:names.helper,permissions:null});
assert.equal((await api('/api/staff',await auth('helper'))).viewer.permissions.corrections,true);
assert.equal((await api('/api/staff',await auth('owner'))).members.find(m=>m.discord_id===people.helper).custom,false);
assert.deepEqual((await sql("SELECT actor_id,detail FROM staff_audit WHERE action='permissions' AND target_id=? ORDER BY id",[people.helper])).map(([actor,detail])=>[actor,JSON.parse(detail)]),
 [[people.owner,{guides:true,corrections:false,planning:false}],[people.owner,{reset:true}]],'every member grant is in the audit trail, by the owner');
// End to end: custom access opens exactly what it says, on the read and on the write, for a moderator too.
await api('/api/staff',await auth('owner'),{action:'permissions',username:names.moderator,permissions:{guides:false,corrections:false,planning:true}});
const modView=await api('/api/staff',await auth('moderator'));
assert.deepEqual(modView.viewer.permissions,{guides:false,corrections:false,planning:true});assert.equal(modView.changes.length,0,'no corrections queue without the area');
await api('/api/staff/guides',await auth('moderator'),null,403);
await api('/api/staff',await auth('moderator'),{...record,count:425},403);
await api('/api/staff',await auth('owner'),{action:'permissions',username:names.moderator,permissions:null});
assert.deepEqual((await api('/api/staff',await auth('moderator'))).viewer.permissions,{guides:true,corrections:true,planning:true});
// The owner edits the admin rank too; every admin picks it up, the owner never loses an area.
await api('/api/staff',await auth('owner'),roleBody('admin',{guides:false,corrections:true,planning:true}));
for(const who of ['admin','admin2'])assert.equal((await api('/api/staff',await auth(who))).viewer.permissions.guides,false,who+' follows the admin rank');
await api('/api/staff/guides',await auth('admin'),null,403);
await api('/api/staff',await auth('admin'),roleBody('admin',{guides:true,corrections:true,planning:true}),403);
await api('/api/staff',await auth('owner'),roleBody('admin',{guides:true,corrections:true,planning:true}));
assert.equal((await api('/api/staff',await auth('admin'))).viewer.permissions.guides,true);
// The owner's access history shows the rank edits and member grants with who made them.
const history=(await api('/api/staff',await auth('owner'))).audit;
assert.ok(history.some(a=>a.action==='role-permissions'&&a.target_id==='role:admin'&&a.actor_id===people.owner),'rank edits are in the access history');
assert.ok(history.some(a=>a.action==='permissions'&&a.target_id===people.moderator&&a.target_name==='Staff QA moderator'),'member grants are in the access history');
// Turning an area off for a rank closes it for that rank (the owner keeps everything).
await api('/api/staff',await auth('owner'),roleBody('moderator',{guides:true,corrections:false,planning:true}));
assert.deepEqual((await api('/api/staff',await auth('moderator'))).viewer.permissions,{guides:true,corrections:false,planning:true});
await api('/api/staff',await auth('moderator'),{...record,count:423},403);
assert.deepEqual((await api('/api/staff',await auth('owner'))).viewer.permissions,{guides:true,corrections:true,planning:true});
await api('/api/staff',await auth('owner'),roleBody('moderator',{guides:true,corrections:true,planning:true}));
await api('/api/staff',await auth('owner'),roleBody('helper',{guides:true,corrections:false,planning:false}));
await api('/api/staff',await auth('helper'),{...record,count:424},403);
assert.equal((await sql("SELECT COUNT(*) FROM staff_audit WHERE action='role-permissions'"))[0][0],6);

// Bot setup is owner-only and same-origin.
await api('/api/staff/discord',await auth('admin'),{},403);
await api('/api/staff/discord',await auth('owner','https://evil.example'),{},403);
console.log('PASS: staff access and portal visibility by rank; admins manage helpers and moderators only; owner manages admins; no self, owner or cross-origin rank changes; rank audit trail; prefix validation; corrections need evidence, cannot be self-approved or reviewed by helpers, publish once; only the owner sees the Permissions data and edits rank permissions (helper, moderator, admin) and member access (same-origin, audited; admins and moderators get 403), ranks and members pick them up end to end, member rows win and can be reset; bot setup is owner-only.');
await dispose();
