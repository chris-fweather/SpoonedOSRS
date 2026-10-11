/** Public output only. Version is read from D1 on EVERY request, including cache hits. */
const entries=new Map<string,{data:string;expires:number}>();
let version=-1,bytes=0;
export async function cachedBoard(revision:number,key:string,compute:()=>Promise<unknown>){
 if(version!==revision){entries.clear();bytes=0;version=revision;}
 const found=entries.get(key);
 if(found&&found.expires>Date.now())return {data:found.data,hit:true};
 if(found){bytes-=found.data.length*2;entries.delete(key);}
 const data=JSON.stringify(await compute());
 // If a concurrent request has seen a newer version, don't repopulate its cache.
 if(version===revision&&data.length<250_000){
  while(entries.size>=64||bytes+data.length*2>4_000_000){const oldest=entries.keys().next().value;if(oldest===undefined)break;bytes-=entries.get(oldest)!.data.length*2;entries.delete(oldest);}
  const previous=entries.get(key);if(previous)bytes-=previous.data.length*2;
  entries.set(key,{data,expires:Date.now()+15_000});bytes+=data.length*2;
 }
 return {data,hit:false};
}
