import assert from 'node:assert/strict';
import test from 'node:test';
import {combatGroupProgress} from './combat-progress.ts';
test('monster completion is only inferred from matching all-or-none tiers',()=>{
 const combat=[{id:1,name:'Easy',completed:2,total:2},{id:2,name:'Hard',completed:0,total:3}];
 assert.equal(combatGroupProgress(['Easy','Hard','Easy'],combat,{Easy:2,Hard:3}),2);
 assert.equal(combatGroupProgress(['Hard'],combat,{Hard:3}),0);
 assert.equal(combatGroupProgress(['Easy'],combat,{Easy:3}),null);
 assert.equal(combatGroupProgress(['Master'],combat,{Master:1}),null);
 assert.equal(combatGroupProgress(['Hard'],[{id:2,name:'Hard',completed:1,total:3}],{Hard:3}),null);
});
