import sharp from 'sharp';
import {readFile,writeFile} from 'node:fs/promises';

const SIZE=128,FRAMES=50,BOX=112,TILE=48;
/** The site's Owner rank as a looping emoji: the icon-pack blade with the lava texture flowing through its cracks, as
 * the .rank-magma CSS does on the site. */
export async function ownerRankGif(){
 const place=async path=>{
  const sprite=await sharp(await readFile(path)).resize(BOX,BOX,{fit:'inside',kernel:'lanczos3'}).png().toBuffer(),{width,height}=await sharp(sprite).metadata();
  return (await sharp({create:{width:SIZE,height:SIZE,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:sprite,left:Math.floor((SIZE-width)/2),top:Math.floor((SIZE-height)/2)}]).raw().toBuffer({resolveWithObject:true})).data;
 };
 const base=await place('public/icons/ranks/rank-owner.png'),mask=await place('public/icons/ranks/rank-owner-lava.png');
 const {data:lava,info}=await sharp(await readFile('public/ui/infernal-lava.png')).resize(TILE,TILE).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const frames=[];
 for(let frame=0;frame<FRAMES;frame++){
  const pixels=Buffer.from(base),shift=Math.round(frame*TILE/FRAMES);
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
   const i=(y*SIZE+x)*4,a=mask[i+3]/255;if(!a)continue;
   // The texture moves diagonally one tile per loop, matching rank-lava-flow.
   const j=(((y-shift)%TILE+TILE)%TILE*info.width+((x-shift)%TILE+TILE)%TILE)*4;
   for(let c=0;c<3;c++)pixels[i+c]=Math.round(pixels[i+c]*(1-a)+lava[j+c]*a);
  }
  frames.push(pixels);
 }
 const gif=await sharp(Buffer.concat(frames),{raw:{width:SIZE,height:SIZE*FRAMES,channels:4,pageHeight:SIZE}}).gif({loop:0,delay:Array(FRAMES).fill(80),colours:128,dither:0,effort:10}).toBuffer();
 if(gif.length>=256*1024)throw Error('Owner GIF exceeds Discord emoji size limit');
 await writeFile('artwork/discord/owner-rank-preview.png',await sharp(frames[12],{raw:{width:SIZE,height:SIZE,channels:4}}).png().toBuffer());
 return gif;
}
