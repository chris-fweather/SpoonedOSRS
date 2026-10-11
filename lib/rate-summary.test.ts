import assert from 'node:assert/strict';
import test from 'node:test';
import {highestListedRate} from './rate-summary.ts';
import {collectionItemRates} from './collection-rates.ts';
test('tile uses the highest listed chance, including semicolon variants',()=>{
 assert.equal(highestListedRate(['1/1,200','1/400']),'1/400');
 assert.equal(highestListedRate(['62/128 ; 62/123']),'62/123');
 assert.equal(highestListedRate(['5/128 ; Never']),'5/128');
 assert.equal(highestListedRate(['Always; Never']),'Always');
 assert.equal(highestListedRate(['Depends on contribution and points']),'Conditional');
});
test('conditional summary leaves odds unknown and retains original conditions',()=>{
 const rates=collectionItemRates([],['1'],{'1':'Item'},{'1':{title:'Item',url:'wiki',revision:1,fetchedAt:'today',intro:'Conditional.',tables:[{heading:'Sources',headers:['Source','Rarity'],rows:[[{text:'Unsired'},{text:'62/128 ; 62/123'}]]}]}});
 assert.equal(rates['1'].r,'62/123');assert.equal(rates['1'].p,null);assert.equal(rates['1'].all?.[0][1],'62/128 ; 62/123');
});
