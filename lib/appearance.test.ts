import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync,existsSync} from 'node:fs';
import {parseAppearance,equipmentModel,appearanceModels,featuredEmblem,headModel,HAIR_COLORS} from './appearance.ts';
import {initial} from './model.ts';
import {wearables,badgeCatalogue,coerceFlair} from './flair.ts';

test('appearance accepts only explicit body and hair choices',()=>{
 assert.deepEqual(parseAppearance({body:'female',hair:'blonde',admin:true}),{body:'female',hair:'blonde'});
 for(const value of [null,[],{}, {body:'female',hair:'unknown'},{body:'../female',hair:'brown'}])assert.throws(()=>parseAppearance(value));
});
test('female outfits choose their own models, never silently substitute a male mesh',()=>{
 const a={body:'female',hair:'blonde'} as const;
 for(const id of ['10458','21295','1035','1033']){const file=equipmentModel(id,wearables.items[id].file,a);assert.ok(file?.startsWith('female/'));assert.ok(existsSync('public/models/look/'+file));}
 assert.equal(equipmentModel('missing','items/male.gltf',a),null);
 assert.equal(equipmentModel('10458','items/male.gltf',{body:'male',hair:'brown'}),'items/male.gltf');
 assert.deepEqual(appearanceModels.femaleKits.map(k=>k.part),[0,1,2,3,4,5,6]);
 for(const body of ['male','female'] as const){const files=Object.values(appearanceModels.hair[body]);assert.equal(new Set(files.map(f=>readFileSync('public/models/look/'+f,'utf8'))).size,5);}
});
test('every female model reference exists and representative textured gear has finite UVs',()=>{
 for(const file of new Set(Object.values(appearanceModels.femaleItems)))assert.ok(existsSync('public/models/look/'+file),file);
 for(const id of ['21295','21284','24224','3053','12774','10458']){
  const file=appearanceModels.femaleItems[id];const g=JSON.parse(readFileSync('public/models/look/'+file,'utf8'));
  for(const a of g.accessors){const v=g.bufferViews[a.bufferView],buf=Buffer.from(g.buffers[v.buffer].uri.split(',')[1],'base64');for(let i=0;i<buf.length;i+=4)assert.ok(Number.isFinite(buf.readFloatLE(i)),file);}
  if(id==='21295')assert.ok(g.materials.some((m:{name?:string})=>m.name?.startsWith('flow:0,')));
 }
});
test('picker offers spaced pet and collection milestones while preserving legacy selection support',()=>{
 assert.equal(featuredEmblem('pets-15'),false);assert.equal(featuredEmblem('pets-25'),false);
 for(const id of ['pets-5','pets-10','pets-20','pets-30','pets-50','pets-all','clog-all'])assert.equal(featuredEmblem(id),true);
});

test('custom hats hide every recoloured hair face and retain the original face geometry',()=>{
 function attribute(g:any,id:number){const a=g.accessors[id],v=g.bufferViews[a.bufferView],buf=Buffer.from(g.buffers[v.buffer].uri.split(',')[1],'base64'),offset=(v.byteOffset??0)+(a.byteOffset??0);return Array.from({length:a.count*3},(_,i)=>buf.readFloatLE(offset+i*4));}
 const read=(file:string)=>JSON.parse(readFileSync('public/models/look/'+file,'utf8'));
 for(const body of ['male','female'] as const){
  const brown=read(headModel({body,hair:'brown'},false)),blonde=read(headModel({body,hair:'blonde'},false)),hat=read(headModel({body,hair:'blonde'},true));
  for(let m=0;m<brown.meshes.length;m++)for(let p=0;p<brown.meshes[m].primitives.length;p++){
   const original=brown.meshes[m].primitives[p],alternate=blonde.meshes[m].primitives[p],result=hat.meshes[m].primitives[p];
   const colors=attribute(brown,original.attributes.COLOR_0),changed=attribute(blonde,alternate.attributes.COLOR_0),positions=attribute(brown,original.attributes.POSITION);
   const expectedPositions:number[]=[],expectedColors:number[]=[];let hairFaces=0;
   for(let i=0;i<colors.length;i+=9){if(colors.slice(i,i+9).some((c,k)=>c!==changed[i+k])){hairFaces++;continue;}expectedPositions.push(...positions.slice(i,i+9));expectedColors.push(...colors.slice(i,i+9));}
   assert.ok(hairFaces>0);assert.ok(expectedPositions.length>0);
   assert.deepEqual(attribute(hat,result.attributes.POSITION),expectedPositions,body+' face geometry preserved');
   assert.deepEqual(attribute(hat,result.attributes.COLOR_0),expectedColors,body+' skin and eyes preserved');
  }
  for(const hair of HAIR_COLORS){assert.equal(headModel({body,hair},true),headModel({body,hair:'brown'},true));assert.equal(headModel({body,hair},false),appearanceModels.hair[body][hair]);}
 }
 assert.equal(headModel(parseAppearance({body:'auto',hair:'brown'}),true),'appearance/male-hat-head.gltf');
});

test('quest and diary emblems require completion, while collection milestones remain',()=>{
 const j=structuredClone(initial),badges=badgeCatalogue(j);
 assert.equal(badges.filter(b=>b.id.startsWith('quests-')||b.id.startsWith('diaries-')).length,0);
 for(const id of ['quest-cape','diary-cape','pets-10','clog-429'])assert.ok(badges.some(b=>b.id===id));
 assert.equal(coerceFlair(j,{pinnedMark:'quests-50'}).pinnedMark,null);
 j.profile={quests:[{id:1,name:'Quest',state:'finished',points:1,type:'free'}],diaries:[{areaId:1,area:'Area',tiers:[{tier:'Easy',completed:1,total:2}]}],combat:[],syncedAt:''};
 assert.equal(badgeCatalogue(j).find(b=>b.id==='quest-cape')?.unlocked,true);
 assert.equal(badgeCatalogue(j).find(b=>b.id==='diary-cape')?.unlocked,false);
});

test('legacy imported appearance resolves to a selectable default character',()=>{
 assert.equal(parseAppearance({body:'auto',hair:'brown'}).body,'male');
 assert.equal(parseAppearance({body:'female',hair:'red'}).body,'female');
});

test('mine and woodland are valid scenes with thumbnails; unknown scenes are refused',()=>{
 for(const background of ['none','castle','riverside','mine','woodland']){
  assert.equal(parseAppearance({body:'male',hair:'brown',background}).background,background);
  assert.ok(existsSync(new URL(`../public/ui/scenes/${background}.webp`,import.meta.url)),background);
 }
 assert.throws(()=>parseAppearance({body:'male',hair:'brown',background:'moon'}));
 assert.match(readFileSync(new URL('../drizzle/0023_profile_scenes.sql',import.meta.url),'utf8'),/'mine','woodland'/);
});
