import {takeBudget} from '@/lib/request-controls';
import {RequestError} from '@/lib/request-body';
import {ImageResponse} from 'next/og';
import {ShareCard} from '../../ShareCard';
import {shareAsset,shareDataUrl} from '@/lib/share-assets';
import {shareProfileDetails} from '@/lib/share-profile';
import {accountName,db} from '@/lib/storage';
import {profileJournal,publicProfile} from '@/lib/profile-store';
import {renderShareCharacter,renderSharePet} from '@/lib/share-character';
import {OWNER_LAVA_MASK,RANK_STYLE,hasGildedSupporter} from '@/lib/staff-appearance';
import {DEFAULT_APPEARANCE} from '@/lib/appearance';
// Character renderer is shared with the model catalogue rather than a screenshot service.
export async function GET(request:Request){
 const value=new URL(request.url).searchParams.get('username');
 let name:string|undefined;
 try{if(value!==null)name=accountName(value);}catch{return new Response('Invalid player name',{status:400});}
 const revision=name?(await db().prepare('SELECT version FROM board_revision WHERE id=1').first<{version:number}>())!.version:0;
 const key=new Request(new URL('/api/share?cache=launch-v3&name='+encodeURIComponent(name?.toLowerCase()??'')+'&revision='+revision,request.url));
 let cache:Cache|undefined;
 try{cache=await caches.open('spooned-public-share-v1');const hit=await cache.match(key);if(hit){const response=new Response(hit.body,hit);response.headers.set('Cache-Control',name?'no-store':'public, max-age=3600');return response;}}catch{}
 try{await takeBudget('share-minute',60,60);await takeBudget('share-daily',3000,86400);}catch(e){return new Response(e instanceof RequestError?e.message:'Share images temporarily unavailable',{status:e instanceof RequestError?e.status:503,headers:{'Cache-Control':'no-store','Retry-After':String(e instanceof RequestError?e.retryAfter??60:60)}});}
 const origin=import.meta.env.DEV?new URL(request.url).origin:'https://spoonedosrs.com';
 const [rocky,font,sans]=await Promise.all([shareDataUrl('/brand/rocky-icon.png',origin),shareAsset('/fonts/runescape-bold.ttf',origin),shareAsset('/fonts/share-sans.ttf',origin)]);
 let profile:ReturnType<typeof shareProfileDetails>|undefined,character:string|undefined,pet:string|undefined,badge:string|undefined;
 const statIcons:Record<string,string>=Object.fromEntries(await Promise.all(Object.entries({'Pets collected':'/brand/rocky-icon.png','Collection log':'/icons/navigation/collection-log-icon.png','Total level':'/icons/navigation/stats-icon.png'}).map(async([label,path])=>[label,await shareDataUrl(path,origin)])));
 if(name){
  const exists=await db().prepare('SELECT 1 FROM journals WHERE id=? UNION SELECT 1 FROM claimed_names WHERE rsn=? LIMIT 1').bind(name.toLowerCase(),name.toLowerCase()).first();
  if(exists){
   const [j,flair]=await Promise.all([profileJournal(new Request('https://spoonedosrs.com/'),name),publicProfile(name,null)]);
   profile=shareProfileDetails(j,flair);
   const loadAsset=async(path:string)=>JSON.parse(new TextDecoder().decode(await shareAsset(path,origin)));
   const role=flair.staff?.displayRole??flair.staff?.role;
   const badgePath=flair.donation?.badge==='gilded'&&hasGildedSupporter(flair.donation)?'/icons/ranks/gilded-scimitar.png':role?RANK_STYLE[role].src:null;
   if(badgePath)badge=await shareDataUrl(badgePath,origin).catch(()=>undefined);
   if(role==='owner'&&badge&&badgePath!=='/icons/ranks/gilded-scimitar.png'){
    const [lava,cracks]=await Promise.all([shareDataUrl('/ui/infernal-lava.png',origin),shareDataUrl(OWNER_LAVA_MASK,origin)]);
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><defs><mask id="cracks" mask-type="alpha"><image href="${cracks}" width="100" height="100"/></mask><pattern id="lava" width="80" height="80" patternUnits="userSpaceOnUse"><image href="${lava}" width="80" height="80"/></pattern></defs><image href="${badge}" width="100" height="100"/><rect width="100" height="100" fill="url(#lava)" mask="url(#cracks)"/></svg>`;
    badge='data:image/svg+xml;base64,'+btoa(svg);
   }
   if(profile.pet&&/^\d+$/.test(profile.pet.id))pet=await renderSharePet(profile.pet.id,loadAsset).then(p=>p.dataUrl).catch(()=>shareDataUrl('/pets/'+profile!.pet!.id+'.png',origin).catch(()=>undefined));
   // Filled by the static renderer; public appearance is the same as on the profile.
   character=(await renderShareCharacter({appearance:flair.appearance??DEFAULT_APPEARANCE,equipped:flair.equipped,loadAsset:async path=>JSON.parse(new TextDecoder().decode(await shareAsset(path,origin)))})).dataUrl;
  }else{profile={name,title:null,achievementTitle:null,status:'Collection not yet synced',stats:[],pet:null};}
 }
 const image=new ImageResponse(<ShareCard profile={profile} rocky={rocky} character={character} pet={pet} badge={badge} statIcons={statIcons}/>,{width:1200,height:630,fonts:[{name:'Pixel',data:font,weight:400},{name:'Sans',data:sans,weight:400}],headers:{'Cache-Control':name?'no-store':'public, max-age=3600','X-Content-Type-Options':'nosniff'}});
 const bytes=await image.arrayBuffer();
 if(bytes.byteLength===0)throw Error('Empty share image');
 const response=new Response(bytes,{headers:image.headers});
 if(cache){const stored=response.clone();stored.headers.set('Cache-Control','public, max-age=300');try{await cache.put(key,stored);}catch{}}
 return response;
}
