import assert from 'node:assert/strict';
import test from 'node:test';
import {petSkill, phoenixRollChance, phoenixShownCount, upgradeEstimates} from './estimates.ts';
import type {Journal, Pet} from './model.ts';
import seed from './seed.json' with {type: 'json'};

test('Soup is the Sailing pet and Phoenix and Olmlet keep wiki rates', () => {
  assert.equal(petSkill.Soup, 'Sailing');
  const fresh = upgradeEstimates(structuredClone(seed) as Journal);
  assert.equal(fresh.calculationVersion, 4);
  const phoenix = fresh.pets.find(p => p.name === 'Phoenix');
  const olmlet = fresh.pets.find(p => p.name === 'Olmlet');
  assert.ok(phoenix && olmlet);
  assert.equal(phoenix.methods[0].rate, 5000);
  assert.equal(phoenix.methods[0].unit, 'rolls');
  assert.equal(phoenix.methods[0].kc, 5504);
  assert.match(phoenix.methods[0].source, /subdues, not rolls/);
  assert.equal(phoenix.referenceHours, 100);
  assert.ok(Math.abs((phoenix.methods[1].rate ?? 0) - 5000 / 15) < 1e-6);
  assert.equal(olmlet.methods[0].rate, 53);
  assert.equal(olmlet.methods[0].unit, 'uniques');
  assert.equal(olmlet.methods[0].kc, null);
  assert.match(olmlet.methods[0].source, /not a unique count/);
  assert.equal(olmlet.referenceHours, 403);
  const again = upgradeEstimates(fresh);
  assert.equal(again.pets.find(p => p.name === 'Phoenix')?.methods.length, 2);
});

test('a stored journal with no Phoenix rate picks up the wiki roll rate', () => {
  const old = structuredClone(seed) as Journal;
  old.calculationVersion = 2;
  const pet = old.pets.find(p => p.name === 'Phoenix') as Pet;
  pet.crateRolls = null;
  pet.methods = [{name: 'Wintertodt', kc: 2425, rate: null, kph: null, activity: 'Wintertodt', unit: 'games', source: 'old'}];
  const next = upgradeEstimates(old);
  const method = next.pets.find(p => p.name === 'Phoenix')?.methods[0];
  assert.equal(method?.rate, 5000);
  assert.equal(method?.unit, 'rolls');
  assert.equal(method?.kc, null);
  assert.equal(next.calculationVersion, 4);
});

test('Phoenix crate rolls are entered and are not derived from subdues', () => {
  assert.deepEqual(phoenixShownCount(null, 2425), {value: 2425, unit: 'subdues'});
  assert.deepEqual(phoenixShownCount(5200, 2425), {value: 5200, unit: 'rolls'});
  assert.equal(phoenixShownCount(null, null), null);
  assert.equal(phoenixRollChance(null, 5000), null);
  const atRolls = phoenixRollChance(5200, 5000);
  assert.ok(atRolls != null && atRolls > 0.6 && atRolls < 0.7);
  const raw = structuredClone(seed) as Journal;
  raw.pets.find(p => p.name === 'Phoenix')!.crateRolls = null;
  const journal = upgradeEstimates(raw);
  const pet = journal.pets.find(p => p.name === 'Phoenix') as Pet;
  assert.equal(pet.methods[0].kc, null);
  assert.equal(journal.hiscores.activities.find(a => a.name === 'Wintertodt')?.score, 2425);
});
