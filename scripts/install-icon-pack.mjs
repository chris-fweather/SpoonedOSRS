import sharp from 'sharp';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';

/** Installs artwork/ui-skills (the 256px icon pack) as public/icons/<category>/<name>.png: trimmed to the artwork,
 * then scaled smoothly so the longest side is SIZE. Also derives the adamant helper scimitar and the owner blade's lava
 * mask. Run with `node scripts/install-icon-pack.mjs` after the pack changes. */
const PACK='artwork/ui-skills',OUT='public/icons',SIZE=128,TIER_SIZE=160;
// Retired from the site (crossed swords) or replaced by a derived icon (the helper rank is adamant, not white).
const SKIP=new Set(['ranks/crossed-swords.png','ranks/white-scimitar.png']);

const raw=async input=>sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const encode=(data,width,height)=>sharp(data,{raw:{width,height,channels:4}}).png({compressionLevel:9,palette:false}).toBuffer();

/** Crop to visible pixels, ignoring the faint fringe the atlas export leaves at the cell edges. */
function bounds({data,info}){
 let left=info.width,top=info.height,right=-1,bottom=-1;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>12){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
 if(right<left)throw Error('Empty icon');
 return {left,top,width:right-left+1,height:bottom-top+1};
}

async function fit(input,size){
 const box=bounds(await raw(input)),scale=size/Math.max(box.width,box.height);
 return sharp(input).extract(box).resize(Math.round(box.width*scale),Math.round(box.height*scale),{kernel:'lanczos3'}).png({compressionLevel:9}).toBuffer();
}

/** Recolours the white scimitar's blade to adamant green by brightness; the gold hilt keeps its colour. */
async function adamant(input){
 const {data,info}=await raw(input),ramp=[[14,28,18],[34,62,38],[60,98,62],[118,158,108]];
 for(let i=0;i<data.length;i+=4){
  const [r,g,b]=data.subarray(i,i+3),max=Math.max(r,g,b),min=Math.min(r,g,b);
  if(!data[i+3]||max-min>34||max<70)continue;
  const t=Math.min(1,Math.max(0,(r*.3+g*.59+b*.11-60)/190))*(ramp.length-1),k=Math.min(ramp.length-2,Math.floor(t)),f=t-k;
  for(let c=0;c<3;c++)data[i+c]=Math.round(ramp[k][c]+(ramp[k+1][c]-ramp[k][c])*f);
 }
 return encode(data,info.width,info.height);
}

/** White where the owner blade shows molten lava (red through yellow), so the site can flow a lava texture through it. */
async function lavaMask(input){
 const {data,info}=await raw(input);
 for(let i=0;i<data.length;i+=4){
  const [r,g,b]=data.subarray(i,i+3),heat=Math.min(1,Math.max(0,(r-120)/50))*Math.min(1,Math.max(0,(r-b-60)/60));
  data[i]=data[i+1]=data[i+2]=255;data[i+3]=Math.round(data[i+3]*heat);
 }
 return encode(data,info.width,info.height);
}

const manifest=JSON.parse(await readFile(PACK+'/manifest.json','utf8'));
const written=[];
const save=async(file,png)=>{await mkdir(dirname(`${OUT}/${file}`),{recursive:true});await writeFile(`${OUT}/${file}`,png);written.push(file);};
for(const icon of manifest.icons){
 if(SKIP.has(icon.file))continue;
 const source=await readFile(`${PACK}/${icon.file}`),size=icon.category==='tiers'?TIER_SIZE:SIZE;
 await save(icon.file,await fit(source,size));
 if(icon.file==='ranks/rank-owner.png')await save('ranks/rank-owner-lava.png',await lavaMask(await fit(source,size)));
}
await save('ranks/adamant-scimitar.png',await adamant(await fit(await readFile(PACK+'/ranks/white-scimitar.png'),SIZE)));
console.log(JSON.stringify({icons:written.length,output:OUT}));
