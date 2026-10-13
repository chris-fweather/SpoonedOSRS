import type {shareProfileDetails} from '@/lib/share-profile';
import {titleEffect} from '@/lib/presentation';
type Profile=ReturnType<typeof shareProfileDetails>;
export type ShareArt={scene:string;mascot:string;icons:Record<string,string>};
/** The profile's chosen scene: artwork for the castle and riverside, the scene's sky and ground for the 3D-only ones. */
export type ShareBackdrop={image?:string;sky?:string;ground?:string};
const pixel={fontFamily:'Pixel'};
/** Achievement titles in the colours the site gives each rarity (app/title-rarities.css); legendary titles use the
 * gradient's first colours as a glow, since a link preview is a still image. */
const TITLE_INK:Record<string,{color:string;glow?:string}>={'title-common':{color:'#bcb5a5'},'title-uncommon':{color:'#81cc91'},'title-rare':{color:'#86c7f3',glow:'#428fbd'},
 'title-epic':{color:'#ff7373',glow:'#d42828'},'title-maxed':{color:'#ff7373',glow:'#d42828'},'title-supporter':{color:'#dfbe79',glow:'#aa8435'},'title-one-only':{color:'#ffd98a',glow:'#f5a1ea'},
 'title-pet-master':{color:'#c9eeff',glow:'#8ed9ff'},'title-log-master':{color:'#c9eeff',glow:'#8ed9ff'},'title-hiscore-champion':{color:'#ffd98a',glow:'#ca642a'}};
/** Name colours by staff rank, as on the site (--rank-*). */
export const RANK_INK:Record<string,string>={helper:'#74d16a',moderator:'#6eaaf2',admin:'#f0675c',owner:'#f0675c'};
const gold='#ffd36b',orange='#ff981f',muted='#cfc4a8',line='#c9a24a66';

/** The site header, as it appears on every page: Rocky, the name in the game font and the tagline. */
function Brand({mascot}:{mascot:string}){
 return <div style={{display:'flex',alignItems:'center',gap:16}}>
  <img alt="" src={mascot} width={84} height={53} style={{objectFit:'contain'}}/>
  <div style={{display:'flex',flexDirection:'column',gap:2}}>
   <span style={{...pixel,fontSize:36,color:orange,textShadow:'0 2px 0 #000'}}>Spooned OSRS</span>
   <span style={{fontSize:14,letterSpacing:3,color:muted}}>OSRS PET &amp; DROP TRACKER</span>
  </div>
 </div>;
}

/** Link previews (Discord, social sites): the castle scene from the site banner behind the site header. The home card
 * invites people in; a profile card shows the player's name, character, pet and three headline stats. */
