import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cachedBoard} from './board-response-cache';
test('public cache reuses same version but cannot retain private data after a version change',async()=>{
 let calls=0;const old=()=>{calls++;return Promise.resolve({rows:['public-player']});};
 assert.equal((await cachedBoard(100,'pets',old)).hit,false);
 assert.equal((await cachedBoard(100,'pets',old)).hit,true);assert.equal(calls,1);
 const next=await cachedBoard(101,'pets',async()=>({rows:[]}));assert.equal(next.hit,false);assert.deepEqual(JSON.parse(next.data),{rows:[]});
});
