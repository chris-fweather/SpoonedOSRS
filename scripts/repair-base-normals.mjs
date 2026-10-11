/** Preserve the original OSRS identity-kit geometry; export its smooth/flat cache normals. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import {RSCache,IndexType,ConfigType} from '../.appearance-tools/reader/src/index.js';
const root='public/models/look/';
const cache=new RSCache(process.env.OSRS_CACHE??(()=>{throw Error('Set OSRS_CACHE to a populated read-only RuneLite cache directory.');})());await cache.onload;
const kits=await cache.getAllDefs(IndexType.CONFIGS,ConfigType.IDENTKIT),wear=JSON.parse(fs.readFileSync('lib/wearables.json')),appearance=JSON.parse(fs.readFileSync('lib/appearance-models.json'));
const hairColors={brown:6798,blonde:7744,black:16,red:4797,grey:10283};
function rgb(hsl){let h=((hsl>>10)&63)/64+.5/64,s=((hsl>>7)&7)/8+.5/8,l=(hsl&127)/128;const c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h*6)%2-1)),m=l-c/2;const a=[[c,x,0],[x,c,0],[0,c,x],[0,x,c],[x,0,c],[c,0,x]][Math.min(5,Math.floor(h*6))];return a.map(v=>{const s=Math.pow(Math.max(0,v+m),.6);return s<=.04045?s/12.92:Math.pow((s+.055)/1.055,2.4);});}
const unit=n=>{const a=[n.x,-n.y,-n.z],length=Math.hypot(...a);return length?a.map(v=>v/length):[0,1,0];};
const files=new Map([...wear.kits,...appearance.femaleKits].map(k=>[k.file,{kitId:k.id,hair:null}]));
for(const body of ['male','female'])for(const [hair,file] of Object.entries(appearance.hair[body]))files.set(file,{kitId:body==='male'?5:46,hair});
const report=[],pending=[];
try{for(const [file,{kitId,hair}]of files){
 const kit=kits.find(k=>k.id===kitId);if(!kit)throw Error('Missing cache identity kit '+kitId);
 const positions=[],normals=[],colors=[];
 for(const modelId of kit.models){const m=await cache.getDef(IndexType.MODELS,modelId);m.computeNormals();for(let f=0;f<m.faceCount;f++){
 if((m.faceAlphas?.[f]??0)===255||m.faceRenderTypes?.[f]===2)continue;
 if((m.faceTextures?.[f]??-1)>=0)throw Error('Unexpected textured base kit '+kitId);
 let color=m.faceColors[f];const replacement=kit.recolorToFind.indexOf(color);if(replacement>=0)color=kit.recolorToReplace[replacement];if(hair&&color===6798)color=hairColors[hair];
 for(const i of [m.faceVertexIndices1[f],m.faceVertexIndices2[f],m.faceVertexIndices3[f]]){positions.push(m.vertexPositionsX[i],-m.vertexPositionsY[i],-m.vertexPositionsZ[i]);normals.push(...unit(m.faceRenderTypes?.[f]===1?m.faceNormals[f]:m.vertexNormals[i]));colors.push(...rgb(color));}
 }}
 const hash=crypto.createHash('sha256').update(JSON.stringify(positions)).digest('hex');
 const g={asset:{version:'2.0',generator:'SpoonedOSRS cache identity-kit exporter',extras:{identityKit:kitId,cacheModelIds:kit.models,normalSource:'Cache vertex normals; flat render-type faces retain face normals',geometrySha256:hash}},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],meshes:[{primitives:[{attributes:{POSITION:0,COLOR_0:1,NORMAL:2},material:0}]}],buffers:[],bufferViews:[],accessors:[],materials:[{doubleSided:true,pbrMetallicRoughness:{metallicFactor:0,roughnessFactor:1}}]};
 for(const [n,values]of [positions,colors,normals].entries()){const a=Float32Array.from(values);if(values.some(v=>!Number.isFinite(v)))throw Error('Invalid attribute '+file);g.buffers.push({uri:'data:application/octet-stream;base64,'+Buffer.from(a.buffer).toString('base64'),byteLength:a.byteLength});g.bufferViews.push({buffer:n,byteLength:a.byteLength});const acc={bufferView:n,componentType:5126,count:values.length/3,type:'VEC3'};if(n===0){acc.min=[0,1,2].map(axis=>Math.min(...values.filter((_,i)=>i%3===axis)));acc.max=[0,1,2].map(axis=>Math.max(...values.filter((_,i)=>i%3===axis)));}g.accessors.push(acc);}
 pending.push([file,JSON.stringify(g)]);report.push({file,kit:kitId,models:kit.models,vertices:positions.length/3,geometrySha256:hash});
}for(const[file,data]of pending)fs.writeFileSync(root+file,data);
fs.writeFileSync('lib/base-model-provenance.json',JSON.stringify({source:'Local RuneLite OSRS LIVE cache identity-kit definitions',reader:'osrscachereader 1.1.4',geometry:'Original cache coordinates; Y and Z axes inverted for glTF, no body scaling',files:report},null,2));console.log('Exported '+report.length+' base meshes directly from identity kits with cache normals.');}finally{cache.close();}
