// Local integration check. Creates a unique fixture and removes only that fixture afterwards.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {seal,SESSION_COOKIE} from '../lib/session.ts';
import {profileSaveBody} from '../lib/flair.ts';
import {deploymentConfig} from './deployment-config.mjs';
import {startWorker} from './worker-harness.mjs';
const {origin:base,secret,fetch,sql,dispose}=await startWorker();
const owners=deploymentConfig().ownerDiscordIds;
assert.ok(secret,'Local SESSION_SECRET is required.');
const name='QA '+Date.now().toString().slice(-8), rsn=name.toLowerCase(), id='99000'+Date.now();
async function headers(user){const token=await seal(secret,{id:user,username:'QA',globalName:null,avatar:null,exp:Math.floor(Date.now()/1000)+300});return {'Content-Type':'application/json',Origin:base,Cookie:`${SESSION_COOKIE}=${token}`};}
async function get(path,h){const r=await fetch(base+path,{headers:h});assert.equal(r.status,200,path);return r.json();}
async function post(body,h,status=200){const r=await fetch(base+'/api/profile',{method:'POST',headers:h,body:JSON.stringify(body)});assert.equal(r.status,status,await r.clone().text());return r.text();}
const journal=JSON.parse(readFileSync('lib/seed.json','utf8'));journal.username=name; journal.legacyMetadata='PRIVATE_LEGACY_SENTINEL'; journal.hiscores.skills[0].legacyMetadata='PRIVATE_LEGACY_SENTINEL'; if(journal.log)journal.log.legacyMetadata='PRIVATE_LEGACY_SENTINEL';
await sql('INSERT INTO users(discord_id,username,updated_at) VALUES(?,?,0)',[id,name]);
try {
 await sql('INSERT INTO claimed_names(rsn,display_name,discord_id,claimed_at) VALUES(?,?,?,0)',[rsn,name,id]);
 await sql('INSERT INTO journals(id,data,revision) VALUES(?,?,0)',[rsn,JSON.stringify(journal)]);
 const h=await headers(id), other=await headers('9999900099');
 const prior=await get('/api/profile?username='+encodeURIComponent(name),h);
 assert.equal(prior.visibility,'public');
 assert.ok(!JSON.stringify(await get('/api/journal?username='+encodeURIComponent(name))).includes('PRIVATE_LEGACY_SENTINEL'));
 assert.ok(JSON.stringify(await get('/api/journal?username='+encodeURIComponent(name),h)).includes('PRIVATE_LEGACY_SENTINEL'));
 await post({username:name,...prior,appearance:{body:'female',hair:'blonde',skin:'default'}},h);
 assert.deepEqual((await get('/api/profile?username='+encodeURIComponent(name))).appearance,{body:'female',hair:'blonde',skin:'default',background:'none'});
 await post({username:name,...prior,appearance:{body:'female',hair:'blonde',skin:'brown'},details:{pets:false,log:false,quests:false,diaries:false,combat:false,skills:false,petRecords:false}},h);
 const redacted=await get('/api/journal?username='+encodeURIComponent(name));
 assert.equal(redacted.pets.length,0);assert.equal(redacted.log,null);assert.equal(redacted.hiscores.skills.length,0);assert.equal(redacted.hiscores.activities.length,0);
 assert.ok((await get('/api/journal?username='+encodeURIComponent(name),h)).pets.length>0);
 const granular=await get('/api/profile?username='+encodeURIComponent(name));assert.equal(granular.appearance.skin,'brown');assert.equal(granular.details.skills,false);
 const granularRow=(await get('/api/leaderboard')).rows.find(r=>r.name===name);assert.ok(granularRow.stats.hidden.includes('pets'));
 await post({username:name,...prior,appearance:{body:'female',hair:'blonde',skin:'default'}},h);
 console.log('PASS: skin selection persists; granular privacy redacts public API and rankings while retaining owner access.');
 await post({username:name,appearance:{body:'female',hair:'invalid'}},h,400);
 await post({username:name,appearance:{body:'male',hair:'black'}},other,403);
 const selected=journal.pets.find(p=>p.obtained);
 await post({username:name,...prior,companionPet:selected.id,pinnedMark:'pets-5',visibility:'private'},h);
 for (const viewer of [undefined,other]) {
  const result=await get('/api/journal?username='+encodeURIComponent(name),viewer);
  assert.equal(result.restricted,true);assert.equal(result.pets.length,0);assert.equal(result.log,null);assert.equal(result.profile,undefined);assert.equal(result.hiscores.activities.length,0);assert.ok(result.hiscores.skills.length>0);
  const flair=await get('/api/profile?username='+encodeURIComponent(name),viewer);assert.equal(flair.canEdit,false);assert.equal(flair.showcase.badge.id,'pets-5');assert.equal(flair.showcase.pet.id,selected.id);
 }
 assert.ok((await get('/api/journal?username='+encodeURIComponent(name),h)).pets.length>0);
 assert.ok(!(await get('/api/leaderboard')).rows.some(r=>r.name===name));
 await post({username:name,visibility:'public'},other,403);
 await post({username:name,visibility:'public'},{'Content-Type':'application/json'},401);
 await post({username:name,visibility:'public'},{...h,Origin:'https://example.invalid'},403);
 await post({username:name,visibility:'friends'},h,400);
 await post({username:name,...prior,visibility:'public'},h);
 assert.ok((await get('/api/leaderboard')).rows.some(r=>r.name===name));
 await post({username:name,...prior,staffBadge:'owner'},h,400);
 await post({username:name,...prior,titleChoice:'beastmaster'},h,400);
 await post({username:name,...prior,pinnedMark:'pets-all'},h,400);
 await sql("INSERT INTO staff_members(discord_id,role,revision) VALUES(?,'owner','test')",[id]);
 await sql("INSERT INTO supporter_totals(discord_id,amount_minor,currency) VALUES(?,500,'USD')",[id]);
 await post({username:name,...prior,pinnedMark:'pets-all'},h,400);
 for(const style of ['helper','moderator','admin','owner']){
  await post({username:name,...prior,staffBadge:style,staffPrefix:'Sir',pinnedMark:'pets-5',titleChoice:'beastmaster',showDonation:true,amountMinor:999999},h);
  const f=await get('/api/profile?username='+encodeURIComponent(name));
  assert.equal(f.staff.role,'owner');assert.equal(f.staff.displayRole,style);assert.equal(f.ownerShowcase,false);assert.equal(f.pinnedMark,'pets-5');assert.equal(f.showcase.achievementTitle,'the Beastmaster');assert.equal(f.donation.amountMinor,500);
 }
 await sql("UPDATE users SET title='the Generous' WHERE discord_id=?",[id]);
 await sql("INSERT INTO profile_supporter_totals(rsn,amount_minor,currency) VALUES(?,10000,'USD')",[rsn]);
 assert.equal((await get('/api/profile?username='+encodeURIComponent(name))).donation.amountMinor,10000);
 assert.equal((await get('/api/leaderboard')).rows.find(r=>r.name===name).donation.amountMinor,10000);
 await post({username:name,...prior,staffBadge:'gilded',showDonation:true},h);
 const gilded=await get('/api/profile?username='+encodeURIComponent(name));
 assert.equal(gilded.staff.role,'owner');assert.equal(gilded.staff.displayRole,null);assert.equal(gilded.donation.badge,'gilded');
 assert.equal((await get('/api/leaderboard')).rows.find(r=>r.name===name).donation.badge,'gilded');
 const visibleRank=(await get('/api/leaderboard')).rows.find(r=>r.name===name).supporterRank;assert.ok(visibleRank>0);
 await post({username:name,...prior,showDonation:false,titleChoice:'none'},h);
 const hidden=await get('/api/profile?username='+encodeURIComponent(name));assert.equal(hidden.donation.amountMinor,null);assert.equal(hidden.donation.hidden,true);assert.equal(hidden.showcase.achievementTitle,null);
 const row=(await get('/api/leaderboard')).rows.find(r=>r.name===name);assert.equal(row.donation.amountMinor,null);assert.equal(row.donation.hidden,true);assert.equal(row.supporterRank,visibleRank);
 await sql("UPDATE staff_members SET role='admin' WHERE discord_id=?",[id]);
 await post({username:name,...prior,staffBadge:null,staffPrefix:'Sir'},h);
 assert.equal((await get('/api/profile?username='+encodeURIComponent(name))).staff.displayPrefix,'Sir');
 assert.equal((await get('/api/leaderboard')).rows.find(r=>r.name===name).staff.displayPrefix,'Sir');
 await post({username:name,...prior,staffBadge:'owner',staffPrefix:'Sir'},h,400);
 await sql("UPDATE staff_members SET role='moderator' WHERE discord_id=?",[id]);
 await post({username:name,...prior,staffPrefix:'Sir'},h);
 assert.equal((await get('/api/profile?username='+encodeURIComponent(name))).staff.displayPrefix,'Sir');
 await sql('DELETE FROM staff_members WHERE discord_id=?',[id]);
 await post({username:name,...prior,staffBadge:'gilded',staffPrefix:null,showDonation:true},h);
 const donor=await get('/api/profile?username='+encodeURIComponent(name));assert.equal(donor.staff,null);assert.equal(donor.donation.badge,'gilded');
 await post({username:name,...prior,staffBadge:'owner'},h,400);
 // Privacy belongs to Account settings: a profile settings save from a stale tab must leave it as stored.
 await post({username:name,...prior,staffBadge:'gilded',visibility:'private',details:{...prior.details,quests:false,skills:false},showDonation:false},h);
 const stored=await get('/api/profile?username='+encodeURIComponent(name),h);
 assert.equal(stored.visibility,'private');assert.equal(stored.showDonation,false);assert.equal(stored.details.quests,false);
 const stale={...stored,visibility:'public',details:prior.details,showDonation:true,titleChoice:'none',appearance:{body:'male',hair:'red',skin:'default',background:'riverside'}};
 await post({username:name,...profileSaveBody(journal,stale,false)},h);
 const saved=await get('/api/profile?username='+encodeURIComponent(name),h);
 assert.equal(saved.visibility,'private');assert.equal(saved.showDonation,false);assert.deepEqual(saved.details,stored.details);
 assert.equal(saved.titleChoice,'none');assert.equal(saved.appearance.hair,'red');assert.equal(saved.appearance.background,'riverside');
 console.log('PASS: saving appearance and titles from profile settings keeps visibility, shared details and donation display as stored.');
 await post({username:name,...prior,staffBadge:'gilded',visibility:'public'},h);
 console.log('PASS: gilded selection persists for eligible donors without creating staff privileges.');
 console.log('PASS: Admin Sir prefix persists in profile and leaderboard; staff badge override is rejected and moderator Sir remains available.');
 console.log('PASS: owner cosmetic choices, locked title/emblem rejection, immutable permissions, donation amount tamper rejection and hidden donation API redaction.');
 // The canonical owner holds two names; every owner Discord login resolves to that identity and edits both.
 const ownerNames=['QA Owner A','QA Owner B'];
 await sql("INSERT OR IGNORE INTO users(discord_id,username,updated_at) VALUES(?,'QA owner',0)",[owners[0]]);
 for(const n of ownerNames)await sql('INSERT INTO claimed_names(rsn,display_name,discord_id,claimed_at) VALUES(?,?,?,0)',[n.toLowerCase(),n,owners[0]]);
 for (const ownerId of owners) {
  const oh=await headers(ownerId), session=await get('/api/auth/session',oh);
  assert.equal(session.user.id,owners[0]);
  for(const n of ownerNames){assert.ok(session.names.includes(n));assert.equal((await get('/api/profile?username='+encodeURIComponent(n),oh)).canEdit,true);}
 }
 console.log('PASS: default public; private API redaction; owner access; public showcase; leaderboard exclusion; public restoration; anonymous/unrelated/cross-origin writes rejected; both Discord IDs own both names locally.');
} finally {
 for(const table of ['profile_link_owners','profile_supporter_totals','profile_options','profile_appearance','profile_presentation','profile_visibility','claimed_names'])await sql(`DELETE FROM ${table} WHERE rsn=?`,[rsn]);
 await sql("DELETE FROM claimed_names WHERE rsn IN ('qa owner a','qa owner b')");
 await sql('DELETE FROM journals WHERE id=?',[rsn]);await sql('DELETE FROM staff_members WHERE discord_id=?',[id]);await sql('DELETE FROM supporter_totals WHERE discord_id=?',[id]);await sql('DELETE FROM users WHERE discord_id=?',[id]);
}
await dispose();
