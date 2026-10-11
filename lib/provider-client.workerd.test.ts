import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {convertV4MiniflareOptions,Miniflare} from 'miniflare';

// Node accepts fetch options that the Workers runtime rejects: redirect:'error' passed
// every Node test yet broke every live sync. Run the client in workerd with its real fetch and D1.
const source=(file:string)=>stripTypeScriptTypes(readFileSync(new URL(file,import.meta.url),'utf8')).replaceAll("from './request-body'","from './request-body.js'");
const worker=`import {createProviderClient} from './provider-client.js';
export default {async fetch(request,env){
 const client=createProviderClient({database:env.DB,key:async s=>s,dailyBudget:async()=>{}});
 try{const r=await client(new URL(request.url).searchParams.get('url'));return Response.json({status:r.status,cache:r.headers.get('X-Spooned-Cache'),body:r.status===200?await r.json():null});}
 catch(e){return Response.json({error:e.constructor.name+': '+e.message});}
}};`;

test('provider client runs in the Workers runtime without following redirects',async()=>{
 const upstream:string[]=[];
 const mf=new Miniflare(convertV4MiniflareOptions({
  compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],
  modules:[
   {type:'ESModule',path:'worker.js',contents:worker},
   {type:'ESModule',path:'provider-client.js',contents:source('./provider-client.ts')},
   {type:'ESModule',path:'request-body.js',contents:source('./request-body.ts')},
  ],
  d1Databases:['DB'],
  outboundService:request=>{upstream.push(request.url);return request.url.endsWith('/Moved')?new Response(null,{status:302,headers:{Location:'https://other.example/'}}):Response.json({ok:true});},
 }));
 try{
  const db=await mf.getD1Database('DB');
  const migration=readFileSync(new URL('../drizzle/0021_provider_controls.sql',import.meta.url),'utf8');
  await db.batch(migration.split(';').map(s=>s.trim()).filter(Boolean).map(s=>db.prepare(s)));
  const call=async(url:string)=>(await mf.dispatchFetch('http://spooned.test/?'+new URLSearchParams({url}))).json();
  const rp='https://api.runeprofile.com/v1/accounts/Tester/full';
  assert.deepEqual(await call(rp),{status:200,cache:'miss',body:{ok:true}});
  assert.deepEqual(await call(rp),{status:200,cache:'hit',body:{ok:true}});
  assert.deepEqual(await call('https://api.wiseoldman.net/v2/players/Moved'),{status:302,cache:null,body:null});
  assert.deepEqual(upstream,[rp,'https://api.wiseoldman.net/v2/players/Moved']);
 }finally{await mf.dispose();}
});
