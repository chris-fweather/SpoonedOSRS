import * as THREE from 'three';

export type SceneKind='castle'|'riverside'|'mine'|'woodland';
const SKY:Record<SceneKind,number>={castle:0x7b8791,riverside:0x607c82,mine:0x2f2b27,woodland:0x7f9a84};
const GROUND:Record<SceneKind,number>={castle:0x626854,riverside:0x526046,mine:0x5a5046,woodland:0x4f6a3e};

/** Original low-poly scenery. Models and scenery share world space and lighting. */
export function buildProfileScene(scene:THREE.Scene,kind:SceneKind,height:number,ground:number) {
 const root=new THREE.Group();root.scale.setScalar(height);root.position.set(0,ground,0);scene.add(root);
 scene.background=new THREE.Color(SKY[kind]);
 scene.fog=new THREE.Fog(SKY[kind],height*(kind==='mine'?4:7),height*(kind==='mine'?10:16));
 const materials=new Map<number,THREE.MeshLambertMaterial>();
 const material=(color:number)=>{let m=materials.get(color);if(!m){m=new THREE.MeshLambertMaterial({color,flatShading:true});materials.set(color,m);}return m;};
 const mesh=(geometry:THREE.BufferGeometry,color:number,x:number,y:number,z:number)=>{const m=new THREE.Mesh(geometry,material(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;root.add(m);return m;};
 const box=(w:number,h:number,d:number,color:number,x:number,y:number,z:number)=>mesh(new THREE.BoxGeometry(w,h,d),color,x,y,z);
 box(14,.12,14,GROUND[kind],0,-.07,-2);
 // Contact shadow remains grounded even on devices with reduced shadow quality.
 const shadow=new THREE.Mesh(new THREE.CircleGeometry(.3,24),new THREE.MeshBasicMaterial({color:0x10120e,transparent:true,opacity:.22,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.set(0,.008,0);root.add(shadow);
 const moving:((time:number)=>void)[]=[];
 function tree(x:number,z:number,scale=1){box(.13,.8*scale,.13,0x514331,x,.4*scale,z);for(let i=0;i<3;i++)mesh(new THREE.ConeGeometry((.5-i*.1)*scale,.9*scale,7),i===2?0x405442:0x344934,x,(.8+i*.32)*scale,z);}
 if(kind==='castle') {
  // A courtyard at human scale, with an arched gate and octagonal watchtowers.
  // Keep details behind the actor and reuse materials to stay light on phones.
  const stone=0x949184,trim=0xb4ac95,slate=0x4d5968;
  box(3.3,.04,5.5,0x666b62,0,-.025,-.8);
  for(let row=0;row<7;row++)for(let col=0;col<5;col++){
   box(.48,.016,.53,[0x85857a,0x7b7f74,0x909084][(row*3+col)%3],(col-2)*.5+(row%2)*.08,0,(row-3)*.55);
  }
  // Narrow side walls and stone courses give depth without a flat grey backdrop.
  for(const side of [-1,1]){
   box(1.5,1.4,.35,stone,side*1.6,.7,-2.55);
   box(1.55,.12,.42,trim,side*1.6,1.36,-2.55);
   for(let i=0;i<5;i++)box(.18,.23,.4,trim,side*1.6+(i-2)*.29,1.52,-2.55);
   for(let row=0;row<4;row++){
    box(1.48,.014,.015,0x716f64,side*1.6,.22+row*.3,-2.366);
    for(let col=0;col<3;col++)box(.012,.27,.018,0x77776b,side*1.6+(col-1)*.43+(row%2)*.1,.35+row*.3,-2.36);
   }
   const towerX=side*.94;
   mesh(new THREE.CylinderGeometry(.32,.37,1.95,8),stone,towerX,.975,-2.25);
   for(const y of [.12,.65,1.2,1.85])mesh(new THREE.CylinderGeometry(.365,.365,.09,8),trim,towerX,y,-2.25);
   mesh(new THREE.ConeGeometry(.46,.66,8),slate,towerX,2.22,-2.25);
   box(.075,.25,.02,0x303b42,towerX,1.47,-1.91);
   box(.11,.03,.05,trim,towerX,1.33,-1.89);
   const banner=box(.2,.44,.025,0x405d78,towerX,.92,-1.87);
   box(.045,.23,.032,0xc6aa66,towerX,.95,-1.85);
   moving.push(t=>{banner.rotation.y=Math.sin(t*1.3+side)*.07;});
   // Torches sit on matching stone pillars beside the path.
   box(.17,.47,.17,stone,side*.68,.235,-1.35);
   box(.22,.065,.22,trim,side*.68,.5,-1.35);
   box(.06,.22,.06,0x514133,side*.68,.61,-1.35);
   const flame=mesh(new THREE.ConeGeometry(.05,.16,5),0xffbc55,side*.68,.79,-1.35);
   const light=new THREE.PointLight(0xffa23d,.6,height*1.2);light.position.set(side*.68,.79,-1.35);root.add(light);
   moving.push(t=>{flame.scale.y=1+.1*Math.sin(t*8+side);light.intensity=.6+.08*Math.sin(t*8+side);});
   // Garden beds soften the edges of the paved courtyard.
   box(.48,.1,1.5,0x757e64,side*1.64,.03,-.35);
   for(let i=0;i<4;i++)mesh(new THREE.IcosahedronGeometry(.2,0),0x485e44,side*1.64,.18,-.9+i*.35);
   tree(side*2.7,-4.5,1.25);
  }
  // Door and voussoirs: individual blocks follow the arch rather than a lintel.
  box(1.2,.91,.12,0x3c352c,0,.455,-2.48);
  mesh(new THREE.CircleGeometry(.6,16),0x3c352c,0,.91,-2.405);
  for(let i=0;i<9;i++){
   const angle=i*Math.PI/8;
   const block=box(.24,.18,.28,i%2?trim:stone,Math.cos(angle)*.69,.91+Math.sin(angle)*.69,-2.34);
   block.rotation.z=angle-Math.PI/2;
  }
  for(const side of [-1,1])for(let row=0;row<4;row++)box(.2,.215,.28,row%2?trim:stone,side*.69,.12+row*.23,-2.34);
  for(let i=0;i<7;i++)box(.025,1.1,.025,0x76684d,(i-3)*.16,.55,-2.39);
  for(const y of [.28,.65,.96])box(1.16,.045,.035,0x242c2d,0,y,-2.365);
  // Distant keep and roofline, partly hidden by the gatehouse.
  box(1.2,1.9,.8,0x7f837d,0,.95,-4.25);
  mesh(new THREE.ConeGeometry(1,.6,4),slate,0,2.2,-4.25);
 }else if(kind==='riverside'){
  // The shore extends underneath the actor; the river passes behind it.
  box(9,.04,1.8,0x416d7b,0,-.015,-2.2);
  box(9,.08,.23,0x777868,0,.015,-1.2);
  for(let i=0;i<14;i++){const ripple=box(.22+(i%3)*.1,.004,.018,0x83a8a5,(i%7-3)*.8,.012,-1.55-Math.floor(i/7)*.8);const base=ripple.position.x;moving.push(t=>{ripple.position.x=base+Math.sin(t*.7+i)*.2;});}
  for(const side of [-1,1])for(let i=0;i<3;i++)tree(side*(.65+i*.48),-1-i*1.25,.8+i*.25);
  for(let i=0;i<12;i++){const rock=mesh(new THREE.IcosahedronGeometry(.12+(i%3)*.05,0),i%2?0x7a7c70:0x64685f,(i%2?-1:1)*(.46+Math.floor(i/2)*.17),.06,-.7-Math.floor(i/2)*.16);rock.scale.y=.6;}
  for(let i=0;i<6;i++){const grass=mesh(new THREE.ConeGeometry(.035,.17,3),0x8b9862,(i%2?-1:1)*(.37+i*.04),.085,.15-i*.1);moving.push(t=>{grass.rotation.z=Math.sin(t+i)*.08;});}
 }else if(kind==='mine'){
  // A lantern-lit mine: a rock face behind timber supports, ore rocks either side and a cart on its rails.
  const rock=[0x4a453f,0x534d46,0x423d38];
  for(let i=0;i<11;i++){const r=mesh(new THREE.IcosahedronGeometry(.55+(i%3)*.22,0),rock[i%3],(i-5)*.62,.35+(i%4)*.2,-2.6-(i%2)*.4);r.rotation.x=i;r.rotation.y=i*2;r.scale.y=1.3+(i%3)*.25;}
  for(let i=0;i<7;i++){const r=mesh(new THREE.IcosahedronGeometry(.7,0),rock[(i+1)%3],(i-3)*1.1,1.9+(i%2)*.25,-3.1);r.rotation.x=i*.7;r.rotation.y=i;}
  // Timber frame around the tunnel mouth.
  const timber=0x6b4f33;
  for(const side of [-1,1]){box(.13,1.45,.13,timber,side*.75,.72,-1.95);}
  box(1.75,.14,.16,timber,0,1.46,-1.95);
  // The tunnel runs back into the rock: warm dark stone, receding timber frames and a lantern deep inside, never a flat black panel.
  box(1.3,1.2,.08,0x3a3028,0,.62,-2.9);
  for(const side of [-1,1])box(.08,1.2,.95,0x433830,side*.62,.62,-2.42);
  box(1.3,.08,.95,0x2f2720,0,1.2,-2.42);
  for(const [z,s] of [[-2.25,.9],[-2.6,.8]] as const){for(const side of [-1,1])box(.09,1.3*s,.09,timber,side*.6*s,.65*s,z);box(1.3*s,.1,.1,timber,0,1.3*s,z);}
  const deep=new THREE.PointLight(0xff9a3c,.45,height*1.1);deep.position.set(0,.7,-2.6);root.add(deep);
  mesh(new THREE.BoxGeometry(.07,.09,.07),0xffc163,0,.95,-2.75);
  // Lanterns hang from the frame and flicker.
  for(const side of [-1,1]){
   box(.02,.14,.02,0x2c2622,side*.62,1.32,-1.86);
   const glass=mesh(new THREE.BoxGeometry(.09,.12,.09),0xffc163,side*.62,1.2,-1.86);
   const light=new THREE.PointLight(0xffa64a,.75,height*1.6);light.position.set(side*.62,1.2,-1.8);root.add(light);
   moving.push(t=>{const f=1+.12*Math.sin(t*7+side*2)+.05*Math.sin(t*13);glass.scale.setScalar(f);light.intensity=.75*f;});
  }
  // Ore rocks in OSRS colours: copper, tin, iron, mithril, adamantite and runite veins.
  const ores=[0xc7743a,0xb9b9b0,0x7d4a3a,0x5a5ea8,0x4f7a5a,0x4fb2c4];
  ores.forEach((ore,i)=>{
   const side=i%2?1:-1,x=side*(.62+Math.floor(i/2)*.3),z=-.55-Math.floor(i/2)*.45;
   const base=mesh(new THREE.IcosahedronGeometry(.27,0),0x6f6a62,x,.16,z);base.scale.y=.75;base.rotation.y=i;
   for(let k=0;k<3;k++)mesh(new THREE.IcosahedronGeometry(.07,0),ore,x+Math.cos(k*2.1+i)*.18,.24+(k%2)*.07,z+Math.sin(k*2.1+i)*.14);
  });
  // Rails and a mine cart run behind the actor.
  for(const z of [-1.28,-1.48])box(8,.03,.035,0x7c7a76,0,.04,z);
  for(let i=0;i<16;i++)box(.08,.025,.34,0x5c4430,(i-7.5)*.5,.015,-1.38);
  box(.56,.3,.38,0x5b5249,1.05,.24,-1.38);box(.5,.04,.32,0x2a2622,1.05,.39,-1.38);
  for(const dx of [-.18,.18])for(const dz of [-.2,.2])mesh(new THREE.CylinderGeometry(.06,.06,.04,10),0x2d2a27,1.05+dx,.07,-1.38+dz).rotation.x=Math.PI/2;
  for(let i=0;i<10;i++){const pebble=mesh(new THREE.IcosahedronGeometry(.05+(i%3)*.025,0),rock[i%3],(i%2?-1:1)*(.45+i*.12),.03,-.25-(i%4)*.18);pebble.scale.y=.6;}
 }else{
  // A woodland clearing: oaks and pines in layers, a felled log and stump, mushrooms and drifting leaves.
  function oak(x:number,z:number,scale=1){box(.16*scale,.9*scale,.16*scale,0x5c4630,x,.45*scale,z);for(let i=0;i<4;i++)mesh(new THREE.IcosahedronGeometry(.42*scale,0),i%2?0x4e7a3a:0x5f8c45,x+Math.cos(i*1.6)*.22*scale,(1.05+(i%2)*.22)*scale,z+Math.sin(i*1.6)*.18*scale);}
  for(const side of [-1,1]){
   oak(side*1.35,-1.6,1.15);oak(side*2.3,-2.8,1.3);tree(side*.6,-2.9,1.2);tree(side*3.2,-1.9,1.1);oak(side*.15,-4.2,1.6);
  }
  tree(0,-3.4,1.4);
  // The woodcutter's work: a stump with rings and a felled log beside it.
  mesh(new THREE.CylinderGeometry(.2,.23,.24,10),0x6f5236,-.72,.12,-.6);
  mesh(new THREE.CylinderGeometry(.19,.19,.01,10),0xc9a36a,-.72,.245,-.6);
  const log=mesh(new THREE.CylinderGeometry(.13,.13,1.1,10),0x6f5236,.85,.13,-.75);log.rotation.z=Math.PI/2;log.rotation.y=.4;
  for(let i=0;i<5;i++){const bush=mesh(new THREE.IcosahedronGeometry(.18+(i%2)*.06,0),0x4a6f36,(i%2?-1:1)*(1.6+i*.15),.12,-.4-i*.25);bush.scale.y=.7;}
  for(let i=0;i<4;i++){const x=(i%2?-1:1)*(.55+i*.18),z=-.35-i*.22;mesh(new THREE.CylinderGeometry(.018,.022,.08,6),0xe9dfc8,x,.04,z);mesh(new THREE.ConeGeometry(.06,.05,8),0xb8432f,x,.1,z);}
  for(let i=0;i<8;i++){const grass=mesh(new THREE.ConeGeometry(.035,.17,3),0x7f9a52,(i%2?-1:1)*(.35+i*.06),.085,.2-i*.09);moving.push(t=>{grass.rotation.z=Math.sin(t+i)*.08;});}
  // Leaves drift down in front of the trees and loop back to the canopy.
  for(let i=0;i<9;i++){
   const leaf=mesh(new THREE.BoxGeometry(.06,.006,.04),i%3?0x8aa24f:0xc28a3a,0,0,0);leaf.castShadow=false;
   const x0=(i-4)*.42,z0=-1.2-(i%3)*.4,speed=.18+(i%4)*.04,offset=i*1.7;
   moving.push(t=>{const fall=((t*speed+offset)%2.2);leaf.position.set(x0+Math.sin(t*1.3+i)*.15,2.1-fall,z0);leaf.rotation.x=t*1.7+i;leaf.rotation.y=t+i;leaf.rotation.z=t*.9;});
  }
 }
 return {update:(time:number)=>{for(const move of moving)move(time);}};
}
