/** Build hair-free heads from the exported colour variants, preserving all face geometry. */
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root='public/models/look/appearance/';
function values(g,id){const a=g.accessors[id],v=g.bufferViews[a.bufferView];if(a.componentType!==5126||v.byteStride)throw Error('Expected packed float attributes');const b=Buffer.from(g.buffers[v.buffer].uri.split(',')[1],'base64'),start=(v.byteOffset??0)+(a.byteOffset??0);return Array.from({length:a.count*3},(_,i)=>b.readFloatLE(start+i*4));}
for(const body of ['male','female']){
 const base=JSON.parse(readFileSync(root+body+'-brown.gltf','utf8')),other=JSON.parse(readFileSync(root+body+'-blonde.gltf','utf8')),out=structuredClone(base);
 out.asset.generator='SpoonedOSRS hat head: hair faces removed by palette-variant comparison';out.buffers=[];out.bufferViews=[];out.accessors=[];
 for(let m=0;m<base.meshes.length;m++)for(let p=0;p<base.meshes[m].primitives.length;p++){
  const original=base.meshes[m].primitives[p],comparison=other.meshes[m].primitives[p],target=out.meshes[m].primitives[p];
  if(original.indices!==undefined)throw Error('Expected non-indexed source head');
  const colors=values(base,original.attributes.COLOR_0),recolored=values(other,comparison.attributes.COLOR_0),positions=values(base,original.attributes.POSITION);
  if(JSON.stringify(positions)!==JSON.stringify(values(other,comparison.attributes.POSITION)))throw Error('Colour variants must share geometry');
  const keep=[];for(let face=0;face<colors.length;face+=9)if(colors.slice(face,face+9).every((c,i)=>c===recolored[face+i]))for(let v=0;v<3;v++)keep.push(face/3+v);
  if(!keep.length||keep.length===colors.length/3)throw Error('Expected both hair and face geometry');
  for(const [name,id]of Object.entries(original.attributes)){
   const source=values(base,id),data=Float32Array.from(keep.flatMap(v=>source.slice(v*3,v*3+3))),n=out.buffers.length,a={...base.accessors[id],bufferView:n,count:keep.length};
   delete a.byteOffset;delete a.min;delete a.max;
   if(name==='POSITION'){a.min=[0,1,2].map(axis=>Math.min(...keep.map(v=>source[v*3+axis])));a.max=[0,1,2].map(axis=>Math.max(...keep.map(v=>source[v*3+axis])));}
   out.buffers.push({uri:'data:application/octet-stream;base64,'+Buffer.from(data.buffer).toString('base64'),byteLength:data.byteLength});out.bufferViews.push({buffer:n,byteLength:data.byteLength});out.accessors.push(a);target.attributes[name]=n;
  }
  console.log(`${body}: removed ${(colors.length/3-keep.length)/3} hair triangles; retained ${keep.length/3} face triangles`);
 }
 const hash=createHash('sha256');for(const mesh of out.meshes)for(const primitive of mesh.primitives)hash.update(JSON.stringify(values(out,primitive.attributes.POSITION)));out.asset.extras={...out.asset.extras,geometrySha256:hash.digest('hex'),hairRemoved:true};
 writeFileSync(root+body+'-hat-head.gltf',JSON.stringify(out));
}
