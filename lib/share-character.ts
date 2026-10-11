import {appearanceModels,DEFAULT_APPEARANCE,equipmentModel,headModel,parseAppearance,type Appearance} from './appearance';
import {EQUIP_SLOTS,emptyEquipped,equipItem,wearables,type Equipped} from './flair';
import {skinColor} from './skin-palette';

type Vec=[number,number,number];
type Face={points:Vec[];color:number[];normal:Vec;uv:number[][]|null;texture:string|null;opacity:number};
type Gltf={buffers:{uri:string;byteLength:number}[];bufferViews:{buffer:number;byteLength:number;byteOffset?:number;byteStride?:number}[];accessors:{bufferView:number;componentType:number;count:number;type:string;byteOffset?:number;normalized?:boolean}[];meshes:{primitives:{attributes:Record<string,number>;indices?:number;material?:number;mode?:number}[]}[];nodes?:{mesh?:number;matrix?:number[];translation?:number[];scale?:number[];rotation?:number[]}[];materials?:{pbrMetallicRoughness?:{baseColorFactor?:number[];baseColorTexture?:{index:number}};alphaMode?:string}[];textures?:{source:number}[];images?:{uri?:string}[]};
export type ShareCharacterOptions={appearance?:Appearance;equipped?:Equipped;loadAsset:(path:string)=>Promise<unknown|null>;width?:number;height?:number};
export type ShareCharacterResult={svg:string;dataUrl:string;missing:string[]};
const MAX_FACES=16000,MAX_BUFFER_BYTES=8_000_000,MAX_IMAGE_PIXELS=512*512;
const byteData=(uri:string,prefix:string)=>{if(!uri.startsWith(prefix)||uri.length>MAX_BUFFER_BYTES*1.4)throw Error('Unsupported embedded asset.');const raw=atob(uri.slice(prefix.length)),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return bytes;};
const normalize=(n:Vec):Vec=>{const length=Math.hypot(...n);return length?[n[0]/length,n[1]/length,n[2]/length]:[0,0,1];};
const cross=(a:Vec,b:Vec):Vec=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const minus=(a:Vec,b:Vec):Vec=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const linear=(c:number)=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4;
const hex=(rgb:number[])=>'#'+rgb.map(c=>Math.round(Math.max(0,Math.min(1,c<=.0031308?12.92*c:1.055*c**(1/2.4)-.055))*255).toString(16).padStart(2,'0')).join('');
const number=(n:number)=>Number(n.toFixed(3));

/** Decode only bounded, non-interlaced 8-bit PNGs emitted by this project's asset pipeline. */
async function png(uri:string):Promise<{width:number;height:number;rgba:Uint8Array}|null>{
 try{const bytes=byteData(uri,'data:image/png;base64,'),view=new DataView(bytes.buffer);if(view.getUint32(0)!==0x89504e47||view.getUint32(4)!==0x0d0a1a0a)return null;
 let width=0,height=0,channels=0;const chunks:Uint8Array[]=[];let total=0;
 for(let offset=8;offset+12<=bytes.length;){const size=view.getUint32(offset);if(offset+size+12>bytes.length)throw Error('Invalid PNG chunk.');const kind=String.fromCharCode(...bytes.subarray(offset+4,offset+8));if(kind==='IHDR'){width=view.getUint32(offset+8);height=view.getUint32(offset+12);const depth=bytes[offset+16],color=bytes[offset+17];if(depth!==8||bytes[offset+20]!==0)return null;channels=color===6?4:color===2?3:color===0?1:0;if(!channels||width*height>MAX_IMAGE_PIXELS)return null;}if(kind==='IDAT'){chunks.push(bytes.slice(offset+8,offset+8+size));total+=size;}offset+=size+12;if(kind==='IEND')break;}
 if(!width||!height||!channels)return null;const packed=new Uint8Array(total);let cursor=0;for(const chunk of chunks){packed.set(chunk,cursor);cursor+=chunk.length;}
 const stream=new Blob([packed]).stream().pipeThrough(new DecompressionStream('deflate')),reader=stream.getReader(),limit=(width*channels+1)*height,decoded=new Uint8Array(limit);let length=0;while(true){const {value,done}=await reader.read();if(done)break;if(length+value.length>limit){await reader.cancel();throw Error('Oversized PNG.');}decoded.set(value,length);length+=value.length;}if(length!==limit)return null;
 const stride=width*channels,pixels=new Uint8Array(stride*height),paeth=(a:number,b:number,c:number)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
 for(let y=0;y<height;y++){const filter=decoded[y*(stride+1)];if(filter>4)return null;for(let x=0;x<stride;x++){const index=y*stride+x,a=x>=channels?pixels[index-channels]:0,b=y?pixels[index-stride]:0,c=y&&x>=channels?pixels[index-stride-channels]:0;pixels[index]=(decoded[y*(stride+1)+1+x]+(filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):filter===4?paeth(a,b,c):0))&255;}}
 const rgba=new Uint8Array(width*height*4);for(let i=0;i<width*height;i++){rgba[i*4]=pixels[i*channels];rgba[i*4+1]=pixels[i*channels+(channels===1?0:1)];rgba[i*4+2]=pixels[i*channels+(channels===1?0:2)];rgba[i*4+3]=channels===4?pixels[i*4+3]:255;}return {width,height,rgba};
 }catch{return null;}
}

