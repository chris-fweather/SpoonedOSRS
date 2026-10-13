import {env} from 'cloudflare:workers';
const assets=new Map<string,Promise<ArrayBuffer>>();
const sizes=new Map<string,number>();
function evict(url:string){assets.delete(url);sizes.delete(url);}
/** Paths come only from the shipped model catalogue or validated local image IDs. */
export async function shareAsset(path:string,origin:string){
 if(!/^\/(?:models|pets|fonts|portraits|ui|icons|drops|brand)\/[a-zA-Z0-9_./-]+$/.test(path)||path.includes('..'))throw Error('Invalid share asset');
 const url=origin+path;
 let pending=assets.get(url);
 if(!pending){
  // The asset binding reaches this deployment directly, without a same-zone HTTP subrequest.
  const response=env.ASSETS?env.ASSETS.fetch(new Request(url)):fetch(url,{signal:AbortSignal.timeout(8000)});
  pending=response.then(async r=>{if(!r.ok)throw Error('Share asset unavailable: '+path+' ('+r.status+')');const data=await r.arrayBuffer();if(data.byteLength>4000000)throw Error('Share asset too large');sizes.set(url,data.byteLength);while([...sizes.values()].reduce((a,b)=>a+b,0)>8_000_000){const oldest=sizes.keys().next().value!;evict(oldest);}return data;}).catch(error=>{evict(url);throw error;});if(assets.size>=32)evict(assets.keys().next().value!);assets.set(url,pending);
 }
 return pending;
}
export async function shareDataUrl(path:string,origin:string){const data=await shareAsset(path,origin);return 'data:'+(path.endsWith('.svg')?'image/svg+xml':/\.jpe?g$/.test(path)?'image/jpeg':'image/png')+';base64,'+Buffer.from(data).toString('base64');}
