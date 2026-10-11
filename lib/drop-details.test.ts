import test from 'node:test';
import assert from 'node:assert/strict';
import {rateDescription} from './rate-description.ts';
import {collectionItemRates,type CollectionReference} from './collection-rates.ts';
import {logPageForPet} from './ui.ts';
import {initial} from './model.ts';

test('source chance fractions are readable while quantity remains independent',()=>{
 const reference:CollectionReference={title:'Hilt',url:'https://oldschool.runescape.wiki/w/Hilt',revision:1,fetchedAt:'2026-10-06',intro:'Conditional reward.',tables:[{heading:'Item sources',headers:['Source','Level','Quantity','Rarity'],rows:[['Monumental chest Normal Mode','N/A','1','8/19'],['Monumental chest Hard Mode','N/A','1','2/19']].map(row=>row.map(text=>({text})))}]};
 const rate=collectionItemRates([],['1'],{'1':'Hilt'},{'1':reference})['1'];
 assert.equal(rate.p,null);assert.equal(rate.sourceDetails?.[0].quantity,'1');assert.equal(rate.sourceDetails?.[0].rate,'8/19');assert.equal(rate.sourceDetails?.[0].conditions,'Level: N/A');
 assert.match(rateDescription('8/19').explanation!,/42.11%/);assert.match(rateDescription('2/19').explanation!,/10.53%/);assert.match(rateDescription('8/19').explanation!,/not an item quantity/);
});

test('conditional or multiplied rate text is never silently reduced to a personal chance',()=>{
 for(const raw of ['1/100; Never','Base chance: 1/3,000 at level 99','8/19 (after receiving a unique)','1/0']){
  const result=rateDescription(raw);assert.equal(result.parts.map(p=>p.text).join(''),raw);assert.equal(result.explanation,null);assert.ok(result.parts.some(p=>p.fraction));
 }
 assert.match(rateDescription('2 × 1/100').explanation!,/2 rolls are listed, each at 1\/100/);
 assert.match(rateDescription('2 × 1/100').explanation!,/not items received/);
 assert.equal(rateDescription('Guaranteed after quest').explanation,null);
 assert.equal(rateDescription('Guaranteed after quest').parts.some(p=>p.fraction),false);
});

test('pet drop pages remain available without an imported log and never infer ownership',()=>{
 const j=structuredClone(initial);j.log=null;const pet=j.pets.find(p=>p.name==='Olmlet')!;
 const page=logPageForPet(j,pet);assert.equal(page?.name,'Chambers of Xeric');assert.equal(page?.obtained,0);assert.ok(page?.items.every(i=>i.quantity===0));assert.equal(j.log,null);
 assert.equal(logPageForPet(j,{...pet,id:'unknown'}),null);
});

test('an imported collection page takes precedence over the public drop catalogue',()=>{
 const j=structuredClone(initial),pet=j.pets.find(p=>p.name==='Olmlet')!;
 const page={name:'Personal imported raid page',obtained:1,total:1,items:[{id:Number(pet.id),name:pet.name,quantity:2}]};
 j.log={obtained:1,total:1,tabs:[{name:'Raids',obtained:1,total:1,pages:[page]}]};
 assert.equal(logPageForPet(j,pet),page);assert.equal(logPageForPet(j,pet)?.items[0].quantity,2);
});
