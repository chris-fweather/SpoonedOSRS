// Local fixture only. Validate persistence and writer boundaries without changing a real account.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mixedFarmingMethod} from '../lib/estimates.ts';
import {initial,likelihood} from '../lib/model.ts';
import {seal,SESSION_COOKIE} from '../lib/session.ts';
import {startWorker} from './worker-harness.mjs';
const {origin:base,secret,fetch,sql,dispose}=await startWorker();
const name='PR '+Date.now().toString().slice(-8),rsn=name.toLowerCase(),id='98000'+Date.now();
async function headers(user){return {'Content-Type':'application/json',Origin:base,Cookie:`${SESSION_COOKIE}=${await seal(secret,{id:user,username:'QA',globalName:null,avatar:null,exp:Math.floor(Date.now()/1000)+300})}`};}
const h=await headers(id),other=await headers('9999900099');
let journal=structuredClone(initial);journal.username=name;journal.hiscores.skills=[{name:'Woodcutting',level:99,xp:15000000,rank:1}];
async function read(){const r=await fetch(base+'/api/journal?username='+encodeURIComponent(name),{headers:h});assert.equal(r.status,200);journal=await r.json();return journal;}
async function save(pet,auth=h,status=200){const r=await fetch(base+'/api/journal',{method:'POST',headers:auth,body:JSON.stringify({username:name,revision:journal.revision,pet})});assert.equal(r.status,status,await r.clone().text());if(r.ok)journal=await r.json();}
await sql('INSERT INTO users(discord_id,username,updated_at) VALUES(?,?,0)',[id,name]);
try{
 await sql('INSERT INTO claimed_names(rsn,display_name,discord_id,claimed_at) VALUES(?,?,?,0)',[rsn,name,id]);
 await sql('INSERT INTO journals(id,data,revision) VALUES(?,?,0)',[rsn,JSON.stringify(journal)]);
 await read();
 let pet=journal.pets.find(p=>p.name==='Beaver');
 pet={...pet,obtained:true,obtainedStartCount:2000000,huntHistory:[{method:'Teak (1.5t)',unit:'XP',count:10345678,pace:190000,rate:18000000}],obtainedApproximate:true,obtainedCount:12345678,obtainedUnit:'XP',obtainedMethod:'Teak (1.5t)',plannedMethod:0,methods:[{name:'Teak (1.5t)',unit:'XP',rate:18000000,rateOverride:true,rateConfirmed:false,kph:190000,kc:4000000,activity:null,source:'Personal estimate'}]};
 await save(pet,other,403);await save(pet,{'Content-Type':'application/json',Origin:base},401);
 await save(pet);await read();pet=journal.pets.find(p=>p.name==='Beaver');
 assert.equal(pet.obtainedStartCount,2000000);assert.equal(pet.huntHistory[0].count,10345678);assert.equal(pet.huntHistory[0].pace,190000);assert.equal(pet.obtainedCount,12345678);assert.equal(pet.obtainedApproximate,true);assert.equal(pet.obtainedUnit,'XP');assert.equal(pet.obtainedMethod,'Teak (1.5t)');assert.equal(pet.methods[0].rate,18000000);
 await save({...pet,obtainedCount:200000001},h,400);
 const boss=journal.pets.find(p=>p.name==='Baby Mole');
 await save({...boss,obtained:true,obtainedCount:100.5,obtainedUnit:'kills'},h,400);
 await save({...boss,name:'Beaver',obtained:true,obtainedCount:100,obtainedUnit:'XP'},h,400);
 await save({...boss,obtained:true,obtainedCount:321,obtainedUnit:'kills',obtainedMethod:'Giant Mole'});await read();assert.equal(journal.pets.find(p=>p.name==='Baby Mole').obtainedCount,321);
 const reward=journal.pets.find(p=>p.name==='Tiny tempor');
 await save({...reward,obtained:true,obtainedCount:654,obtainedUnit:'rolls',obtainedMethod:'Reward pool'});await read();assert.equal(journal.pets.find(p=>p.name==='Tiny tempor').obtainedUnit,'rolls');
 const farming=journal.pets.find(p=>p.name==='Tangleroot');
 await save({...farming,obtained:true,obtainedUnit:'level',obtainedCount:95,obtainedMethod:'Regular farming runs'});await read();assert.equal(journal.pets.find(p=>p.name==='Tangleroot').obtainedCount,95);assert.equal(journal.pets.find(p=>p.name==='Tangleroot').obtainedUnit,'level');
 await save({...farming,obtainedUnit:'level',obtainedCount:100},h,400);
 await save({...farming,obtained:true,obtainedUnit:'XP',obtainedCount:7942614,obtainedMethod:'Farming runs',plannedMethod:0,methods:[{...mixedFarmingMethod(99),farmingRunsPerDay:.5}]});await read();const savedFarming=journal.pets.find(p=>p.name==='Tangleroot');assert.equal(savedFarming.methods[0].kc,null);assert.equal(savedFarming.methods[0].farmingRunsPerDay,.5);
 await save({...savedFarming,methods:[{...savedFarming.methods[0],farmingRunsPerDay:2}]},h,400);assert.ok(likelihood(savedFarming)>0);
 await save({...savedFarming,obtainedCount:9000000});await read();assert.ok(likelihood(journal.pets.find(p=>p.name==='Tangleroot'))>likelihood(savedFarming));
 await save({...boss,name:'Tangleroot',obtainedUnit:'level',obtainedCount:95},h,400);
 console.log('PASS: XP, KC and reward records persist; custom estimates survive reload; invalid values and unrelated/anonymous writers rejected.');
}finally{await sql('DELETE FROM profile_link_owners WHERE rsn=? AND discord_id=?',[rsn,id]);await sql('DELETE FROM journals WHERE id=?',[rsn]);await sql('DELETE FROM claimed_names WHERE rsn=? AND discord_id=?',[rsn,id]);await sql('DELETE FROM users WHERE discord_id=?',[id]);}
await dispose();
