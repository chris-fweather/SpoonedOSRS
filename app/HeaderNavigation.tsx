'use client';
import {useEffect, useId, useRef, useState, type ReactNode} from 'react';
import {Menu, X} from 'lucide-react';
import './header-navigation.css';

/** One accessible disclosure for both profile and public-page navigation. */
export function HeaderNavigation({children}:{children:ReactNode}) {
 const [open,setOpen]=useState(false),id=useId();
 const trigger=useRef<HTMLButtonElement>(null),nav=useRef<HTMLElement>(null);
 useEffect(()=>{
  const desktop=window.matchMedia('(min-width:821px)');
  const resized=()=>{if(desktop.matches)setOpen(false);};
  desktop.addEventListener('change',resized);
  return()=>desktop.removeEventListener('change',resized);
 },[]);
 useEffect(()=>{
  if(!open){nav.current?.querySelectorAll('details[open]').forEach(detail=>detail.removeAttribute('open'));return;}
  const outside=(event:PointerEvent)=>{
   const target=event.target;
   if(target instanceof Node&&!nav.current?.contains(target)&&!trigger.current?.contains(target))setOpen(false);
  };
  const escape=(event:KeyboardEvent)=>{
   if(event.key!=='Escape'||event.defaultPrevented)return;
   event.preventDefault();setOpen(false);trigger.current?.focus();
  };
  document.addEventListener('pointerdown',outside);
  document.addEventListener('keydown',escape);
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};
 },[open]);
 return <>
  <button ref={trigger} type="button" className="header-menu-toggle" aria-label={open?'Close navigation':'Open navigation'} aria-expanded={open} aria-controls={id} onClick={()=>setOpen(value=>!value)}>{open?<X size={23}/>:<Menu size={23}/>}</button>
  <nav ref={nav} id={id} className="hdr-auth header-navigation" data-open={open} aria-label="Main navigation" onClick={event=>{if(event.target instanceof Element&&event.target.closest('a[href]'))setOpen(false);}}>{children}</nav>
 </>;
}
