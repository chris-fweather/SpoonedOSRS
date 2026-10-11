import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {lockPageScroll} from './scroll-lock.ts';
import {SKIN_COLORS,HAIR_GAME_COLORS,cacheRgb,cacheHex} from './game-colors.ts';
import {SKIN_TONES} from './appearance.ts';
import {skinColor,BASE_SKIN_RGB} from './skin-palette.ts';

test('modal scroll lock compensates the scrollbar and restores original styles and position',()=>{
 const keys=['document','window','getComputedStyle'] as const,prior=keys.map(k=>Object.getOwnPropertyDescriptor(globalThis,k));
 const body={style:{position:'relative',top:'2px',left:'',right:'',overflow:'auto',paddingRight:'4px'}},root={style:{overflow:''},clientWidth:980};let restored:unknown;
 try{
  Object.defineProperty(globalThis,'document',{configurable:true,value:{body,documentElement:root}});Object.defineProperty(globalThis,'window',{configurable:true,value:{scrollX:0,scrollY:630,innerWidth:1000,scrollTo:(v:unknown)=>{restored=v;}}});Object.defineProperty(globalThis,'getComputedStyle',{configurable:true,value:()=>({paddingRight:'4px'})});
  const unlock=lockPageScroll();assert.equal(body.style.position,'fixed');assert.equal(body.style.top,'-630px');assert.equal(body.style.paddingRight,'24px');assert.equal(root.style.overflow,'hidden');unlock();assert.equal(body.style.position,'relative');assert.equal(body.style.top,'2px');assert.equal(body.style.paddingRight,'4px');assert.equal(root.style.overflow,'');assert.deepEqual(restored,{top:630,left:0,behavior:'instant'});
 }finally{keys.forEach((k,i)=>{if(prior[i])Object.defineProperty(globalThis,k,prior[i]!);else Reflect.deleteProperty(globalThis,k);});}
});
test('skin swatches and rendered skin use the same verified game palette',()=>{
 assert.deepEqual(Object.values(SKIN_COLORS).sort((a,b)=>a-b),[4550,4537,5681,5673,5790,6806,8076,4574,17050,0,127,-31821,-17991].sort((a,b)=>a-b));
 for(const [tone,hsl] of Object.entries(SKIN_COLORS)){assert.equal(SKIN_TONES[tone as keyof typeof SKIN_COLORS],cacheHex(hsl));if(tone!=='default')assert.deepEqual(skinColor(BASE_SKIN_RGB,tone as keyof typeof SKIN_COLORS),cacheRgb(hsl));}
});
test('each exported hairstyle actually contains its displayed game hair colour',()=>{
 for(const body of ['male','female'])for(const [hair,value] of Object.entries(HAIR_GAME_COLORS)){
  const g=JSON.parse(readFileSync(`public/models/look/appearance/${body}-${hair}.gltf`,'utf8')),target=cacheRgb(value);let matches=0;
  for(const mesh of g.meshes)for(const p of mesh.primitives){const a=g.accessors[p.attributes.COLOR_0],v=g.bufferViews[a.bufferView],buf=Buffer.from(g.buffers[v.buffer].uri.split(',')[1],'base64'),offset=(v.byteOffset??0)+(a.byteOffset??0);for(let i=0;i<a.count;i++)if(target.every((n,k)=>Math.abs(n-buf.readFloatLE(offset+i*12+k*4))<1e-5))matches++;}
  assert.ok(matches>0,body+' '+hair);
 }
});
