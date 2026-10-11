import assert from 'node:assert/strict';
import test from 'node:test';
import {activityItemRates} from './drop-rates.ts';
import index from './drops-index.json' with {type:'json'};
import names from './item-names.json' with {type:'json'};
import type {DropSource} from './ui.ts';
test('Kraken tentacle tile agrees with the Kraken table rather than Cave kraken', () => {
  const id = Object.keys(names).find(id => (names as Record<string,string>)[id].toLowerCase()==='kraken tentacle')!;
  const sources = index.pages.Kraken as unknown as DropSource[];
  const rate = activityItemRates(sources,[id],names)[id];
  assert.equal(rate.r,'1/400');
  assert.equal(rate.p,1/400);
});
test('conditional or different-source variants are preserved, not averaged', () => {
  const sources: DropSource[] = [{t:'Boss',u:'wiki',tabs:[{h:'Normal',r:[['Item','1','1/100',.01,'']]},{h:'Special',r:[['Item','1','1/50',.02,'']]}]}];
  const rate=activityItemRates(sources,['1'],{'1':'Item'})['1'];
  assert.equal(rate.r,'1/50'); assert.equal(rate.p,null); assert.equal(rate.all?.length,2);
  assert.deepEqual(activityItemRates(sources,['2'],{'2':'Other'}),{});
});

test('Nex base table rows never become fixed personal KC probabilities',()=>{
 const result=activityItemRates([{t:'Nex',u:'https://oldschool.runescape.wiki/w/Nex',tabs:[{h:'Tertiary',r:[['Nexling','1','1/500',1/500,'']]}]}],['26348'],{'26348':'Nexling'});
 assert.equal(result['26348'].p,null);assert.equal(result['26348'].r,'1/500');
});
