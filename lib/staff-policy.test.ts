import assert from 'node:assert/strict';
import test from 'node:test';
import {mayGrant, mayManageProfile, mayReview, evidenceUrl} from './staff-policy.ts';
import {rateCatalogue, applyTableRates, applyPetRates, type RateOverride} from './rate-catalogue.ts';
import {achievementTitle, assertFlair, badgeCatalogue} from './flair.ts';
import {initial} from './model.ts';
import {activityItemRates} from './drop-rates.ts';
import raw from './drops-index.json' with {type:'json'};
import names from './item-names.json' with {type:'json'};
import type {DropSource} from './ui.ts';

test('staff grants cannot escalate to owner, change self, or let admins manage admins', () => {
  assert.equal(mayGrant({id:'a',role:'owner'},{id:'a',role:'owner'},'helper'),false);
  assert.equal(mayGrant({id:'a',role:'owner'},{id:'b',role:null},'owner'),false);
  assert.equal(mayGrant({id:'a',role:'admin'},{id:'b',role:null},'admin'),false);
  assert.equal(mayGrant({id:'a',role:'admin'},{id:'b',role:'admin'},null),false);
  assert.equal(mayGrant({id:'a',role:'admin'},{id:'b',role:'helper'},'moderator'),true);
  assert.equal(mayGrant({id:'a',role:'helper'},{id:'b',role:null},'helper'),false);
  assert.equal(mayGrant({id:'a',role:'owner'},{id:'b',role:null},'admin'),true);
  assert.equal(mayReview('moderator','rate'),true);
  assert.equal(mayReview('moderator','record'),true);
  assert.equal(mayReview('helper','record'),false);
});

test('profile staff controls: admins and the owner, never their own account, the owner or (for admins) another admin', () => {
  for(const role of ['helper','moderator'] as const) assert.equal(mayManageProfile({id:'a',role},{id:'b',role:null}),false);
  assert.equal(mayManageProfile({id:'a',role:'admin'},{id:'b',role:null}),true);
  assert.equal(mayManageProfile({id:'a',role:'admin'},{id:'b',role:'moderator'}),true);
  assert.equal(mayManageProfile({id:'a',role:'admin'},{id:'b',role:'admin'}),false);
  assert.equal(mayManageProfile({id:'a',role:'admin'},{id:'a',role:'admin'}),false);
  assert.equal(mayManageProfile({id:'a',role:'admin'},{id:'b',role:'owner'}),false);
  assert.equal(mayManageProfile({id:'a',role:'owner'},{id:'b',role:'admin'}),true);
  assert.equal(mayManageProfile({id:'a',role:'owner'},{id:'a',role:'owner'}),false);
});

test('rate evidence only accepts an HTTPS OSRS Wiki article', () => {
  for(const value of ['javascript:alert(1)','https://oldschool.runescape.wiki.evil.com/w/Kraken','https://user:pass@oldschool.runescape.wiki/w/Kraken','http://oldschool.runescape.wiki/w/Kraken','https://oldschool.runescape.wiki/api.php']) assert.throws(()=>evidenceUrl(value,true));
  assert.equal(evidenceUrl('https://oldschool.runescape.wiki/w/Kraken#Drops',true),'https://oldschool.runescape.wiki/w/Kraken#Drops');
});

test('one reviewed fixed pet rate updates table, collection tile and hunt method consistently', () => {
  const target=rateCatalogue().find(t=>t.source==='Kraken'&&t.item==='Pet Kraken');assert.ok(target);
  const override:RateOverride={kind:'rate',target:target.key,payload:JSON.stringify({denominator:3100}),source:target.url,revision:1};
  const j=applyPetRates(structuredClone(initial),[override]);
  const pet=j.pets.find(p=>p.name==='Pet Kraken')!;
  assert.equal(pet.methods.find(m=>m.activity==='Kraken')?.rate,3100);
  const sources=applyTableRates((raw as unknown as {pages:Record<string,DropSource[]>}).pages.Kraken,[override]);
  const tile=activityItemRates(sources,[pet.id],names)[pet.id];
  assert.equal(tile.p,1/3100);
  assert.equal(tile.r,'1/3,100');
  assert.equal(initial.pets.find(p=>p.id===pet.id)?.methods[0].rate,3000);
});

test('all-pets title requires the entire catalogue; Bloodhound display requires ownership', () => {
  const j=structuredClone(initial);
  for(const pet of j.pets)pet.obtained=true;
  assert.equal(achievementTitle(j,'pets-all'),'the Beastmaster');
  const hound=j.pets.find(p=>p.name==='Bloodhound')!;
  assert.equal(assertFlair(j,{companionPet:hound.id}).companionPet,hound.id);
  hound.obtained=false;
  assert.equal(achievementTitle(j,'pets-all'),null);
  assert.throws(()=>assertFlair(j,{companionPet:hound.id}));
  j.pets=j.pets.slice(0,1);j.pets[0].obtained=true;
  assert.equal(badgeCatalogue(j).find(b=>b.id==='pets-all')?.unlocked,false);
});
