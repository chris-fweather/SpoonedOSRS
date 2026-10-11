import assert from 'node:assert/strict';
import test from 'node:test';
import {type Journal,expectedHours,likelihood} from './model.ts';
import {upgradeEstimates,normalizeRates} from './estimates.ts';
import {petRateLines, wikiMethod} from './pet-rates.ts';
import {attemptsFor,chanceAfter} from './ui.ts';
import fixture from './seed.json' with {type:'json'};
const initial=upgradeEstimates(structuredClone(fixture) as Journal);
test('Rocky action pace produces the same mean in cards and rate details',()=>{
 const j=structuredClone(initial);const p=j.pets.find(p=>p.name==='Rocky')!;
 const skill=j.hiscores.skills.find(s=>s.name==='Thieving')!;skill.level=90;
 normalizeRates(j);assert.equal(p.methods[0].rate,257211-25*90);
 assert.equal(petRateLines(p,j).hours,expectedHours(p));
 assert.equal(petRateLines(p,j).chance,null);
});
test('Pyramid Plunder rooms do not collapse to the first room rate',()=>{
 assert.notEqual(wikiMethod('Rocky','Pyramid Plunder (Room 1)')?.base,wikiMethod('Rocky','Pyramid Plunder (Room 8)')?.base);
});
test('Tempoross games stay separate from reward rolls; Phoenix rolls are not double counted',()=>{
 const j=structuredClone(initial);const t=j.pets.find(p=>p.name==='Tiny tempor')!;
 t.methods[0]={...t.methods[0],rate:8000,unit:'games',activity:'Tempoross',kc:1132,kph:10};
 const p=j.pets.find(p=>p.name==='Phoenix')!;p.crateRolls=5000;normalizeRates(j);
 assert.equal(t.methods[0].unit,'rolls');assert.equal(t.methods[0].kc,null);assert.equal(t.methods[0].kph,null);
 assert.ok(Math.abs(likelihood(p)!-chanceAfter(5000,1/5000))<1e-10);
});
test('90 percent future chance needs a fresh full budget regardless of previous kills',()=>{
 const count=attemptsFor(.9,1/3000);assert.equal(count,6907);
 assert.ok(chanceAfter(count,1/3000)>=.9);assert.ok(chanceAfter(count-1,1/3000)<.9);
});


test('5,504 Wintertodt rewards use roll odds, independent of future method selection',()=>{
 const j=structuredClone(initial), p=j.pets.find(p=>p.name==='Phoenix')!;
 p.crateRolls=5504;normalizeRates(j);
 const expected=1-Math.pow(4999/5000,5504);
 assert.ok(Math.abs(likelihood(p)!-expected)<1e-10);
 assert.ok(Math.abs(petRateLines(p,j).chance!-expected)<1e-10);
 p.plannedMethod=1;normalizeRates(j);
 assert.ok(Math.abs(likelihood(p)!-expected)<1e-10);
 assert.ok(Math.abs(petRateLines(p,j).chance!-expected)<1e-10);
 j.hiscores.skills.find(s=>s.name==='Firemaking')!.xp=200_000_000;normalizeRates(j);
 assert.equal(likelihood(p),null);assert.equal(petRateLines(p,j).chance,null);
});
test('Nex base table roll is not treated as a personal kill chance',()=>{
 const p=initial.pets.find(p=>p.name==='Nexling')!;
 assert.equal(p.methods[0].rate,4100);assert.equal(p.methods[0].rateConfirmed,false);
 assert.ok(Math.abs(expectedHours(p)!-174.468085106)<1e-6);
});
