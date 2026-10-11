import type {Metadata} from 'next';
import {accountName} from '@/lib/storage';
import Tracker from '../../Tracker';

function playerName(value: string) {
  try { return decodeURIComponent(value); } catch { return value; }
}

export default async function Page({params}: {params: Promise<{name: string}>}) {
  const {name} = await params;
  return <Tracker username={playerName(name)}/>;
}

export async function generateMetadata({params}:{params:Promise<{name:string}>}):Promise<Metadata>{
 const {name:raw}=await params;let name:string;try{name=accountName(playerName(raw));}catch{return {title:'Player profile · Spooned OSRS'};}
 const title=name+' · Spooned OSRS',description=`Explore ${name}’s character, pets and Old School RuneScape collection.`;
 const url='https://spoonedosrs.com/player/'+encodeURIComponent(name),image='https://spoonedosrs.com/api/share?username='+encodeURIComponent(name)+'&v=2';
 return {title,description,alternates:{canonical:url},openGraph:{type:'profile',siteName:'Spooned OSRS',title,description,url,images:[{url:image,width:1200,height:630,type:'image/png',alt:name+'’s Spooned OSRS profile'}]},twitter:{card:'summary_large_image',title,description,images:[image]}};
}
