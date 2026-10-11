/** Lock the page behind a modal and restore its exact position on close. */
export function lockPageScroll(){
 const body=document.body,root=document.documentElement,x=window.scrollX,y=window.scrollY;
 const before={position:body.style.position,top:body.style.top,left:body.style.left,right:body.style.right,overflow:body.style.overflow,paddingRight:body.style.paddingRight,rootOverflow:root.style.overflow};
 const gap=Math.max(0,window.innerWidth-root.clientWidth);
 if(gap)body.style.paddingRight=`${parseFloat(getComputedStyle(body).paddingRight||'0')+gap}px`;
 Object.assign(body.style,{position:'fixed',top:`-${y}px`,left:'0',right:'0',overflow:'hidden'});root.style.overflow='hidden';
 return ()=>{const {rootOverflow,...styles}=before;Object.assign(body.style,styles);root.style.overflow=rootOverflow;window.scrollTo({top:y,left:x,behavior:'instant'});};
}
