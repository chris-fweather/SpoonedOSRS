import type {shareProfileDetails} from '@/lib/share-profile';
type Profile=ReturnType<typeof shareProfileDetails>;
export function ShareCard({profile,rocky,character,pet,badge,statIcons={}}:{profile?:Profile;rocky:string;character?:string;pet?:string;badge?:string;statIcons?:Record<string,string>}){
 const pixel={fontFamily:'Pixel'};
 const nameSize=profile&&profile.name.length+(profile.title?.length??0)>32?44:52;
 return <div style={{display:'flex',width:1200,height:630,position:'relative',background:'#14130f',color:'#e8e3d5',padding:32,fontFamily:'Sans'}}>
  <div style={{display:'flex',position:'absolute',left:16,top:16,width:1168,height:598,border:'2px solid #65583b',borderRadius:18}}/>
  <div style={{display:'flex',flexDirection:'column',width:profile?760:820,padding:'24px 24px',justifyContent:'space-between'}}>
   <div style={{display:'flex',alignItems:'center',gap:16}}><img src={rocky} width={60} height={60} style={{objectFit:'contain'}}/><span style={{...pixel,fontSize:32,color:'#ff981f'}}>Spooned OSRS</span></div>
   <div style={{display:'flex',flexDirection:'column',gap:14}}>
    {profile?<div style={{display:'flex',alignItems:'flex-start',gap:12}}>
     {badge&&<img src={badge} width={44} height={48} style={{objectFit:'contain'}}/>}
     <div style={{display:'flex',flexDirection:'column',gap:10}}>
      <div style={{display:'flex',alignItems:'baseline',gap:10,...pixel,lineHeight:1.15,whiteSpace:'nowrap'}}><span style={{fontSize:nameSize,color:'#f3f0e8'}}>{profile.name}</span>{profile.title&&<span style={{fontSize:30,color:'#f6d34c'}}>{profile.title}</span>}</div>
      <div style={{display:'flex',fontSize:26,lineHeight:1.4,color:'#b8ae99'}}>{profile.achievementTitle??profile.status}</div>
     </div>
    </div>:<><div style={{display:'flex',...pixel,fontSize:58,lineHeight:1.2,color:'#ffae45'}}>Find your fellow collectors.</div><div style={{display:'flex',flexDirection:'column',fontSize:25,lineHeight:1.5,color:'#b8ae99',gap:4}}><span>Pets, drops and achievements.</span><span>Your Old School RuneScape journey, all in one place.</span></div></>}
   </div>
   <div style={{display:'flex',gap:14}}>{profile?profile.stats.map(stat=><div key={stat.label} style={{display:'flex',flexDirection:'column',gap:12,padding:'16px 18px',background:'#222018',border:'1px solid #494335',borderRadius:8,minWidth:210}}><span style={{display:'flex',alignItems:'center',gap:8,fontSize:17,color:'#b8ae99'}}>{statIcons[stat.label]&&<img src={statIcons[stat.label]} width={28} height={28} style={{objectFit:'contain'}}/>}{stat.label}</span><span style={{display:'flex',alignItems:'baseline',...pixel,fontSize:34,color:'#f6e54e'}}>{stat.value}{stat.total&&<span style={{fontSize:21,color:'#b8ae99'}}> / {stat.total}</span>}</span></div>):<div style={{display:'flex',fontSize:23,color:'#e8e3d5',padding:'17px 22px',border:'1px solid #665236',borderRadius:8}}>Explore a profile · Share your collection</div>}</div>
   <div style={{display:'flex',fontSize:20,color:'#8e8471'}}>spoonedosrs.com{profile?'/player/'+profile.name:''}</div>
  </div>
  <div style={{display:'flex',position:'absolute',right:34,top:48,bottom:48,width:profile?340:280,justifyContent:'center',alignItems:'center',borderRadius:14,background:profile?'radial-gradient(ellipse at center, #3b3527 0%, #1a1914 72%)':'transparent'}}>
   <img src={character??rocky} width={character?280:220} height={character?470:220} style={{objectFit:'contain',marginRight:pet?35:0}}/>
   {pet&&<img src={pet} width={150} height={170} style={{position:'absolute',right:-4,bottom:16,objectFit:'contain'}}/>}
  </div>
 </div>;
}
