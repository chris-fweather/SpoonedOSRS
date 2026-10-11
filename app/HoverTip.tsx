'use client';
import {useEffect, useId, useState, useRef, useLayoutEffect, type ReactNode} from 'react';
import {createPortal} from 'react-dom';

/** Render outside clipped model and panel containers. Works with keyboard focus too. */
export function HoverTip({label, children, className = '', active=false, content, placement='below', outsideSelector, tabIndex=0, touchPreview=true}: {label: string; children: ReactNode; className?: string; active?:boolean; content?:ReactNode; placement?:'below'|'right'; outsideSelector?:string; tabIndex?:number; touchPreview?:boolean}) {
  const id = useId();
  const tip=useRef<HTMLSpanElement>(null);
  const trigger=useRef<HTMLSpanElement>(null);
  const hovered=useRef(false),focused=useRef(false),dismissed=useRef(false);
  const touch=useRef(false),touchArmed=useRef(false);
  const [portal,setPortal]=useState<Element|null>(null);
  const [position, setPosition] = useState<{left: number; top: number} | null>(null);
  useEffect(()=>{
    if(active&&trigger.current)show(trigger.current);
    else if(!hovered.current&&!focused.current)setPosition(null);
  },[active]);
  useEffect(() => {
    if (!position) return;
    const hide = () => {touchArmed.current=false;dismissed.current=true;setPosition(null);};
    const outside = (event:PointerEvent) => {
      if(event.target instanceof Node&&!trigger.current?.contains(event.target)&&!tip.current?.contains(event.target))hide();
    };
    document.addEventListener('pointerdown',outside);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {document.removeEventListener('pointerdown',outside);window.removeEventListener('scroll', hide, true); window.removeEventListener('resize', hide);};
  }, [position]);
  useLayoutEffect(()=>{
    if(!position||!tip.current)return;
    const rect=tip.current.getBoundingClientRect();
    const anchor=outsideSelector?trigger.current?.closest(outsideSelector)?.getBoundingClientRect():trigger.current?.getBoundingClientRect();
    let preferredLeft=position.left,preferredTop=position.top;
    if(placement==='right'&&anchor){
      if(anchor.right+10+rect.width<=window.innerWidth-8)preferredLeft=anchor.right+10;
      else if(anchor.left-10-rect.width>=8)preferredLeft=anchor.left-10-rect.width;
      else {preferredLeft=anchor.left;preferredTop=anchor.top-rect.height-10>=8?anchor.top-rect.height-10:anchor.bottom+10;}
    }
    const left=Math.max(8,Math.min(preferredLeft,window.innerWidth-rect.width-8));
    const top=Math.max(8,Math.min(preferredTop,window.innerHeight-rect.height-8));
    if(left!==position.left||top!==position.top)setPosition({left,top});
  },[position,label,placement,outsideSelector]);
  function show(el: HTMLElement) {
    if(dismissed.current)return;
    setPortal(el.closest('dialog') ?? document.body);
    const r = el.getBoundingClientRect();
    if(placement==='right'){const a=outsideSelector?el.closest(outsideSelector)?.getBoundingClientRect()??r:r;setPosition({left:a.right+10,top:r.top});return;}
    setPosition({left: Math.max(8, Math.min(r.left, window.innerWidth - 208)), top: Math.max(8, Math.min(r.bottom + 8, window.innerHeight - 110))});
  }
  return <span ref={trigger} className={className} tabIndex={tabIndex} aria-label={label} aria-describedby={position ? id : undefined}
    onPointerDown={e => {touch.current=e.pointerType==='touch'||e.pointerType==='pen';}}
    onMouseEnter={e => {if(touch.current)return;dismissed.current=false;hovered.current=true;show(e.currentTarget);}} onMouseLeave={() => {if(touch.current)return;hovered.current=false;if(!active&&!focused.current)setPosition(null);}}
    onClickCapture={e => {
      // Touch previews are deliberate: the following tap activates the existing child action.
      // Keyboard activation (detail 0) and mouse clicks keep their normal single-click behavior.
      if(touchPreview&&touch.current&&e.detail!==0&&!touchArmed.current){
        e.preventDefault();e.stopPropagation();touchArmed.current=true;dismissed.current=false;show(e.currentTarget);return;
      }
      touchArmed.current=false;dismissed.current=true;setPosition(null);
    }}
    onFocus={e => {focused.current=(e.target as HTMLElement).matches(':focus-visible');if(focused.current&&!touch.current){dismissed.current=false;show(e.currentTarget);}}} onBlur={() => {focused.current=false;if(!active&&!hovered.current)setPosition(null);}} onKeyDown={e => {if (e.key === 'Escape') {touchArmed.current=false;dismissed.current=true;setPosition(null);}}}>
    {children}
    {position && createPortal(<span ref={tip} id={id} role="tooltip" className="floating-tooltip" style={position}>{content??label}</span>, portal ?? document.body)}
  </span>;
}
