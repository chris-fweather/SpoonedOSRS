import test from 'node:test';
import assert from 'node:assert/strict';
import {initial, mergeLog} from './model.ts';
import {collectionDate, collectionEvents, setCollectionDate, validCollectionDate} from './collection-history.ts';
import {DEFAULT_DETAILS, journalForViewer} from './profile-privacy.ts';

function fixture() {
  const j = structuredClone(initial);
  j.pets = j.pets.map(p => ({...p, obtained:false, date:''}));
  const items = [{id:4151, name:'Abyssal whip', quantity:1}, {id:4153, name:'Granite maul', quantity:0}];
  j.log = {obtained:1,total:2,tabs:[{name:'Bosses',pages:[{name:'Example',obtained:1,total:2,items},{name:'Repeated slot',obtained:1,total:2,items:structuredClone(items)}]}]};
  return j;
}
test('collection dates validate real calendar days and acquired items; edits survive provider sync and can be cleared', () => {
  for (const value of ['2025-02-30','2099-01-01','2010-01-01','22/08/2025',{},null]) assert.equal(validCollectionDate(value),false);
  let j = setCollectionDate(fixture(),4151,'2025-08-22');
  assert.throws(() => setCollectionDate(j,4153,'2025-08-22'));
  assert.throws(() => setCollectionDate(j,999999,'2025-08-22'));
  mergeLog(j,structuredClone(j.log!));
  assert.equal(collectionDate(j,4151),'2025-08-22');
  j = setCollectionDate(j,4151,'');
  assert.equal(collectionDate(j,4151),'');
});
test('collection timeline deduplicates repeated slots and pets, orders calendar dates and omits unknown dates', () => {
  let j = setCollectionDate(fixture(),4151,'2025-08-22');
  const pet = j.pets[0];
  j.log!.tabs[0].pages[0].items.push({id:Number(pet.id),name:pet.name,quantity:1});
  j = setCollectionDate(j,Number(pet.id),'2025-08-21');
  assert.equal(j.pets[0].date,'2025-08-21');
  assert.deepEqual(collectionEvents(j).events.map(e=>e.kind),['pets','log']);
  assert.equal(collectionEvents(j).events.length,2);
  j.pets[1].obtained=true;
  assert.equal(collectionEvents(j).undated,1);
});
test('collection dates follow profile privacy, with pet records controlled separately', () => {
  const j=setCollectionDate(fixture(),4151,'2025-08-22');
  j.pets[0].obtained=true;j.pets[0].date='2025-08-21';
  assert.equal(journalForViewer(j,'private',false).collectionDates,undefined);
  const hiddenLog=journalForViewer(j,'public',false,{...DEFAULT_DETAILS,log:false});
  assert.equal(hiddenLog.collectionDates,undefined);
  assert.equal(collectionEvents(hiddenLog).events.length,1);
  const hiddenPet=journalForViewer(j,'public',false,{...DEFAULT_DETAILS,petRecords:false});
  assert.deepEqual(collectionEvents(hiddenPet).events.map(e=>e.kind),['log']);
});


test('pet edits reject impossible and future acquisition dates',async()=>{
 const {validatePet,initial}=await import('./model.ts');
 const pet=structuredClone(initial.pets[0]);
 for(const date of ['2025-02-30','2026-99-99','2099-01-01'])assert.equal(validatePet({...pet,date}),false,date);
 assert.equal(validatePet({...pet,date:'2024-02-29'}),true);
 assert.equal(validatePet({...pet,date:''}),true);
});
