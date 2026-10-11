import type {Journal} from './model';
// Short-lived, bounded memory only; requests always use anonymous privacy filtering.
const previews=new Map<string,{expires:number;promise:Promise<Journal>}>();
export function loadCollectorPreview(name:string,refresh=false):Promise<Journal>{
 const key=name.toLowerCase(),cached=previews.get(key);
 if(!refresh&&cached&&cached.expires>Date.now())return cached.promise;
 const promise=fetch('/api/journal?username='+encodeURIComponent(name),{credentials:'omit'}).then(async r=>{if(!r.ok)throw Error('Preview unavailable.');return await r.json() as Journal;});
 previews.delete(key);previews.set(key,{expires:Date.now()+30_000,promise});
 while(previews.size>8)previews.delete(previews.keys().next().value!);
 void promise.catch(()=>{if(previews.get(key)?.promise===promise)previews.delete(key);});
 return promise;
}
