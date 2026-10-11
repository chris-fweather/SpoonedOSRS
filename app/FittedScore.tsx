"use client";
import {useLayoutEffect,useRef} from 'react';

/** Keep the complete value readable inside its reserved leaderboard column. */
export function FittedScore({text}:{text:string}) {
 const box=useRef<HTMLElement>(null),value=useRef<HTMLSpanElement>(null);
 useLayoutEffect(()=>{
  const parent=box.current,span=value.current;if(!parent||!span)return;
  const fit=()=>{
   span.style.fontSize='';
   const natural=span.getBoundingClientRect().width,available=parent.clientWidth;
   if(natural>available&&available>0)span.style.fontSize=`${parseFloat(getComputedStyle(span).fontSize)*available/natural}px`;
  };
  const observer=new ResizeObserver(fit);observer.observe(parent);fit();
  let active=true;void document.fonts.ready.then(()=>{if(active)fit();});
  return()=>{active=false;observer.disconnect();};
 },[text]);
 return <b ref={box} className="fitted-score"><span ref={value}>{text}</span></b>;
}
