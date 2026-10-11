/** Cache derived public output only. Callers must supply fresh DB state (including privacy) as the key. */
const entries=new Map<string,{value:unknown,size:number}>();
let bytes=0;
export function publicBoardMemo<T>(key:string,compute:()=>T):T {
 const found=entries.get(key);if(found)return structuredClone(found.value) as T;
 const value=compute(),size=key.length*2+JSON.stringify(value).length*2;
 if(size<=1_000_000){while(entries.size>=64||bytes+size>4_000_000){const oldest=entries.keys().next().value!;bytes-=entries.get(oldest)!.size;entries.delete(oldest);}entries.set(key,{value:structuredClone(value),size});bytes+=size;}
 return value;
}