async function modelFaces(raw:unknown,appearance:Appearance):Promise<Face[]>{
 if(!raw||typeof raw!=='object')throw Error('Missing model.');const g=raw as Gltf;
 if(!Array.isArray(g.buffers)||!Array.isArray(g.bufferViews)||!Array.isArray(g.accessors)||!Array.isArray(g.meshes)||g.buffers.length>100||g.meshes.length>100)throw Error('Unsupported model.');
 if(g.nodes?.some(n=>n.matrix||n.translation||n.scale||n.rotation))throw Error('Transformed nodes require an explicit exporter.');
 const buffers=g.buffers.map(b=>{const bytes=byteData(b.uri,b.uri.startsWith('data:application/gltf-buffer;base64,')?'data:application/gltf-buffer;base64,':'data:application/octet-stream;base64,');if(bytes.length>MAX_BUFFER_BYTES)throw Error('Oversized model buffer.');return new DataView(bytes.buffer);});
 const cache=new Map<number,number[][]>();
 function attribute(id:number){if(cache.has(id))return cache.get(id)!;const a=g.accessors[id],v=a&&g.bufferViews[a.bufferView];if(!a||!v||a.count<0||a.count>MAX_FACES*3)throw Error('Invalid model accessor.');const count=a.type==='SCALAR'?1:a.type==='VEC2'?2:a.type==='VEC3'?3:a.type==='VEC4'?4:0,bytes=a.componentType===5126||a.componentType===5125?4:a.componentType===5123?2:a.componentType===5121?1:0,buf=buffers[v.buffer];if(!count||!bytes||!buf)throw Error('Unsupported accessor format.');const offset=(v.byteOffset??0)+(a.byteOffset??0),stride=v.byteStride??count*bytes;if(offset<0||stride<count*bytes||offset+Math.max(0,a.count-1)*stride+count*bytes>buf.byteLength)throw Error('Accessor exceeds buffer.');const result:number[][]=[];for(let i=0;i<a.count;i++){const row=[];for(let j=0;j<count;j++){const at=offset+i*stride+j*bytes;let n=a.componentType===5126?buf.getFloat32(at,true):a.componentType===5125?buf.getUint32(at,true):a.componentType===5123?buf.getUint16(at,true):buf.getUint8(at);if(a.normalized&&a.componentType!==5126)n/=a.componentType===5121?255:a.componentType===5123?65535:4294967295;if(!Number.isFinite(n))throw Error('Non-finite model coordinate.');row.push(n);}result.push(row);}cache.set(id,result);return result;}
 const faces:Face[]=[],images=new Map<string,Awaited<ReturnType<typeof png>>>();
 for(const mesh of g.meshes)for(const p of mesh.primitives){if(p.mode!==undefined&&p.mode!==4)continue;const positions=attribute(p.attributes.POSITION),colors=p.attributes.COLOR_0===undefined?null:attribute(p.attributes.COLOR_0),normals=p.attributes.NORMAL===undefined?null:attribute(p.attributes.NORMAL),uv=p.attributes.TEXCOORD_0===undefined?null:attribute(p.attributes.TEXCOORD_0),indices=p.indices===undefined?positions.map((_,i)=>i):attribute(p.indices).map(row=>row[0]),mat=g.materials?.[p.material??0],factor=mat?.pbrMetallicRoughness?.baseColorFactor??[1,1,1,1];let image:string|null=null;const tex=mat?.pbrMetallicRoughness?.baseColorTexture;if(tex){const imageIndex=g.textures?.[tex.index]?.source,candidate=imageIndex===undefined?undefined:g.images?.[imageIndex]?.uri;if(typeof candidate==='string'&&/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(candidate)&&candidate.length<1_500_000){image=candidate;if(!images.has(candidate))images.set(candidate,await png(candidate));}}
 for(let i=0;i+2<indices.length;i+=3){if(faces.length>=MAX_FACES)throw Error('Model exceeds face budget.');const ids=indices.slice(i,i+3);if(ids.some(id=>!Number.isSafeInteger(id)||id<0||id>=positions.length))throw Error('Invalid face indices.');const points=ids.map(id=>positions[id] as Vec);const normal=normals?normalize([0,1,2].map(axis=>ids.reduce((s,id)=>s+(normals[id]?.[axis]??0),0)/3) as Vec):normalize(cross(minus(points[1],points[0]),minus(points[2],points[0])));let color=[0,0,0],opacity=factor[3]??1;
 for(const id of ids){const original=colors?.[id]?.slice(0,3)??[1,1,1],recolored=skinColor(original,appearance.skin??'default')??original;for(let k=0;k<3;k++)color[k]+=recolored[k]*(factor[k]??1)/3;}
 let texture=image,coords=uv?ids.map(id=>uv[id]):null;
 if(image&&coords){const area=(coords[1][0]-coords[0][0])*(coords[2][1]-coords[0][1])-(coords[2][0]-coords[0][0])*(coords[1][1]-coords[0][1]);if(Math.abs(area)<1e-8){const decoded=images.get(image);if(decoded){const u=coords.reduce((s,v)=>s+v[0],0)/3,v=coords.reduce((s,t)=>s+t[1],0)/3,x=Math.min(decoded.width-1,Math.floor((u-Math.floor(u))*decoded.width)),y=Math.min(decoded.height-1,Math.floor((v-Math.floor(v))*decoded.height)),at=(y*decoded.width+x)*4;for(let k=0;k<3;k++)color[k]*=linear(decoded.rgba[at+k]/255);opacity*=decoded.rgba[at+3]/255;}texture=null;coords=null;}}
 if(opacity>0)faces.push({points,color,normal,uv:coords,texture,opacity});
 }}return faces;
}