export function ShareCard({profile,art,character,pet,badge,mode,prefix,nameColor,backdrop,ranks={}}:{profile?:Profile;art:ShareArt;character?:string;pet?:string;badge?:string;mode?:string;prefix?:string|null;nameColor?:string;backdrop?:ShareBackdrop;ranks?:Record<string,number>}){

 const nameSize=profile&&profile.name.length+(profile.title?.length??0)+(prefix?4:0)>24?46:56;
 // The achievement title starts under the username itself, after the scimitar, account badge and Sir, as on the profile.
 const indent=(badge?44+14:0)+(mode?30+14:0)+(prefix?Math.round(nameSize*1.1)+16:0);
 const ink=profile?.achievementTitle?TITLE_INK[titleEffect(profile.achievementTitle)]??TITLE_INK['title-common']:null;
 return <div style={{display:'flex',width:1200,height:630,position:'relative',background:'#0d0c0a',color:'#efe8d6',fontFamily:'Sans'}}>
  <img alt="" src={art.scene} width={1200} height={630} style={{position:'absolute',left:0,top:0,objectFit:'cover'}}/>
  {/* Shade the left for the text; the profile card dims the whole scene so the character stands out. */}
  <div style={{display:'flex',position:'absolute',left:0,top:0,width:1200,height:630,backgroundImage:profile
   ?'linear-gradient(90deg, rgba(10,9,7,0.92) 0%, rgba(10,9,7,0.78) 55%, rgba(10,9,7,0.35) 100%)'
   :'linear-gradient(90deg, rgba(10,9,7,0.94) 0%, rgba(10,9,7,0.82) 34%, rgba(10,9,7,0.25) 62%, rgba(10,9,7,0) 80%)'}}/>
  <div style={{display:'flex',position:'absolute',left:0,top:470,width:1200,height:160,backgroundImage:'linear-gradient(180deg, rgba(10,9,7,0) 0%, rgba(10,9,7,0.7) 100%)'}}/>
  <div style={{display:'flex',position:'absolute',left:16,top:16,width:1168,height:598,border:`2px solid ${line}`,borderRadius:18}}/>

  <div style={{display:'flex',flexDirection:'column',justifyContent:'space-between',position:'absolute',left:56,top:48,width:profile?664:680,height:534}}>
   <Brand mascot={art.mascot}/>
   {profile?<div style={{display:'flex',flexDirection:'column',gap:12}}>
    <div style={{display:'flex',alignItems:'center',gap:14,height:nameSize+8}}>
     {badge&&<img alt="" src={badge} width={44} height={nameSize} style={{objectFit:'contain'}}/>}
     {mode&&<img alt="" src={mode} width={30} height={38} style={{objectFit:'contain'}}/>}
     {prefix&&<span style={{display:'flex',...pixel,fontSize:nameSize,lineHeight:1,color:'#ffcf3f',textShadow:'0 3px 0 #000'}}>{prefix}</span>}
     <span style={{display:'flex',...pixel,fontSize:nameSize,lineHeight:1,color:nameColor??'#f6f1e4',textShadow:'0 3px 0 #000'}}>{profile.name}</span>
     {profile.title&&<span style={{display:'flex',...pixel,fontSize:30,lineHeight:1,color:'#ffcf3f',textShadow:'0 2px 0 #000',paddingTop:Math.round(nameSize*0.3)}}>{profile.title}</span>}
    </div>
    <span style={{display:'flex',marginLeft:indent,fontSize:26,color:ink?.color??muted,textShadow:ink?.glow?`0 0 10px ${ink.glow}`:'none'}}>{profile.achievementTitle??profile.status}</span>
   </div>:<div style={{display:'flex',flexDirection:'column',gap:18}}>
    <span style={{...pixel,fontSize:66,lineHeight:1.05,color:gold,textShadow:'0 4px 0 #000'}}>Find your fellow collectors.</span>
    <span style={{fontSize:26,lineHeight:1.4,color:'#e9e1cc'}}>Pets, drops and achievements from Old School RuneScape, all in one place.</span>
   </div>}
   {profile?<div style={{display:'flex',gap:12}}>{profile.stats.map(stat=><div key={stat.label} style={{display:'flex',flexDirection:'column',gap:10,padding:'16px 18px',background:'rgba(16,14,11,0.82)',border:`1px solid ${line}`,borderRadius:10,width:212}}>
     <span style={{display:'flex',alignItems:'center',gap:9,fontSize:17,color:muted}}>{art.icons[stat.label]&&<img alt="" src={art.icons[stat.label]} width={26} height={26} style={{objectFit:'contain'}}/>}{stat.label}</span>
     <div style={{display:'flex',flexDirection:'column',gap:4}}>
      <span style={{display:'flex',alignItems:'baseline',...pixel,fontSize:36,color:'#f6e54e'}}>{stat.value}{stat.total&&<span style={{fontSize:21,color:muted}}> / {stat.total}</span>}</span>
      <span style={{display:'flex',fontSize:16,color:'#9d927a'}}>{ranks[stat.label]?`Rank #${ranks[stat.label].toLocaleString('en-US')} on the board`:'\u00a0'}</span>
     </div>
    </div>)}</div>
   :<div style={{display:'flex',gap:12}}>{[['Pets collected','Pet tracker'],['Collection log','Collection log'],['Total level','Leaderboards']].map(([icon,label])=><div key={label} style={{display:'flex',alignItems:'center',gap:10,padding:'12px 18px',background:'rgba(16,14,11,0.82)',border:`1px solid ${line}`,borderRadius:999,fontSize:21,color:'#efe8d6'}}>{art.icons[icon]&&<img alt="" src={art.icons[icon]} width={28} height={28} style={{objectFit:'contain'}}/>}{label}</div>)}</div>}
   <span style={{fontSize:20,color:'#b9ad90'}}>spoonedosrs.com{profile?'/player/'+profile.name:''}</span>
  </div>

  {profile&&<div style={{display:'flex',position:'absolute',right:44,top:44,width:380,height:542,justifyContent:'center',alignItems:'flex-end',borderRadius:16,overflow:'hidden',border:`1px solid ${line}`,
   backgroundImage:backdrop?.sky?`linear-gradient(180deg, ${backdrop.sky} 0%, ${backdrop.sky} 58%, ${backdrop.ground} 58%, ${backdrop.ground} 100%)`:'radial-gradient(ellipse at 50% 60%, rgba(255,196,96,0.22) 0%, rgba(20,18,14,0.75) 70%)'}}>
   {backdrop?.image&&<img alt="" src={backdrop.image} width={380} height={542} style={{position:'absolute',left:0,top:0,objectFit:'cover'}}/>}
   {backdrop&&<div style={{display:'flex',position:'absolute',left:0,top:0,width:380,height:542,backgroundImage:'radial-gradient(ellipse at 50% 70%, rgba(0,0,0,0) 30%, rgba(8,7,5,0.55) 100%)'}}/>}
   <div style={{display:'flex',position:'absolute',left:110,bottom:22,width:160,height:22,borderRadius:999,background:'rgba(0,0,0,0.35)'}}/>
   <img alt="" src={character??art.mascot} width={character?320:220} height={character?520:140} style={{objectFit:'contain',marginBottom:character?12:200,marginRight:pet?40:0}}/>
   {pet&&<img alt="" src={pet} width={150} height={170} style={{position:'absolute',right:8,bottom:24,objectFit:'contain'}}/>}
  </div>}
 </div>;
}
