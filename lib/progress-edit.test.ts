import test from 'node:test';
import assert from 'node:assert/strict';
import {applyProgressEdit,parseProgressEdit} from './progress-edit.ts';
import type {Journal} from './model.ts';
const journal=()=>({username:'Test',pets:[],hiscores:{skills:[],activities:[]},statsSyncedAt:null,logSyncedAt:null,revision:1,
 log:{obtained:1,total:2,tabs:[{name:'Bosses',pages:[{name:'Kraken',obtained:1,total:2,items:[{id:12004,name:'Kraken tentacle',quantity:3},{id:12655,name:'Pet kraken',quantity:0}]}]}]},
 profile:{quests:[{id:1,name:'Waterfall Quest',points:1,type:'',state:'not_started'}],diaries:[{areaId:1,area:'Ardougne',tiers:[{tier:'Easy',completed:3,total:10}]}],combat:[],syncedAt:''}}) as Journal;
test('a log correction keeps page and log totals in step',()=>{
 const j=journal(),change=applyProgressEdit(j,parseProgressEdit({kind:'log',page:'Kraken',itemId:12655,quantity:1}));
 assert.equal(change.before,0);assert.equal(j.log!.tabs[0].pages[0].obtained,2);assert.equal(j.log!.obtained,2);
});
test('quest states and diary counts are checked',()=>{
 const j=journal();applyProgressEdit(j,parseProgressEdit({kind:'quest',name:'Waterfall Quest',state:'finished'}));assert.equal(j.profile!.quests[0].state,'finished');
 assert.throws(()=>applyProgressEdit(j,parseProgressEdit({kind:'diary',area:'Ardougne',tier:'Easy',completed:11})));
 assert.throws(()=>parseProgressEdit({kind:'quest',name:'Waterfall Quest',state:'done'}));
 assert.throws(()=>applyProgressEdit(j,parseProgressEdit({kind:'log',page:'Kraken',itemId:1,quantity:1})));
});
