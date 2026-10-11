import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {renderShareCharacter,renderSharePet} from './share-character.ts';
import {appearanceModels} from './appearance.ts';
import {emptyEquipped,wearables} from './flair.ts';
const localAsset=async(path:string)=>JSON.parse(readFileSync('public'+path,'utf8'));

test('both share characters include the real jaw and retain their saved body, hair and skin',async()=>{
 const outputs:string[]=[];
 for(const body of ['male','female'] as const){const paths:string[]=[];const result=await renderShareCharacter({appearance:{body,hair:'red',skin:'tan'},loadAsset:async path=>{paths.push(path);return localAsset(path);}});const kits=body==='female'?appearanceModels.femaleKits:wearables.kits;assert.ok(paths.includes('/models/look/'+kits.find(k=>k.part===1)!.file));assert.ok(paths.includes(`/models/look/appearance/${body}-red.gltf`));assert.deepEqual(result.missing,[]);assert.ok(result.svg.includes('width="300" height="470"'));assert.equal(atob(result.dataUrl.split(',')[1]),result.svg);assert.ok(!/NaN|Infinity|<script|onload|http[s]?:\/\/(?!www.w3.org)/.test(result.svg));outputs.push(result.svg);}
 assert.notEqual(outputs[0],outputs[1]);
 const defaultSkin=await renderShareCharacter({appearance:{body:'male',hair:'red'},loadAsset:localAsset});assert.notEqual(defaultSkin.svg,outputs[0]);
});

test('saved Pyromancer gear covers the matching base parts and preserves embedded cape texture',async()=>{
 const paths:string[]=[];const equipped={...emptyEquipped(),head:'20708',body:'20704',legs:'20706',feet:'20710',cape:'21295'};
 const dressed=await renderShareCharacter({appearance:{body:'female',hair:'blonde'},equipped,loadAsset:async path=>{paths.push(path);return localAsset(path);}});
 assert.deepEqual(dressed.missing,[]);assert.ok(paths.includes('/models/look/appearance/female-hat-head.gltf'));assert.ok(paths.includes('/models/look/'+appearanceModels.femaleItems['20704']));assert.ok(!paths.includes('/models/look/'+appearanceModels.femaleKits.find(k=>k.part===2)!.file));assert.match(dressed.svg,/data:image\/png;base64,/);assert.match(dressed.svg,/<pattern/);assert.ok(dressed.svg.length<500_000,'Small enough for an embedded share-card image');
 const plain=await renderShareCharacter({appearance:{body:'female',hair:'blonde'},loadAsset:localAsset});assert.notEqual(dressed.svg,plain.svg);
});

test('unknown or wrong-slot equipment cannot become loader URLs',async()=>{
 const paths:string[]=[];const equipped={...emptyEquipped(),head:'https://attacker.invalid/a.gltf',body:'20708'};
 const output=await renderShareCharacter({equipped,loadAsset:async path=>{paths.push(path);return localAsset(path);}});
 const plain=await renderShareCharacter({loadAsset:localAsset});assert.equal(output.svg,plain.svg);assert.ok(paths.every(path=>path.startsWith('/models/look/')&&!path.includes('attacker')));
});

test('missing and invalid model files degrade explicitly without external buffer loads',async()=>{
 const head='/models/look/appearance/male-brown.gltf';
 const result=await renderShareCharacter({loadAsset:async path=>{if(path===head){const g=await localAsset(path);g.buffers[0].uri='https://attacker.invalid/private';return g;}return localAsset(path);}});assert.deepEqual(result.missing,['appearance/male-brown.gltf']);assert.ok(!result.svg.includes('attacker'));
 await assert.rejects(renderShareCharacter({loadAsset:async()=>null}),/unavailable/);
 await assert.rejects(renderShareCharacter({width:Infinity,loadAsset:localAsset}),/dimensions/);
 await assert.rejects(renderShareCharacter({appearance:{body:'female',hair:'invalid'} as any,loadAsset:localAsset}),/valid body/);
});

test('share follower uses the real pet model and rejects untrusted IDs',async()=>{
 const id=Object.entries(wearables.pets).find(([,p])=>p.name==='Tangleroot')?.[0]??Object.keys(wearables.pets)[0];
 const paths:string[]=[];const pet=await renderSharePet(id,async path=>{paths.push(path);return localAsset(path);});
 assert.deepEqual(paths,['/models/look/'+wearables.pets[id].file]);assert.ok(pet.svg.includes('width="150" height="170"'));assert.ok(pet.svg.includes('<polygon'));
 await assert.rejects(renderSharePet('../private',localAsset),/unavailable/);
});
