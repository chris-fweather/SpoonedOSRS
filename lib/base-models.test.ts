import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {appearanceModels} from './appearance.ts';
import {wearables} from './flair.ts';
import provenance from './base-model-provenance.json' with {type:'json'};
function attribute(g:any,id:number){const a=g.accessors[id],v=g.bufferViews[a.bufferView],data=Buffer.from(g.buffers[v.buffer].uri.split(',')[1],'base64');return Array.from({length:a.count*3},(_,i)=>data.readFloatLE((v.byteOffset??0)+(a.byteOffset??0)+i*4));}
test('base identity kits carry normal vectors and preserve their verified cache coordinate hashes',()=>{
 for(const entry of provenance.files){const g=JSON.parse(readFileSync('public/models/look/'+entry.file,'utf8')),hash=createHash('sha256');assert.equal(g.asset.extras.identityKit,entry.kit);assert.deepEqual(g.asset.extras.cacheModelIds,entry.models);assert.ok(g.nodes.every((n:any)=>!n.scale),'No body dimension scaling');for(const mesh of g.meshes)for(const p of mesh.primitives){assert.notEqual(p.attributes.NORMAL,undefined,entry.file);const positions=attribute(g,p.attributes.POSITION),normals=attribute(g,p.attributes.NORMAL);assert.equal(positions.length,normals.length);hash.update(JSON.stringify(positions));for(let i=0;i<normals.length;i+=3)assert.ok(Math.abs(Math.hypot(...normals.slice(i,i+3))-1)<1e-5,entry.file+' normal length');}assert.equal(hash.digest('hex'),entry.geometrySha256,entry.file+' cache geometry');}
});
test('bare heads use interpolated cache normals rather than identical triangle normals',()=>{
 for(const body of ['male','female']){const g=JSON.parse(readFileSync(`public/models/look/appearance/${body}-brown.gltf`,'utf8')),p=g.meshes[0].primitives[0],normals=attribute(g,p.attributes.NORMAL);let smooth=0;for(let i=0;i<normals.length;i+=9)if(normals.slice(i,i+3).some((n:number,k:number)=>Math.abs(n-normals[i+3+k])>.001))smooth++;assert.ok(smooth>50,body+' retains smooth face shading');}
});

test('both base bodies include their separate clean-shaven cache jaw and preserve helmet coverage',()=>{
 for(const [body,kits,expectedModel]of [['male',wearables.kits,246],['female',appearanceModels.femaleKits,437]] as const){const jaw=kits.find(k=>k.part===1);assert.ok(jaw,body+' jaw component');assert.equal(jaw.hide,11,'Full-face equipment can cover the jaw');const g=JSON.parse(readFileSync('public/models/look/'+jaw.file,'utf8'));assert.deepEqual(g.asset.extras.cacheModelIds,[expectedModel]);const p=g.meshes[0].primitives[0],positions=attribute(g,p.attributes.POSITION),colors=attribute(g,p.attributes.COLOR_0);assert.equal(positions.length/9,10,body+' clean-shaven jaw triangles');const x=positions.filter((_,i)=>i%3===0);assert.ok(Math.min(...x)<0&&Math.max(...x)>0,'Jaw spans both sides of face');assert.ok(colors.every((c:number,i:number)=>Math.abs(c-colors[i%3])<1e-6),'Clean-shaven skin, no beard substitute');}
});
