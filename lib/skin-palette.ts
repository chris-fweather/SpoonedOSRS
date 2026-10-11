import type {SkinTone} from './appearance';
import {SKIN_COLORS,cacheRgb} from './game-colors';
export const BASE_SKIN_RGB=cacheRgb(4550);
export function skinColor(rgb:number[],tone:SkinTone):number[]|null {
 if(tone==='default'||!rgb.every((v,i)=>Math.abs(v-BASE_SKIN_RGB[i])<1e-5))return null;
 return cacheRgb(SKIN_COLORS[tone]);
}
