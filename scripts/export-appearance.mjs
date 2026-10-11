/** Build female cache models and common hairstyles. Run with a populated RuneLite cache. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import {createCanvas} from '../.appearance-tools/node_modules/@napi-rs/canvas/index.js';
import {RSCache,IndexType,ConfigType} from '../.appearance-tools/reader/src/index.js';
const root='public/models/look/', manifest=JSON.parse(fs.readFileSync('lib/wearables.json'));
const cache=new RSCache(process.env.OSRS_CACHE??(()=>{throw Error('Set OSRS_CACHE to your populated cache directory');})());await cache.onload;
const kits=await cache.getAllDefs(IndexType.CONFIGS,ConfigType.IDENTKIT);
const out={femaleItems:{},femaleKits:[],hair:{male:{},female:{}},missing:[]};
const modelCache=new Map();
async function model(id){if(!modelCache.has(id))modelCache.set(id,await cache.getDef(IndexType.MODELS,id));return modelCache.get(id);}
const textureCache=new Map();
async function texture(id){if(textureCache.has(id))return;const t=await cache.getDef(IndexType.TEXTURES,0,id);const sprite=(await cache.getDef(IndexType.SPRITES,t.fileIds[0])).sprites[0];const canvas=createCanvas(sprite.width,sprite.height),ctx=canvas.getContext('2d'),data=ctx.createImageData(sprite.width,sprite.height);sprite.pixels.forEach((p,i)=>{data.data.set([(p>>>16)&255,(p>>>8)&255,p&255,p>>>24],i*4);});ctx.putImageData(data,0,0);const speed=t.animationSpeed*50/sprite.width,flow=[t.animationDirection===2?speed:t.animationDirection===4?-speed:0,t.animationDirection===1?speed:t.animationDirection===3?-speed:0];textureCache.set(id,{uri:canvas.toDataURL(),flow});}
function rgb(hsl){let h=((hsl>>10)&63)/64+.5/64,s=((hsl>>7)&7)/8+.5/8,l=(hsl&127)/128;const c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h*6)%2-1)),m=l-c/2;const a=[[c,x,0],[x,c,0],[0,c,x],[0,x,c],[x,0,c],[c,0,x]][Math.min(5,Math.floor(h*6))];return a.map(v=>{const s=Math.pow(Math.max(0,v+m),.6);return s<=.04045?s/12.92:Math.pow((s+.055)/1.055,2.4);});}
function exportModel(models,def={},source=null,textureIds=[]){
 const g={asset:{version:'2.0',generator:'SpoonedOSRS cache appearance exporter'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],meshes:[{primitives:[]}],buffers:[],bufferViews:[],accessors:[],materials:[{doubleSided:true,pbrMetallicRoughness:{metallicFactor:0,roughnessFactor:1}}],textures:source?.textures??[],images:source?.images??[],samplers:source?.samplers??[]};
 const texturedMaterials=(source?.materials??[]).filter((m,i)=>i>0&&m.pbrMetallicRoughness?.baseColorTexture);
 const texMap=new Map(textureIds.map((id,i)=>[id,texturedMaterials[i]]));
 for(const m of models)for(let id of new Set(m.faceTextures??[])){if(id<0)continue;const r=(def.retextureToFind??[]).indexOf(id);if(r>=0)id=def.retextureToReplace[r];if(texMap.get(id))continue;const tex=textureCache.get(id);if(!tex)continue;const image=g.images.length,sampler=g.samplers.length,index=g.textures.length;g.images=[...g.images,{uri:tex.uri}];g.samplers=[...g.samplers,{magFilter:9728,minFilter:9728,wrapS:10497,wrapT:10497}];g.textures=[...g.textures,{source:image,sampler}];texMap.set(id,{name:`flow:${tex.flow.join(',')}`,doubleSided:true,alphaMode:'BLEND',pbrMetallicRoughness:{baseColorTexture:{index},metallicFactor:0,roughnessFactor:1}});}

 const groups=new Map();
 function acc(values,size){const a=Float32Array.from(values), n=g.buffers.length;g.buffers.push({uri:'data:application/octet-stream;base64,'+Buffer.from(a.buffer).toString('base64'),byteLength:a.byteLength});g.bufferViews.push({buffer:n,byteLength:a.byteLength});const entry={bufferView:n,componentType:5126,count:values.length/size,type:'VEC'+size};if(size===3){entry.min=[0,1,2].map(k=>Math.min(...values.filter((_,i)=>i%3===k)));entry.max=[0,1,2].map(k=>Math.max(...values.filter((_,i)=>i%3===k)));}g.accessors.push(entry);return g.accessors.length-1;}
 for(const m of models){for(let f=0;f<m.faceCount;f++){
  if((m.faceAlphas?.[f]??0)===255||m.faceRenderTypes?.[f]===2)continue;
  let texture=m.faceTextures?.[f]??-1;const t=(def.retextureToFind??[]).indexOf(texture);if(t>=0)texture=def.retextureToReplace[t];
  let color=m.faceColors[f];const c=(def.recolorToFind??[]).indexOf(color);if(c>=0)color=def.recolorToReplace[c];
  const ids=[m.faceVertexIndices1[f],m.faceVertexIndices2[f],m.faceVertexIndices3[f]];
  const positions=ids.flatMap(i=>[m.vertexPositionsX[i],-m.vertexPositionsY[i]-(def.femaleOffset??0),-m.vertexPositionsZ[i]]);
  const key=texture+':'+(m.faceAlphas?.[f]??0);if(!groups.has(key))groups.set(key,{texture,alpha:1-(m.faceAlphas?.[f]??0)/255,pos:[],colors:[],uv:[]});const group=groups.get(key);group.pos.push(...positions);
  for(let i=0;i<3;i++){group.colors.push(...(texture<0?rgb(color):[1,1,1]));if(texture>=0){const u=m.faceTextureUCoordinates?.[f]?.[i],v=m.faceTextureVCoordinates?.[f]?.[i];if(!Number.isFinite(u)||!Number.isFinite(v))throw Error('Invalid texture UV');group.uv.push(u,v);}}
 }}
 for(const group of groups.values()){let mat={...g.materials[0],pbrMetallicRoughness:{...g.materials[0].pbrMetallicRoughness,baseColorFactor:[1,1,1,group.alpha]}};if(group.texture>=0){const old=texMap.get(group.texture);if(!old)throw Error('Missing texture material '+group.texture);mat=structuredClone(old);}if(group.alpha<1)mat.alphaMode='BLEND';g.materials.push(mat);const p={attributes:{POSITION:acc(group.pos,3),COLOR_0:acc(group.colors,3)},material:g.materials.length-1};if(group.texture>=0)p.attributes.TEXCOORD_0=acc(group.uv,2);g.meshes[0].primitives.push(p);}
 return JSON.stringify(g);
}
function write(file,data){fs.mkdirSync(root+file.slice(0,file.lastIndexOf('/')),{recursive:true});fs.writeFileSync(root+file,data);return file;}
const dedup=new Map();let exported=0,shared=0;
for(const [id,entry] of Object.entries(manifest.items)){
 try{const def=await cache.getItem(+id);const female=[def.femaleModel0,def.femaleModel1,def.femaleModel2].filter(n=>n>=0),male=[def.maleModel0,def.maleModel1,def.maleModel2].filter(n=>n>=0);
 if(!female.length)throw Error('No female wearable model');
 if(JSON.stringify(female)===JSON.stringify(male)&&(def.femaleOffset??0)===(def.maleOffset??0)){out.femaleItems[id]=entry.file;shared++;continue;}
 const models=await Promise.all(female.map(model)), maleModels=await Promise.all(male.map(model));
 const textureIds=[...new Set(maleModels.flatMap(m=>m.faceTextures??[]).filter(n=>n>=0))].map(n=>{const t=def.retextureToFind.indexOf(n);return t>=0?def.retextureToReplace[t]:n;});
 for(const m of models)for(let t of new Set(m.faceTextures??[])){if(t<0)continue;const r=def.retextureToFind.indexOf(t);if(r>=0)t=def.retextureToReplace[r];await texture(t);}
 const source=JSON.parse(fs.readFileSync(root+entry.file));const data=exportModel(models,def,source,textureIds),hash=crypto.createHash('sha256').update(data).digest('hex');
 let file=dedup.get(hash);if(!file){file=write('female/items/'+id+'.gltf',data);dedup.set(hash,file);exported++;}out.femaleItems[id]=file;
 }catch(e){out.missing.push({id,reason:e.message});}
}
const colors={brown:6798,blonde:7744,black:16,red:4797,grey:10283};
for(const [body,ids] of Object.entries({male:[5],female:[46,296,56,61,67,70,79]}))for(const id of ids){const kit=kits.find(k=>k.id===id), models=await Promise.all(kit.models.map(model));const part=kit.bodyPartId%7;
 if(part===0){for(const [name,color]of Object.entries(colors))out.hair[body][name]=write('appearance/'+body+'-'+name+'.gltf',exportModel(models,{recolorToFind:[6798],recolorToReplace:[color]}));}
 if(body==='female')out.femaleKits.push({id,part,hide:{0:-1,1:11,2:4,3:6,4:9,5:7,6:10}[part],file:write('female/kits/'+id+'.gltf',exportModel(models))});
}
fs.writeFileSync('lib/appearance-models.json',JSON.stringify(out));console.log('RESULT',JSON.stringify({exported,shared,mapped:Object.keys(out.femaleItems).length,missing:out.missing.length}));cache.close();
