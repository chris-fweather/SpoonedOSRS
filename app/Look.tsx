'use client';
import type {SceneKind} from '@/lib/profile-scene';
import {useEffect, useRef, useState} from 'react';
import {equippedIds, wearables, type Equipped} from '@/lib/flair';

import {HoverTip} from './HoverTip';
import {Info} from 'lucide-react';
import {DEFAULT_APPEARANCE,appearanceModels,equipmentModel,headModel,type Appearance} from '@/lib/appearance';
import {skinColor} from '@/lib/skin-palette';
import {petPlacement} from '@/lib/pet-presentation';

type Props = {appearance?:Appearance; equipped: Equipped; petId: string | null; petName: string | null; petDescription?:string; username?: string; interactive?: boolean};

type Tex = {magFilter: number; minFilter: number; generateMipmaps: boolean; needsUpdate: boolean; wrapS: number; wrapT: number; offset: {x: number; y: number}};
type Mat = {name?: string; map?: Tex | null};
type MeshNode = {
  traverse(fn: (obj: MeshNode) => void): void;
  isMesh?: boolean;
  material?: Mat | Mat[];
  geometry?: {
    getAttribute(name: string): {count:number; getX(index:number):number; getY(index: number): number; getZ(index:number):number; setXYZ(index:number,x:number,y:number,z:number):void; needsUpdate:boolean} | undefined;
    getIndex(): {count: number; getX(index: number): number} | null;
    setIndex(indices: number[]): void;
  };
  position: {y: number};
  add(obj: object): void;
};

/** Palette textures are a few pixels wide. Mipmaps blend those pixels into one colour and erase the face. */
function sharpen(root: MeshNode) {
  root.traverse(obj => {
    if (!obj.isMesh) return;
    const materials = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : [];
    for (const material of materials) {
      const map = material.map;
      if (!map) continue;
      map.magFilter = 9728;
      map.minFilter = 9728;
      map.generateMipmaps = false;
      map.needsUpdate = true;
    }
  });
}

function flowMaps(root: MeshNode): {map: Tex; du: number; dv: number}[] {
  const maps: {map: Tex; du: number; dv: number}[] = [];
  root.traverse(obj => {
    if (!obj.isMesh) return;
    const materials = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : [];
    for (const material of materials) {
      const match = /^flow:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/.exec(material.name ?? '');
      if (!match || !material.map) continue;
      material.map.wrapS = 1000;
      material.map.wrapT = 1000;
      material.map.needsUpdate = true;
      maps.push({map: material.map, du: Number(match[1]), dv: Number(match[2])});
    }
  });
  return maps;
}

function PetTooltip({description}:{description:string}) {
 const [name,...lines]=description.split('\n');
 return <span className="pet-tooltip-content"><strong className="tooltip-heading">{name}</strong>{lines.map((line,i)=>{const colon=line.indexOf(':');return colon<0?<span key={i}>{line}</span>:<span className="tooltip-detail" key={i}><span>{line.slice(0,colon+1)}</span> <b>{line.slice(colon+1).trim()}</b></span>;})}</span>;
}

/** Yaw-only view of the default outfit, worn cache models, and a follower pet in the same space. */
const SWAY_ANGLE = Math.PI / 4, SWAY_PERIOD = 9, SWAY_RESUME = 2500;

