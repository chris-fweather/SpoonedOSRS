import test from 'node:test';
import assert from 'node:assert/strict';
import {supporterPositions} from './supporter-ranking.ts';
test('server supporter positions rank actual totals independently within each currency',()=>{
 const rows=[{name:'Ten',amountMinor:1000,currency:'USD'},{name:'Hundred',amountMinor:10000,currency:'USD'},
 {name:'Unknown',amountMinor:null,currency:'USD'},{name:'Euro',amountMinor:2000,currency:'EUR'},
 {name:'Also ten',amountMinor:1000,currency:'USD'}];
 const result=supporterPositions(rows);
 assert.equal(result.get('Hundred'),1);assert.equal(result.get('Also ten'),2);assert.equal(result.get('Ten'),3);
 assert.equal(result.get('Euro'),1);assert.equal(result.has('Unknown'),false);
 assert.deepEqual([...result.values()].sort(),[1,1,2,3]);
});
