import assert from 'node:assert/strict';
import test from 'node:test';
import {collectionItemRates,refreshActivityRates,type CollectionReference} from './collection-rates.ts';
import {applyTableRates,rateKey} from './rate-catalogue.ts';
import {pageKc,type DropSource} from './ui.ts';
import {initial} from './model.ts';
import {rollProbability} from './wiki-drops.ts';
const names={'1':'Tentacle'};
const sources:DropSource[]=[{t:'Kraken',u:'https://oldschool.runescape.wiki/w/Kraken',tabs:[{h:'Unique',r:[['Tentacle','1','1/300',1/300,'']]}]}];
function doc(rows:string[][]):CollectionReference {return {title:'Tentacle',url:'https://oldschool.runescape.wiki/w/Tentacle',revision:10,fetchedAt:'2026-10-05T00:00:00Z',intro:'An item.',tables:[{heading:'Item sources',headers:['Source','Level','Quantity','Rarity'],rows:rows.map(r=>r.map(text=>({text})))}]};}
const reference={'1':doc([['Cave kraken','127','1','1/1,200'],['Kraken','291','1','1/400']])};
test('fresh exact-item sources reconcile table, tile and KC probability',()=>{
 const fresh=refreshActivityRates(sources,names,reference);
 assert.equal(fresh[0].tabs[0].r[0][2],'1/400');
 const rate=collectionItemRates(fresh,['1'],names,reference)['1'];
 assert.equal(rate.r,'1/400');assert.equal(rate.p,1/400);assert.equal(rate.kcSource,'Kraken');
 assert.equal(sources[0].tabs[0].r[0][2],'1/300');
});
test('reviewed corrections still apply after Wiki refresh',()=>{
 const fresh=refreshActivityRates(sources,names,reference);
 const reviewed=applyTableRates(fresh,[{kind:'rate',target:rateKey('Kraken','Unique','Tentacle'),payload:JSON.stringify({denominator:500}),source:'https://oldschool.runescape.wiki/w/Kraken',revision:1}]);
 const rate=collectionItemRates(reviewed,['1'],names,reference)['1'];
 assert.equal(rate.r,'1/500');assert.equal(rate.p,1/500);
});
test('reward-table rates never become boss KC probabilities',()=>{
 const rate=collectionItemRates(sources,['1'],names,{'1':doc([['Unsired','N/A','1','5/128']])})['1'];
 assert.equal(rate.r,'5/128');assert.equal(rate.p,null);assert.equal(rate.kcSource,undefined);
});
test('variants and conditional rates are retained without averaging',()=>{
 const refs={'1':doc([['Kraken','291','1','1/400'],['Kraken','291','1','1/200']])};
 const rate=collectionItemRates(sources,['1'],names,refs)['1'];
 assert.equal(rate.p,null);assert.equal(rate.all?.length,2);assert.equal(rate.r,'1/200');
 assert.equal(refreshActivityRates(sources,names,refs)[0].tabs[0].r[0][2],'1/300');
});
test('different IDs with the same display name keep their own Wiki pages',()=>{
 const a={...doc([]),title:'Crate (A)',acquisition:['Purchased for 10 points.']};
 const b={...doc([]),title:'Crate (B)',acquisition:['Awarded after completing the quest.']};
 const rates=collectionItemRates([],['1','2'],{'1':'Crate','2':'Crate'},{'1':a,'2':b});
 assert.equal(rates['1'].status,'acquisition');assert.equal(rates['2'].acquisition?.[0],b.acquisition[0]);assert.equal(rates['1'].p,null);
});
test('missing references remain unverified instead of a made-up denominator',()=>{
 const rate=collectionItemRates([],['1'],names,{})['1'];
 assert.equal(rate.r,'Rate not verified');assert.equal(rate.status,'unresolved');
});
test('Nex contribution rates remain reference-only',()=>{
 const nex:DropSource[]=[{...sources[0],t:'Nex'}];
 const rate=collectionItemRates(nex,['1'],names,{'1':doc([['Nex','1001','1','1/258']])})['1'];
 assert.equal(rate.p,null);
});
test('zero KC is known while unranked KC stays unknown',()=>{
 const j=structuredClone(initial);j.hiscores.activities=[{name:'Kraken',score:0,rank:-1}];
 assert.equal(pageKc(j,'Kraken'),0);j.hiscores.activities[0].score=-1;assert.equal(pageKc(j,'Kraken'),null);
});

test('conditional Always text is not a guaranteed independent drop',()=>{
 assert.equal(rollProbability('Always'),1);assert.equal(rollProbability('Always; Never'),null);
 assert.equal(rollProbability('1/100; 1/50'),null);
});