export function LookStage({appearance:bodyLook=DEFAULT_APPEARANCE,equipped, petId, petName, petDescription, username, interactive = true}: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [appearance,setAppearance]=useState('');
  const [attempt,setAttempt]=useState(0);
  const [renderedLook,setRenderedLook]=useState('');
  const look = equippedIds(equipped).join(',') + '|' + (petId ?? '') + '|' + (username ?? '') + '|' + bodyLook.body + '|' + bodyLook.hair + '|' + (bodyLook.skin??'default')+'|'+(bodyLook.background??'none');

  useEffect(() => {
    const el = host.current;
    const status={set textContent(value:string){if(!dead)setAppearance(value);}};
    if (!el) return;
    let dead = false;
    let cleanup = () => {};
    status.textContent = '';

    (async () => {
      const THREE = await import('three');
      const {GLTFLoader} = await import('three/addons/loaders/GLTFLoader.js');
      if (dead) return;
      const scenic=!!bodyLook.background&&bodyLook.background!=='none';
      const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
      const renderer = new THREE.WebGLRenderer({alpha: true, antialias: true});
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setClearColor(0x000000, 0);
      el.appendChild(renderer.domElement);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(28, 1, 1, 4000);
      scene.add(new THREE.AmbientLight(0xffffff, 0.72));
      const key = new THREE.DirectionalLight(0xfff2dd, 1.15);
      key.position.set(80, 220, 140);
      if(scenic){renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;key.castShadow=true;key.shadow.mapSize.set(512,512);key.shadow.bias=-.002;}
      scene.add(key);
      const fill = new THREE.DirectionalLight(0x8899bb, 0.35);
      fill.position.set(-120, 40, -80);
      scene.add(fill);

      const actor = new THREE.Group();
      scene.add(actor);
      const loader = new GLTFLoader();
      let disposed=false;
      const disposeNode=(root: any)=>root.traverse((obj:any)=>{
        obj.geometry?.dispose();
        for(const material of (Array.isArray(obj.material)?obj.material:obj.material?[obj.material]:[])){
          for(const value of Object.values(material))if((value as any)?.isTexture)(value as any).dispose();
          material.dispose();
        }
      });
      const release=()=>{if(disposed)return;disposed=true;disposeNode(scene);renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();};
      const lost=(event:Event)=>{event.preventDefault();if(!dead){status.textContent='Character not loaded';}};
      renderer.domElement.addEventListener('webglcontextlost',lost);
      cleanup=()=>{renderer.domElement.removeEventListener('webglcontextlost',lost);release();};
      const flowing: {map: Tex; du: number; dv: number}[] = [];
      const failed: string[] = [];
      const covered = new Set<number>();
      const bodyKits=bodyLook.body==='female'?appearanceModels.femaleKits:wearables.kits;
      for (const id of equippedIds(equipped)) {
        if(!equipmentModel(id,wearables.items[id]?.file??'',bodyLook))continue;
        for (const pos of wearables.items[id]?.wear ?? []) if (pos >= 0) covered.add(pos);
      }

      async function add(url: string, label: string, parent: {add(obj: object): void}) {
        if(dead)return null;
        try {
          const gltf = await loader.loadAsync(url) as {scene: MeshNode};
          if(dead){disposeNode(gltf.scene);return null;}
          sharpen(gltf.scene);
          if(scenic)gltf.scene.traverse((obj:any)=>{if(obj.isMesh){obj.castShadow=true;obj.receiveShadow=true;}});
          if(parent===actor&&bodyLook.skin){gltf.scene.traverse(obj=>{const colors=obj.geometry?.getAttribute('color');if(!colors)return;for(let i=0;i<colors.count;i++){const next=skinColor([colors.getX(i),colors.getY(i),colors.getZ(i)],bodyLook.skin!);if(next)colors.setXYZ(i,next[0],next[1],next[2]);}colors.needsUpdate=true;});}
          flowing.push(...flowMaps(gltf.scene));
          parent.add(gltf.scene);
          return gltf.scene;
        } catch {
          failed.push(label);
          return null;
        }
      }

      status.textContent = 'Custom character appearance';

      if (!wearables.kits.length) failed.push('default outfit');
      for (const kit of bodyKits) {
        if (kit.hide >= 0 && covered.has(kit.hide)) continue;
        const file=kit.part===0?headModel(bodyLook,covered.has(8)):kit.file;
        await add('/models/look/' + file + '?base=cache-jaw-v3', 'body', actor);
      }
      for (const id of equippedIds(equipped)) {
        const item = wearables.items[id];
        if (!item?.file) continue;
        const file=equipmentModel(id,item.file,bodyLook);
        if(!file){failed.push(item.name+' (female model unavailable)');continue;}
        await add('/models/look/' + file, item.name, actor);
      }

      const petFile = petId ? wearables.pets[petId]?.file : undefined;
      const playerBounds = new THREE.Box3().setFromObject(actor);
      const playerSize = playerBounds.getSize(new THREE.Vector3());
      const petRoot = new THREE.Group();
      actor.add(petRoot);
      if (petId && petName) {
        if (!petFile) failed.push(petName);
        else {
          const pet = await add('/models/look/' + petFile, petName, petRoot);
          if (pet) {
            const body = playerSize;
            const bounds = new THREE.Box3().setFromObject(pet);
            const raw = bounds.getSize(new THREE.Vector3());
            const placement = petPlacement(body.y,playerBounds.min.y,{x:raw.x,y:raw.y,z:raw.z,minY:bounds.min.y},petName);
            pet.position.y += placement.localY;
            petRoot.scale.setScalar(placement.scale);
            const width=raw.x*placement.scale;
            petRoot.position.set(Math.max(35,body.x*.4)+width*.55,placement.groundY,-Math.max(12,body.z*.15));
          }
        }
      }
      if (dead) { release(); return; }

      const frame = new THREE.Box3().setFromObject(actor);
      const size = frame.getSize(new THREE.Vector3());
      const mid = frame.getCenter(new THREE.Vector3());
      let scenery:{update:(time:number)=>void}|null=null;
      if(scenic){const {buildProfileScene}=await import('@/lib/profile-scene');if(dead){release();return;}scenery=buildProfileScene(scene,bodyLook.background as SceneKind,Math.max(playerSize.y,80),playerBounds.min.y);const extent=playerSize.y*3;Object.assign(key.shadow.camera,{left:-extent,right:extent,top:extent,bottom:-extent,near:1,far:extent*6});}
      const distance = Math.max(size.y, size.x, 80) * 2.55;
      camera.position.set(mid.x, mid.y, mid.z + distance);
      camera.lookAt(mid.x, mid.y, mid.z);

      const resize = () => {
        const w = el.clientWidth || 1;
        const h = el.clientHeight || 1;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        const fit=Math.max(size.y,size.x / camera.aspect,80)*2.45;
        camera.position.set(mid.x,mid.y+(scenic?size.y*.16:0),mid.z+fit*(scenic?1.12:1));
        camera.lookAt(mid.x,mid.y-(scenic?size.y*.025:0),mid.z);
        camera.updateProjectionMatrix();
      };
      resize();
      const observer = new ResizeObserver(resize);
      observer.observe(el);

      let dragging = false;
      let lastX = 0;
      // `facing` is the direction the visitor chose; the idle sway turns the character up to 45° either side of it.
      let facing = actor.rotation.y, lastInput = -Infinity;
      const input = () => { lastInput = performance.now(); };
      const down = (event: PointerEvent) => { dragging = true; lastX = event.clientX; input(); el.setPointerCapture(event.pointerId); };
      const move = (event: PointerEvent) => { if (!dragging) return; facing += (event.clientX - lastX) * 0.01; lastX = event.clientX; input(); };
      const up = () => { dragging = false; input(); };
      const turn = (event:KeyboardEvent) => {if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();facing+=(event.key==='ArrowLeft'?-1:1)*.15;input();}else if(event.key==='Home'){event.preventDefault();facing=0;input();}};
      if (interactive) {
        el.addEventListener('keydown',turn);
        el.addEventListener('pointerdown', down);
        el.addEventListener('pointermove', move);
        el.addEventListener('pointerup', up);
        el.addEventListener('pointercancel', up);
      }

      let frameId = 0;
      let visible=true,previousRender=0;
      const intersection=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??true;});intersection.observe(el);
      let last = performance.now(), swayTime = 0, swayWeight = 1;
      const tick = () => {
        frameId = requestAnimationFrame(tick);
        const now = performance.now();
        if(document.hidden||!visible){last=now;return;}if(now-previousRender<32)return;previousRender=now;
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        if(!reducedMotion.matches)scenery?.update(now/1000);
        for (const flow of reducedMotion.matches?[]:flowing) {
          flow.map.offset.x = (flow.map.offset.x + flow.du * dt) % 1;
          flow.map.offset.y = (flow.map.offset.y + flow.dv * dt) % 1;
        }
        // Idle sway: a slow 45° turn each way around the chosen direction. It eases out while the visitor turns the
        // character, eases back in 2.5 s after they stop, and is off when reduced motion is requested.
        const idle = !dragging && now - lastInput > SWAY_RESUME;
        swayWeight = reducedMotion.matches ? 0 : swayWeight + ((idle ? 1 : 0) - swayWeight) * Math.min(1, dt * 2);
        swayTime += dt * swayWeight;
        actor.rotation.y = facing + Math.sin(swayTime * 2 * Math.PI / SWAY_PERIOD) * SWAY_ANGLE * swayWeight;
        renderer.render(scene, camera);
      };
      tick();
      if(!dead)setRenderedLook(look+'|'+attempt);
      if (failed.length) status.textContent = 'Some items not loaded';

      cleanup = () => {
        cancelAnimationFrame(frameId);
        observer.disconnect();
        intersection.disconnect();
        if (interactive) {
          el.removeEventListener('keydown',turn);
          el.removeEventListener('pointerdown', down);
          el.removeEventListener('pointermove', move);
          el.removeEventListener('pointerup', up);
          el.removeEventListener('pointercancel', up);
        }
        renderer.domElement.removeEventListener('webglcontextlost',lost);
        release();
      };
    })().catch(() => { cleanup(); status.textContent = 'Character not loaded'; });

    return () => { dead = true; cleanup(); };
  }, [look, petId, petName, interactive, attempt]); // eslint-disable-line react-hooks/exhaustive-deps -- look already encodes equipped ids

  return <div className={'char-view wallpaper-'+(bodyLook.background??'none')} aria-busy={renderedLook!==look+'|'+attempt&&appearance!=='Character not loaded'}>{renderedLook!==look+'|'+attempt&&appearance!=='Character not loaded'&&<div className="character-loading" role="status"><span className="loading-spinner"/><span>Loading character…</span></div>}<div style={{visibility:renderedLook===look+'|'+attempt?'visible':'hidden'}} className="character-canvas" ref={host} tabIndex={interactive?0:undefined} role="img" aria-label="Character preview. Drag or use left and right arrow keys to rotate. Press Home to face forward."/>{petId&&petDescription&&<HoverTip className="companion-info" label={petDescription} content={<PetTooltip description={petDescription}/> }><img src={`/pets/${petId}.png`} alt={petName??'Following pet'}/></HoverTip>}{appearance==='Character not loaded'&&<div className="character-fallback"><p>Character not loaded</p><button type="button" onClick={()=>setAttempt(n=>n+1)}>Try again</button></div>}{appearance && <span className="appearance-info" onPointerDown={e=>e.stopPropagation()}><button type="button" aria-label="Character appearance information"><Info size={15}/></button><span role="tooltip">{appearance}</span></span>}</div>;
}
