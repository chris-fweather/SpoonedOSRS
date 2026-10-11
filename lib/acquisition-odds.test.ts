import assert from 'node:assert/strict';
import test from 'node:test';
import {initial,likelihood} from './model.ts';
import {oddsMethod,usesAcquisition,mixedFarmingMethod,normalizeRates} from './estimates.ts';
import {petRateLines} from './pet-rates.ts';
import {acquisitionEffort} from './hunt-history.ts';
test('Tempoross permits label resolves to reward rolls, never boss completions',()=>{
 const p=structuredClone(initial.pets.find(p=>p.name==='Tiny tempor')!);
 Object.assign(p,{obtained:true,obtainedMethod:'Permits',obtainedUnit:'rolls',obtainedCount:4503,methods:[{name:'Tempoross',unit:'rolls',rate:8000,kph:60,kc:null,activity:null,source:'Wiki'}]});
 assert.equal(usesAcquisition(p),true);assert.equal(oddsMethod(p)?.kc,4503);
 assert.ok(Math.abs(likelihood(p)!-(-Math.expm1(4503*Math.log1p(-1/8000))))<1e-12);
 assert.equal(acquisitionEffort(p).hours,4503/60);
 p.obtainedUnit='games';assert.equal(usesAcquisition(p),false);assert.equal(likelihood(p),null);
});
test('recorded Runecraft pace agrees between preview and acquisition time',()=>{
 const p=structuredClone(initial.pets.find(p=>p.name==='Rift guardian')!);
 Object.assign(p,{obtained:true,obtainedMethod:'Mind rune',obtainedUnit:'XP',obtainedCount:5094314,historicalXph:33000,plannedMethod:1,methods:[{name:'Mind rune',unit:'XP',rate:9860000,kph:145000,kc:null,activity:null,source:'Example'},{name:'Blood rune',unit:'XP',rate:18000000,kph:33000,kc:null,activity:null,source:'Example'}]});
 assert.equal(oddsMethod(p)?.name,'Mind rune');assert.equal(oddsMethod(p)?.kph,33000);assert.equal(oddsMethod(p)?.paceConfirmed,true);
 assert.equal(acquisitionEffort(p).hours,5094314/33000);
});
test('farming presets set an explicit example pace that survives normalization',()=>{
 for(const kind of ['mixed','fruit'] as const){
  const j=structuredClone(initial),p=j.pets.find(p=>p.name==='Tangleroot')!;
  p.methods=[mixedFarmingMethod(99,kind)];p.plannedMethod=0;
  const pace=p.methods[0].kph;assert.ok(pace!>0);assert.equal(p.methods[0].paceConfirmed,false);
  normalizeRates(j);assert.equal(p.methods[0].kph,pace);assert.match(p.methods[0].source,/growth\/wait time/);
 }
});
test('matching obtained XP drives odds consistently without replacing current effort',()=>{
 const j=structuredClone(initial),p=j.pets.find(p=>p.name==='Tangleroot')!;
 Object.assign(p,{obtained:true,obtainedCount:7942614,obtainedUnit:'XP',obtainedMethod:'Farming runs',plannedMethod:0,methods:[mixedFarmingMethod(99)]});
 assert.equal(usesAcquisition(p),true);assert.equal(oddsMethod(p)?.kc,7942614);assert.equal(p.methods[0].kc,null);
 const chance=likelihood(p)!;assert.ok(chance>0&&chance<1);assert.ok(Math.abs(petRateLines(p,j).chance!-chance)<1e-12);
 p.obtainedCount=9000000;assert.ok(likelihood(p)!>chance);
 p.methods[0].kc=1000000;assert.equal(usesAcquisition(p),true);assert.equal(oddsMethod(p)?.kc,9000000);
});
test('acquisition never crosses units or methods and zero remains known',()=>{
 const p=structuredClone(initial.pets.find(p=>p.name==='Tangleroot')!);Object.assign(p,{obtained:true,obtainedCount:0,obtainedUnit:'XP',obtainedMethod:'Farming runs',plannedMethod:0,methods:[mixedFarmingMethod(99)]});
 assert.equal(likelihood(p),0);p.obtainedUnit='level';assert.equal(likelihood(p),null);p.obtainedUnit='XP';p.obtainedMethod='Other';assert.equal(likelihood(p),null);
});
test('method changes refresh Wiki denominators before save while preserving overrides',()=>{
 const j=structuredClone(initial);j.hiscores.skills=[{name:'Farming',level:99,xp:14000000,rank:1}];const p=j.pets.find(p=>p.name==='Tangleroot')!;
 p.methods=[{...mixedFarmingMethod(99),name:'Palm tree',unit:'plants',rate:99999,rateOverride:false,kc:10}];normalizeRates(j);assert.equal(p.methods[0].rate,6525);
 p.methods[0].rateOverride=true;p.methods[0].rate=123;normalizeRates(j);assert.equal(p.methods[0].rate,123);
});
