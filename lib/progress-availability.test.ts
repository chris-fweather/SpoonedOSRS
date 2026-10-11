import assert from 'node:assert/strict';
import test from 'node:test';
import {progressAvailability} from './progress-availability.ts';
import {initial,type Journal} from './model.ts';
function blank(){const j=structuredClone(initial) as Journal;j.log=null;j.logSyncedAt=null;j.profile=undefined;j.hiscores={skills:[],activities:[]};j.pets=j.pets.map(p=>({...p,obtained:false,source:'New account',recordedHours:null,methods:p.methods.map(m=>({...m,kc:null}))}));return j;}
test('a blank catalogue is unknown progress, even when public skills are available',()=>{
 const j=blank();assert.ok(Object.values(progressAvailability(j)).every(v=>!v));
 j.hiscores.skills=[{name:'Attack',level:1,xp:0,rank:-1}];
 assert.deepEqual(progressAvailability(j),{pets:false,log:false,quests:false,diaries:false,combat:false,stats:true,attempts:false});
});
test('a synced zero collection is known while missing adventure sections remain unknown',()=>{
 const j=blank();j.log={obtained:0,total:1717,tabs:[]};j.profile={quests:[],diaries:[],combat:[],syncedAt:'2026-10-05'};
 assert.equal(progressAvailability(j).pets,true);assert.equal(progressAvailability(j).log,true);assert.equal(progressAvailability(j).quests,false);assert.equal(progressAvailability(j).combat,false);
 j.profile.quests=[{id:1,name:'Test',points:1,state:'not_started',type:'free'}];assert.equal(progressAvailability(j).quests,true);assert.equal(progressAvailability(j).diaries,false);
});
test('manual pet progress and recorded attempts are retained independently',()=>{
 const j=blank();j.pets[0].methods[0].kc=0;assert.equal(progressAvailability(j).attempts,true);assert.equal(progressAvailability(j).pets,false);
 j.pets[0].obtained=true;assert.equal(progressAvailability(j).pets,true);assert.equal(progressAvailability(j).log,false);
});
