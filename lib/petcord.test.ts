import assert from 'node:assert/strict';
import test from 'node:test';
import seed from './seed.json' with {type: 'json'};
import raw from './petcord-driest.json' with {type: 'json'};
import {driestRecord} from './petcord.ts';

const pets = (seed as {pets: {name: string}[]}).pets.map(pet => pet.name);

test('every Petcord record matches a pet name already in the app', () => {
  for (const record of raw.records) {
    const hit = pets.filter(name => name.toLowerCase() === record.pet.toLowerCase());
    assert.equal(hit.length, 1, record.pet);
    const shown = driestRecord(hit[0]);
    assert.equal(shown?.username, record.username);
    assert.equal(shown?.count, record.count);
    assert.equal(shown?.unit, record.unit);
    assert.equal('rarity' in (shown ?? {}), false);
  }
});

test('pets without a record have no driest block', () => {
  const recorded = new Set(raw.records.map(record => record.pet.toLowerCase()));
  const missing = pets.filter(name => !recorded.has(name.toLowerCase()));
  assert.deepEqual(missing, ['Chompy chick']);
  assert.equal(driestRecord('Chompy chick'), null);
});