/** Server-safe renderer: loader is supplied by the caller and sees manifest-derived paths only. */
export async function renderShareCharacter({appearance:input=DEFAULT_APPEARANCE,equipped:inputGear=emptyEquipped(),loadAsset,width=300,height=470}:ShareCharacterOptions):Promise<ShareCharacterResult>{
 const appearance=parseAppearance(input);if(!Number.isFinite(width)||!Number.isFinite(height)||width<40||height<40||width>1200||height>1200)throw Error('Unsupported portrait dimensions.');
 let equipped=emptyEquipped();for(const slot of EQUIP_SLOTS){const id=inputGear[slot];if(id&&wearables.items[id]?.slot===slot)equipped=equipItem(equipped,slot,id);}
 const items=EQUIP_SLOTS.flatMap(slot=>{const id=equipped[slot];if(!id)return [];const entry=wearables.items[id],file=equipmentModel(id,entry.file,appearance);return file?[{file,entry}]:[];}),covered=new Set(items.flatMap(x=>x.entry.wear).filter(n=>n>=0)),kits=appearance.body==='female'?appearanceModels.femaleKits:wearables.kits,files=[...kits.filter(k=>k.hide<0||!covered.has(k.hide)).map(k=>k.part===0?headModel(appearance,covered.has(8)):k.file),...items.map(i=>i.file)];
 const missing:string[]=[],results=await Promise.all([...new Set(files)].map(async file=>{if(!/^[A-Za-z0-9_./-]+\.gltf$/.test(file)||file.includes('..'))return [];try{return await modelFaces(await loadAsset('/models/look/'+file),appearance);}catch{missing.push(file);return [];}})),faces=results.flat();if(!faces.length)throw Error('Character assets are unavailable.');if(faces.length>MAX_FACES)throw Error('Character exceeds face budget.');
 return projectFaces(faces,width,height,missing);
}
/** Render a follower from the same shipped model used in the interactive profile. */
export async function renderSharePet(id:string,loadAsset:ShareCharacterOptions['loadAsset']):Promise<ShareCharacterResult>{
 const file=wearables.pets[id]?.file;
 if(!file||!/^[A-Za-z0-9_./-]+\.gltf$/.test(file)||file.includes('..'))throw Error('Pet model unavailable.');
 const faces=await modelFaces(await loadAsset('/models/look/'+file),DEFAULT_APPEARANCE);
 if(!faces.length)throw Error('Pet model unavailable.');
 return projectFaces(faces,150,170,[]);
}
function projectFaces(faces:Face[],width:number,height:number,missing:string[]):ShareCharacterResult{
 // Small turn shows equipment depth without changing game-model proportions.
 const yaw=-.12,cos=Math.cos(yaw),sin=Math.sin(yaw),rotate=([x,y,z]:Vec):Vec=>[x*cos+z*sin,y,-x*sin+z*cos];
 const rotated=faces.map(f=>({...f,points:f.points.map(rotate),normal:rotate(f.normal)})),all=rotated.flatMap(f=>f.points),minX=Math.min(...all.map(p=>p[0])),maxX=Math.max(...all.map(p=>p[0])),minY=Math.min(...all.map(p=>p[1])),maxY=Math.max(...all.map(p=>p[1])),scale=Math.min((width-18)/Math.max(1,maxX-minX),(height-18)/Math.max(1,maxY-minY)),cx=(minX+maxX)/2,cy=(minY+maxY)/2,project=([x,y]:Vec)=>[number(width/2+(x-cx)*scale),number(height/2-(y-cy)*scale)];
 rotated.sort((a,b)=>a.points.reduce((s,p)=>s+p[2],0)-b.points.reduce((s,p)=>s+p[2],0));
 const images=new Map<string,string>(),defs:string[]=[],paths:string[]=[];
 for(const [index,face]of rotated.entries()){const points=face.points.map(project),shape=points.map(p=>p.join(',')).join(' '),light=.72+.32*Math.max(0,(-.25*face.normal[0]+.45*face.normal[1]+face.normal[2])/1.13);let fill=hex(face.color.map(c=>c*light));
 if(face.texture&&face.uv){let id=images.get(face.texture);if(!id){id='image'+images.size;images.set(face.texture,id);defs.push(`<image id="${id}" width="1" height="1" preserveAspectRatio="none" href="${face.texture}"/>`);}const [a,b,c]=face.uv,[p,q,r]=points,du=b[0]-a[0],dv=b[1]-a[1],eu=c[0]-a[0],ev=c[1]-a[1],det=du*ev-eu*dv;if(Math.abs(det)>1e-8){const A=((q[0]-p[0])*ev-(r[0]-p[0])*dv)/det,B=((q[1]-p[1])*ev-(r[1]-p[1])*dv)/det,C=((r[0]-p[0])*du-(q[0]-p[0])*eu)/det,D=((r[1]-p[1])*du-(q[1]-p[1])*eu)/det,E=p[0]-A*a[0]-C*a[1],F=p[1]-B*a[0]-D*a[1],pattern='face'+index;defs.push(`<pattern id="${pattern}" patternUnits="userSpaceOnUse" width="1" height="1" patternTransform="matrix(${[A,B,C,D,E,F].map(number).join(' ')})"><use href="#${id}"/></pattern>`);fill=`url(#${pattern})`;}}
 paths.push(`<polygon points="${shape}" fill="${fill}"${face.opacity<1?` opacity="${number(face.opacity)}"`:''}/>`);
 }
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs>${defs.join('')}</defs>${paths.join('')}</svg>`;return {svg,dataUrl:'data:image/svg+xml;base64,'+btoa(svg),missing};
}
