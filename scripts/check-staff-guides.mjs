// Local, disposable staff fixtures; never run against production.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {seal,SESSION_COOKIE} from '../lib/session.ts';
import {emptyGuide,newGuideSetup,guideQuests,guideDiaryAreas,searchGuideItems,guideSlotChoices} from '../lib/guides.ts';
import {startWorker} from './worker-harness.mjs';
const {origin:base,secret,fetch,sql,dispose}=await startWorker();
const suffix=Date.now(), helper='971'+suffix, moderator='972'+suffix, stranger='973'+suffix;
async function auth(id){return {'Content-Type':'application/json',Origin:base,Cookie:`${SESSION_COOKIE}=${await seal(secret,{id,username:'Guide QA',globalName:null,avatar:null,exp:Math.floor(Date.now()/1000)+300})}`};}
async function post(body,h,status=200){const r=await fetch(base+'/api/staff/guides',{method:'POST',headers:h,body:JSON.stringify(body)});const text=await r.text();assert.equal(r.status,status,text);return text.startsWith('{')?JSON.parse(text):{};}
async function dashboard(h){const r=await fetch(base+'/api/staff/guides',{headers:h});assert.equal(r.status,200);return r.json();}
async function publicRows(){const r=await fetch(base+'/api/guides');assert.equal(r.status,200);return (await r.json()).guides;}
let id;
try{
 for(const [user,role] of [[helper,'helper'],[moderator,'moderator']]){await sql('INSERT INTO users(discord_id,username,updated_at) VALUES(?,?,0)',[user,'Guide QA']);await sql('INSERT INTO staff_members(discord_id,role,revision) VALUES(?,?,?)',[user,role,'test']);}
 const h=await auth(helper),m=await auth(moderator),other=await auth(stranger);
 const setup=newGuideSetup('Budget','budget');setup.inventory[0]='385';
 const guide={...emptyGuide(),setups:[setup,newGuideSetup('Endgame','endgame')],requiredQuests:[guideQuests[0]],requiredDiaries:[{area:guideDiaryAreas[0],tier:'Hard'}],blocks:[{id:'body',kind:'text',text:'Structured guide body for safe integration testing.',style:'body',tone:'default'},{id:'gear',kind:'gear',setupId:'budget'},{id:'odds',kind:'odds',name:'Drop odds',rate:3000,count:775,unit:'kills'}],title:'QA guide '+suffix,activity:'Kraken',summary:'Disposable guide fixture for permission checks.',strategy:'This is a local-only fixture. Use the equipment and inventory above.'};
 await post({action:'save',guide},{'Content-Type':'application/json',Origin:base},401);
 await post({action:'save',guide},other,403);
 await post({action:'save',guide},{...h,Origin:'https://example.invalid'},403);
 id=(await post({action:'save',guide},h)).id;
 assert.ok(!(await publicRows()).some(r=>r.id===id));
 let row=(await dashboard(h)).guides.find(r=>r.id===id);assert.ok(row);assert.equal(row.guide.blocks[1].setupId,'budget');assert.equal(row.guide.blocks[2].count,775);
 await post({action:'save',id,revision:row.revision,guide:{...guide,blocks:[{id:'bad',kind:'gear',setupId:'missing'}]}},h,400);
 await post({action:'publish',id,revision:row.revision},h,403);
 await post({action:'save',id,revision:row.revision,guide},m,403);
 await post({action:'publish',id,revision:row.revision-1},m,409);
 await post({action:'publish',id,revision:row.revision},m);
 assert.equal((await publicRows()).find(r=>r.id===id).guide.title,guide.title);
 assert.equal((await publicRows()).find(r=>r.id===id).guide.setups[0].inventory[0],'385');
 assert.equal((await publicRows()).find(r=>r.id===id).guide.requiredDiaries[0].tier,'Hard');
 row=(await dashboard(h)).guides.find(r=>r.id===id);
 await post({action:'save',id,revision:row.revision,guide:{...guide,title:'Changed draft'}},h);
 assert.equal((await publicRows()).find(r=>r.id===id).guide.title,guide.title);
 row=(await dashboard(h)).guides.find(r=>r.id===id);
 // Editor additions: numbered lists, coloured words and site emojis are kept as text; any catalogued item (Torva, potions, rune pouch) is accepted.
 const rich={...guide,blocks:[{id:'steps',kind:'text',text:'Enter the arena\n{gold}Pray **melee**{/gold} :quests:',style:'numbered',tone:'default'},...guide.blocks.slice(1)],requiredItems:[{id:searchGuideItems('Rune pouch')[0][0],quantity:1}]};
 rich.setups=[{...setup,equipment:{...setup.equipment,head:guideSlotChoices('head').find(([,n])=>n==='Torva full helm')[0]},inventory:[searchGuideItems('Super combat potion(4)')[0][0],...setup.inventory.slice(1)]},rich.setups[1]];
 await post({action:'save',id,revision:row.revision,guide:rich},h);
 row=(await dashboard(h)).guides.find(r=>r.id===id);assert.equal(row.guide.blocks[0].style,'numbered');assert.equal(row.guide.blocks[0].text,'Enter the arena\n{gold}Pray **melee**{/gold} :quests:');assert.equal(row.guide.setups[0].equipment.head,'26382');
 await post({action:'save',id,revision:row.revision,guide:{...rich,blocks:[{...rich.blocks[0],style:'ordered'}]}},h,400);
 await post({action:'unpublish',id,revision:row.revision},m);
 assert.ok(!(await publicRows()).some(r=>r.id===id));
 console.log('PASS: anonymous/nonstaff/cross-origin writes blocked; helper draft hidden; moderator cannot edit another draft; helpers cannot publish; stale publication blocked; published snapshot survives draft edits; numbered lists, colours, emojis and catalogued items save; unpublish removes public guide.');
}finally{
 if(id){await sql('DELETE FROM community_guides WHERE id=?',[id]);await sql('DELETE FROM staff_audit WHERE target_id=?',[id]);}
 for(const user of [helper,moderator]){await sql('DELETE FROM staff_members WHERE discord_id=?',[user]);await sql('DELETE FROM users WHERE discord_id=?',[user]);}
}
await dispose();
