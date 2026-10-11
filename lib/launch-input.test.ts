import {test} from 'node:test';
import assert from 'node:assert/strict';
import {publicMessage,requestJson,RequestError} from './request-body';
import {parseLog} from './model';
import {parseProfileProgress} from './import-progress';
test('import discards unrelated fields at every collection-log level',()=>{
 const raw={email:'private@example.invalid',obtained:1,total:2,tabs:[{name:'Bosses',token:'secret',pages:[{name:'Example',obtained:1,total:2,email:'private',items:[{id:123,name:'Example item',quantity:1,obtained:true,password:'secret'}]}]}]};
 const parsed=parseLog(raw),serial=JSON.stringify(parsed);
 assert.equal(parsed.tabs[0].pages[0].items[0].id,123);
 for(const key of ['email','token','password','secret','private'])assert.ok(!serial.includes(key));
});
test('progress import copies only recognised fields, including nested diary tiers',()=>{
 const parsed=parseProfileProgress({email:'private',quests:[{id:1,name:'Quest',type:'free',state:'finished',points:1,token:'secret'}],achievementDiaries:[{areaId:1,area:'Area',ip:'private',tiers:[{tier:'easy',completed:1,total:2,email:'private'}]}],combatAchievements:[{id:1,name:'Tier',completed:1,total:2,email:'private'}]});
 assert.equal(parsed.diaries[0].tiers[0].completed,1);
 assert.ok(!JSON.stringify(parsed).includes('private'));assert.ok(!JSON.stringify(parsed).includes('secret'));
});
test('body limit counts streamed bytes even without Content-Length',async()=>{
 const chunks=[new TextEncoder().encode('{"value":"'),new TextEncoder().encode('é'.repeat(20)),new TextEncoder().encode('"}')];
 const stream=new ReadableStream({pull(c){const chunk=chunks.shift();if(chunk)c.enqueue(chunk);else c.close();}});
 const request=new Request('http://localhost/api/sync',{method:'POST',headers:{'Content-Type':'application/json'},body:stream,duplex:'half'} as RequestInit);
 await assert.rejects(requestJson(request,32),(e:unknown)=>e instanceof RequestError&&e.status===413);
});
test('JSON body rejects non-object, invalid JSON and wrong content type',async()=>{
 for(const [body,type,status] of [['[]','application/json',400],['{','application/json',400],['{}','text/plain',415]] as const){
  await assert.rejects(requestJson(new Request('http://localhost',{method:'POST',headers:{'Content-Type':type},body})),(e:unknown)=>e instanceof RequestError&&e.status===status);
 }
 assert.deepEqual(await requestJson(new Request('http://localhost',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"a":1}'})),{a:1});
});
test('players see only the app’s own error messages, never runtime or database internals',()=>{
 const fallback='Sync failed.';
 class HttpError extends Error{constructor(message:string){super(message);this.name='HttpError';}}
 assert.equal(publicMessage(Error('OSRS hiscores are unavailable.'),fallback),'OSRS hiscores are unavailable.');
 assert.equal(publicMessage(new RequestError(429,'Busy.'),fallback),'Busy.');
 assert.equal(publicMessage(new HttpError('Log in first.'),fallback),'Log in first.');
 for(const leak of [new TypeError('Invalid redirect value, must be one of "follow" or "manual"'),new SyntaxError('Unexpected token < in JSON'),new DOMException('The operation was aborted due to timeout','TimeoutError'),Error('D1_ERROR: no such table: journals'),'string',null])
  assert.equal(publicMessage(leak,fallback),fallback);
});
