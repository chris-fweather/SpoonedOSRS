'use client';
import {useState} from 'react';
import './discord-avatar.css';
/** Discord profile picture; the server supplies Discord's default avatar when none is set. If the image cannot load, the name's initial is shown instead. */
export function DiscordAvatar({src,name,className=''}:{src?:string|null;name:string;className?:string}){
 const [failed,setFailed]=useState<string|null>(null);
 if(!src||failed===src)return <span className={'discord-avatar avatar-fallback '+className} aria-hidden="true">{(name.trim()[0]??'?').toUpperCase()}</span>;
 return <img className={'discord-avatar '+className} src={src} alt="" width={40} height={40} decoding="async" referrerPolicy="no-referrer" onError={()=>setFailed(src)}/>;
}
