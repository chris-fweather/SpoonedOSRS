import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync,existsSync} from 'node:fs';
import {OWNER_LAVA_MASK,RANK_STYLE,hasGildedSupporter} from './staff-appearance.ts';

test('infernal cape exports retain animated surfaces without the opaque upper-back triangle',()=>{
 for(const id of [21295,23622,24224]){
  const m=JSON.parse(readFileSync(`public/models/look/items/${id}.gltf`,'utf8'));
  const buffers=m.buffers.map((b:{uri:string})=>Buffer.from(b.uri.split(',')[1],'base64'));
  const values=(index:number):number[][]=>{
   const a=m.accessors[index],v=m.bufferViews[a.bufferView],bytes=a.componentType===5123?2:4;
   const count=a.type==='VEC3'?3:a.type==='VEC2'?2:1;
   return Array.from({length:a.count},(_,i)=>Array.from({length:count},(_,j)=>{
    const offset=(v.byteOffset??0)+(a.byteOffset??0)+i*(v.byteStride??bytes*count)+j*bytes;
    return a.componentType===5126?buffers[v.buffer].readFloatLE(offset):bytes===2?buffers[v.buffer].readUInt16LE(offset):buffers[v.buffer].readUInt32LE(offset);
   }));
  };
  let animatedFaces=0;
  for(const mesh of m.meshes)for(const p of mesh.primitives){
   const positions=values(p.attributes.POSITION),indices=values(p.indices).flat();
   assert.equal(indices.length%3,0);assert.ok(indices.every(i=>i>=0&&i<positions.length));
   if(m.materials[p.material].name?.startsWith('flow:')){animatedFaces+=indices.length/3;assert.equal(values(p.attributes.TEXCOORD_0).length,positions.length);}
   for(let i=0;i<indices.length;i+=3){
    const corners=indices.slice(i,i+3).map(n=>positions[n].join(',')).sort();
    assert.notDeepEqual(corners,['-33,158,-15','33,158,-15','-33,118,-21'].sort());
   }
  }
  assert.equal(animatedFaces,id===24224?0:30); // Locked variant is a static palette export.
 }
});
test('every staff rank has its own icon-pack scimitar, and the Owner blade has a lava mask',()=>{
 assert.equal(new Set(Object.values(RANK_STYLE).map(r=>r.src)).size,4);
 for(const style of Object.values(RANK_STYLE))assert.ok(style.src.startsWith('/icons/ranks/')&&existsSync('public'+style.src),style.src);
 assert.ok(existsSync('public'+OWNER_LAVA_MASK));
});

test('gilded supporter requires a visible verified USD total of at least 100 dollars',()=>{
 assert.equal(hasGildedSupporter(),false);
 for(const amountMinor of [null,0,9999])assert.equal(hasGildedSupporter({amountMinor,currency:'USD',hidden:false}),false);
 for(const amountMinor of [10000,50000])assert.equal(hasGildedSupporter({amountMinor,currency:'USD',hidden:false}),true);
 assert.equal(hasGildedSupporter({amountMinor:50000,currency:'USD',hidden:true}),false);
 assert.equal(hasGildedSupporter({amountMinor:50000,currency:'AUD',hidden:false}),false);
});

test('all male and female Fire/Infernal cape variants omit cache hidden faces and retain UVs',()=>{
 const wear=JSON.parse(readFileSync('lib/wearables.json','utf8')),appearance=JSON.parse(readFileSync('lib/appearance-models.json','utf8'));
 const hidden=JSON.parse(readFileSync('scripts/cape-hidden-faces.json','utf8')) as {corners:number[][]}[];
 const key=(corners:number[][])=>corners.map(p=>p.join(',')).sort().join('|');
 const fingerprints=new Set(hidden.map(f=>key(f.corners)));
 const files=new Set<string>(Object.entries(wear.items).filter(([,item]:[string,any])=>/^(Fire|Infernal) (max )?cape/.test(item.name)).flatMap(([id,item]:[string,any])=>[item.file,appearance.femaleItems[id]]).filter(Boolean));
 for(const file of files){
  const g=JSON.parse(readFileSync('public/models/look/'+file,'utf8'));
  const read=(id:number)=>{const a=g.accessors[id],v=g.bufferViews[a.bufferView],buf=Buffer.from(g.buffers[v.buffer].uri.split(',')[1],'base64'),size=({SCALAR:1,VEC2:2,VEC3:3,VEC4:4} as Record<string,number>)[a.type],bytes=a.componentType===5123?2:4;return Array.from({length:a.count},(_,i)=>Array.from({length:size},(_,j)=>{const pos=(a.byteOffset??0)+(v.byteOffset??0)+i*(v.byteStride??size*bytes)+j*bytes;return a.componentType===5126?buf.readFloatLE(pos):bytes===2?buf.readUInt16LE(pos):buf.readUInt32LE(pos);}));};
  let faces=0;
  for(const mesh of g.meshes)for(const p of mesh.primitives){const points=read(p.attributes.POSITION),indices=p.indices===undefined?points.map((_,i)=>i):read(p.indices).flat();faces+=indices.length/3;
   assert.equal(indices.length%3,0);assert.ok(indices.every(i=>Number.isInteger(i)&&i>=0&&i<points.length));
   for(let i=0;i<indices.length;i+=3)assert.ok(!fingerprints.has(key(indices.slice(i,i+3).map(n=>points[n]))),file);
   if(g.materials[p.material].name?.startsWith('flow:')){const uv=read(p.attributes.TEXCOORD_0);assert.equal(uv.length,points.length);assert.ok(uv.flat().every(Number.isFinite));}
  }
  assert.ok(faces>30,file+' visible cape geometry retained');
 }
});
