import assert from 'node:assert/strict';
import test from 'node:test';
import {farmingTiming,validFarmingSchedule} from './farming-timing.ts';
import {mixedFarmingMethod} from './estimates.ts';
import {initial,validatePet,expectedHours,likelihood} from './model.ts';

test('tree route reports active pace separately from concurrently growing trees and daily schedule',()=>{
 const m=mixedFarmingMethod(99),t=farmingTiming(m)!;
 assert.equal(m.kph,580186);assert.ok(Math.abs(t.activeHoursPerRun!-.25)<0.000001);
 assert.ok(Math.abs(t.xp-145046.4)<1e-8);assert.equal(t.runsPerDay,1);assert.equal(t.example,true);
 assert.ok(t.meanDays!>558&&t.meanDays!<560);
 const fastest=farmingTiming({...m,farmingRunsPerDay:1.5})!;
 assert.ok(Math.abs(fastest.meanDays!-t.meanDays!*2/3)<1e-9);
 assert.equal(fastest.example,false);
 assert.equal(farmingTiming({...m,farmingRunsPerDay:.5})!.meanDays,t.meanDays!*2);
 const fruit=farmingTiming(mixedFarmingMethod(99,'fruit'))!;
 assert.ok(Math.abs(fruit.xp-61563.6)<1e-8);assert.equal(fruit.growthHours,16);
});
test('calendar frequency never changes odds or active effort and cannot outrun a slow active route',()=>{
 const p={...structuredClone(initial.pets.find(p=>p.name==='Tangleroot')!),obtained:false,plannedMethod:0,methods:[{...mixedFarmingMethod(99),kc:7942614}]};
 const hours=expectedHours(p),chance=likelihood(p);
 p.methods[0]={...p.methods[0],farmingRunsPerDay:.5};
 assert.equal(expectedHours(p),hours);assert.equal(likelihood(p),chance);
 const slow=farmingTiming({...p.methods[0],kph:1,farmingRunsPerDay:1.5})!;
 assert.ok(slow.meanDays!*24>=expectedHours({...p,methods:[{...p.methods[0],kph:1}]})!-1e-7);
 assert.equal(farmingTiming({...p.methods[0],kph:null})!.activeHoursPerRun,null);
});
test('saved schedule validation and route detection reject invalid or unrelated assumptions',()=>{
 const m=mixedFarmingMethod(99),p={...structuredClone(initial.pets.find(p=>p.name==='Tangleroot')!),methods:[m],plannedMethod:0};
 for(const value of [0,-1,1.6,Infinity,NaN,'1']){
  assert.equal(validFarmingSchedule(value),false);
  assert.equal(validatePet({...p,methods:[{...m,farmingRunsPerDay:value as number}]}),false);
  assert.equal(farmingTiming({...m,farmingRunsPerDay:value as number}),null);
 }
 for(const value of [undefined,null,.01,.5,1,1.5])assert.equal(validatePet({...p,methods:[{...m,farmingRunsPerDay:value}]}),true);
 assert.equal(farmingTiming({...m,source:'Custom estimate'}),null);
 assert.equal(farmingTiming({...m,unit:'kills'}),null);
 assert.equal(farmingTiming(undefined),null);
});
