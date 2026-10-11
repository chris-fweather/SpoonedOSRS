declare module 'three' {
  export class WebGLRenderer { constructor(opts?: object); setPixelRatio(n: number): void; setClearColor(c: number, a: number): void; setSize(w: number, h: number, update?: boolean): void; render(scene: object, camera: object): void; dispose(): void; forceContextLoss(): void; domElement: HTMLCanvasElement; shadowMap:{enabled:boolean;type:number}; }
  export class Scene { add(obj: object): void; background:Color; fog:Fog; }
  export class PerspectiveCamera { constructor(fov: number, aspect: number, near: number, far: number); aspect: number; position: {set(x: number, y: number, z: number): void}; lookAt(x: number, y: number, z: number): void; updateProjectionMatrix(): void; }
  export class AmbientLight { constructor(color: number, intensity: number); }
  export class DirectionalLight { constructor(color: number, intensity: number); castShadow:boolean; shadow:{mapSize:{set(w:number,h:number):void};camera:{left:number;right:number;top:number;bottom:number;near:number;far:number};bias:number}; position: {set(x: number, y: number, z: number): void}; }
  export interface Object3D {parent:Object3D|null;}
  export class Vector2 {constructor(x:number,y:number);}
  export class Raycaster {setFromCamera(point:Vector2,camera:PerspectiveCamera):void;intersectObject(object:object,recursive:boolean):{object:Object3D}[];}
  export class Group implements Object3D { children:Group[]; parent:Object3D|null; scale: {x:number;y:number;z:number;set(x:number,y:number,z:number):void;setScalar(n: number): void;multiplyScalar(n:number):void}; add(obj: object): void; rotation: {x:number;y: number;z:number}; position: {x:number;y:number;z:number;set(x: number, y: number, z: number): void}; visible: boolean; }
  export class Box3 { setFromObject(obj: object): this; getSize(target: Vector3): Vector3; getCenter(target: Vector3): Vector3; min: {y: number}; }
  export class Vector3 { constructor(); x: number; y: number; z: number; }
  export class Color {constructor(color:number);}
  export class Fog {constructor(color:number,near:number,far:number);}
  export class BufferGeometry {dispose():void;}
  export class BoxGeometry extends BufferGeometry {constructor(w:number,h:number,d:number);}
  export class CircleGeometry extends BufferGeometry {constructor(radius:number,segments:number);}
  export class CylinderGeometry extends BufferGeometry {constructor(top:number,bottom:number,height:number,segments:number);}
  export class ConeGeometry extends BufferGeometry {constructor(radius:number,height:number,segments:number);}
  export class IcosahedronGeometry extends BufferGeometry {constructor(radius:number,detail:number);}
  export class MeshLambertMaterial {constructor(options:object);dispose():void;}
  export class MeshBasicMaterial {constructor(options:object);dispose():void;}
  export class Mesh extends Group {constructor(geometry:BufferGeometry,material:object);castShadow:boolean;receiveShadow:boolean;}
  export class PointLight extends Group {constructor(color:number,intensity:number,distance:number);intensity:number;}
  export const PCFSoftShadowMap:number;

}

declare module 'three/addons/loaders/GLTFLoader.js' {
  export class GLTFLoader { loadAsync(url: string): Promise<{scene: {position: {y: number}}}>; }
}
