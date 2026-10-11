/** OSRS player recolour values, from the client body-colour palette.
 * Source: https://github.com/open-osrs/runelite/blob/master/runescape-client/src/main/java/class292.java
 * Subset of verified game colours, not a claim to include every current unlock.
 */
export function cacheRgb(hsl:number):number[]{const h=((hsl>>10)&63)/64+.5/64,s=((hsl>>7)&7)/8+.5/8,l=(hsl&127)/128,c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h*6)%2-1)),m=l-c/2;const a=[[c,x,0],[x,c,0],[0,c,x],[0,x,c],[x,0,c],[c,0,x]][Math.min(5,Math.floor(h*6))];return a.map(v=>linear(Math.pow(Math.max(0,v+m),.6)));}
function linear(v:number){return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}
export function cacheHex(hsl:number):string{return '#'+cacheRgb(hsl).map(v=>Math.round((v<=.0031308?v*12.92:1.055*v**(1/2.4)-.055)*255).toString(16).padStart(2,'0')).join('');}
export const SKIN_COLORS={default:4550,pale:4574,fair:4537,tan:5681,brown:5673,dark:5790,deep:6806,ebony:8076,green:17050,black:0,white:127,blue:-31821,purple:-17991} as const;
export const SKIN_LABELS:Record<keyof typeof SKIN_COLORS,string>={default:'Light',pale:'Pale',fair:'Warm',tan:'Tan',brown:'Brown',dark:'Dark brown',deep:'Deep brown',ebony:'Darkest',green:'Green',black:'Black',white:'White',blue:'Blue',purple:'Purple'};
export const HAIR_GAME_COLORS={brown:6798,blonde:7744,black:16,red:4797,grey:10283} as const;
export const HAIR_SWATCHES=Object.fromEntries(Object.entries(HAIR_GAME_COLORS).map(([name,value])=>[name,cacheHex(value)])) as Record<keyof typeof HAIR_GAME_COLORS,string>;
