import assert from 'node:assert/strict';
import test from 'node:test';
import {loadCollectorPreview} from './collector-preview-cache.ts';

test('previews share in-flight requests, omit credentials, expire, and recover from failures',async()=>{
 const original=globalThis.fetch,clock=Date.now;let now=10_000,calls=0,fail=false;
 try{
  Date.now=()=>now;
  globalThis.fetch=async (_url,options)=>{calls++;assert.equal(options?.credentials,'omit');return new Response(JSON.stringify({username:'Tester'}),{status:fail?503:200});};
  const first=loadCollectorPreview('Cache Tester'),same=loadCollectorPreview('cache tester');
  assert.equal(first,same);await first;assert.equal(calls,1);
  await loadCollectorPreview('Cache Tester');assert.equal(calls,1);
  now+=30_001;await loadCollectorPreview('Cache Tester');assert.equal(calls,2);
  await loadCollectorPreview('Cache Tester',true);assert.equal(calls,3);
  fail=true;await assert.rejects(loadCollectorPreview('Failure'));fail=false;
  await loadCollectorPreview('Failure');assert.equal(calls,5);
  for(let i=0;i<9;i++)await loadCollectorPreview('User '+i);
  const before=calls;await loadCollectorPreview('Cache Tester');assert.equal(calls,before+1);
 }finally{globalThis.fetch=original;Date.now=clock;}
});
