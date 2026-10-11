import assert from 'node:assert/strict';
import test from 'node:test';
import {initial,validatePet,type Journal} from './model.ts';
import {acquisitionUnit,acquisitionMethod} from './pet-record.ts';
import {normalizeRates} from './estimates.ts';
import {wikiMethod,atLevel} from './skill-rates.ts';
import {petRateLines} from './pet-rates.ts';
test('tick-speed labels resolve to the same Beaver rate without merging distinct methods',()=>{
 const w=wikiMethod('Beaver','Teak (1.5t)')!;
 assert.equal(w.name,'Teak');assert.equal(atLevel(w,99)?.expectedXp,22258185);
 assert.equal(wikiMethod('Rocky','Pyramid Plunder (Room 1)')?.name,'Pyramid Plunder (Room 1)');
 const j=structuredClone(initial);j.hiscores.skills=[{name:'Woodcutting',level:99,xp:14000000,rank:1}];
 const p=j.pets.find(p=>p.name==='Beaver')!;p.plannedMethod=0;p.methods=[{name:'Teak (1.5t)',unit:'XP',rate:null,kph:200000,kc:null,activity:null,source:'Wiki'}];
 normalizeRates(j);assert.equal(p.methods[0].rate,22258185);assert.equal(petRateLines(p,j).averageXp,22258185);
 p.methods[0]={...p.methods[0],rate:12345678,rateOverride:true};normalizeRates(j);
 assert.equal(p.methods[0].rate,12345678);assert.equal(petRateLines(p,j).averageXp,12345678);
 p.methods[0]={...p.methods[0],rate:1,unit:'logs',kc:0};assert.equal(petRateLines(p,j).chance,0);
});
test('acquisition units and methods remain independent of the planned method',()=>{
 const pet=structuredClone(initial.pets.find(p=>p.name==='Herbi')!);
 pet.obtainedCount=512;pet.obtainedUnit='harvests';pet.obtainedMethod='Herbiboar';
 pet.methods.push({...pet.methods[0],name:'XP planning',unit:'XP'});pet.plannedMethod=pet.methods.length-1;
 assert.equal(acquisitionUnit(pet),'harvests');assert.equal(acquisitionMethod(pet),'Herbiboar');assert.equal(validatePet(pet),true);
 pet.obtainedCount=512.5;assert.equal(validatePet(pet),false);
 pet.obtainedUnit='XP';assert.equal(validatePet(pet),true);
 pet.obtainedCount=200000001;assert.equal(validatePet(pet),false);
 const boss=structuredClone(initial.pets.find(p=>p.name==='Baby Mole')!);boss.obtainedCount=300;boss.obtainedUnit='XP';assert.equal(validatePet(boss),false);
});
