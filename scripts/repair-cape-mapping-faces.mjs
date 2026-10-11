/** Remove cache render-type-2 mapping faces from existing Fire/Infernal exports.
 * Coordinates are the hidden faces from male/female cache models 9638/9640/33103/33111.
 * New exports skip the render type directly in export-appearance.mjs.
 */
import fs from 'node:fs';
const marks=JSON.parse(fs.readFileSync(new URL('./cape-hidden-faces.json',import.meta.url),'utf8')).map(face=>face.corners.flat());
const key=positions=>[0,3,6].map(i=>positions.slice(i,i+3).join(',')).sort().join('|');
const hidden=new Set(marks.map(key));
const manifest=JSON.parse(fs.readFileSync('lib/wearables.json','utf8')),female=JSON.parse(fs.readFileSync('lib/appearance-models.json','utf8'));
const files=new Set(Object.entries(manifest.items).filter(([,item])=>/^(Fire|Infernal) (max )?cape/.test(item.name)).flatMap(([id,item])=>[item.file,female.femaleItems[id]]).filter(Boolean));
function attribute(g,id){const a=g.accessors[id],v=g.bufferViews[a.bufferView],b=Buffer.from(g.buffers[v.buffer].uri.split(',')[1],'base64'),size={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type],bytes={5121:1,5123:2,5125:4,5126:4}[a.componentType],read={5121:'readUInt8',5123:'readUInt16LE',5125:'readUInt32LE',5126:'readFloatLE'}[a.componentType];return Array.from({length:a.count},(_,i)=>Array.from({length:size},(_,j)=>b[read]((a.byteOffset??0)+(v.byteOffset??0)+i*(v.byteStride??size*bytes)+j*bytes)));}
function append(g,rows,type){const data=Float32Array.from(rows.flat()),n=g.buffers.length;g.buffers.push({uri:'data:application/octet-stream;base64,'+Buffer.from(data.buffer).toString('base64'),byteLength:data.byteLength});g.bufferViews.push({buffer:n,byteLength:data.byteLength});const a={bufferView:g.bufferViews.length-1,componentType:5126,type,count:rows.length};if(type==='VEC3'){a.min=[0,1,2].map(k=>Math.min(...rows.map(row=>row[k])));a.max=[0,1,2].map(k=>Math.max(...rows.map(row=>row[k])));}g.accessors.push(a);return g.accessors.length-1;}
for(const file of files){const path='public/models/look/'+file,g=JSON.parse(fs.readFileSync(path,'utf8'));let removed=0;
 for(const mesh of g.meshes)for(const p of mesh.primitives){const positions=attribute(g,p.attributes.POSITION),indices=p.indices===undefined?positions.map((_,i)=>i):attribute(g,p.indices).flat(),keep=[];let count=0;
  for(let i=0;i<indices.length;i+=3){const face=indices.slice(i,i+3);if(hidden.has(key(face.flatMap(v=>positions[v])))){count++;continue;}keep.push(...face);}
  if(!count)continue;removed+=count;
  // Deindex this primitive while preserving all remaining attribute values and materials.
  for(const [name,id] of Object.entries(p.attributes)){const rows=attribute(g,id);p.attributes[name]=append(g,keep.map(v=>rows[v]),g.accessors[id].type);}delete p.indices;
 }
 if(removed){fs.writeFileSync(path,JSON.stringify(g));console.log(file+': '+removed+' hidden face(s) removed');}
}
