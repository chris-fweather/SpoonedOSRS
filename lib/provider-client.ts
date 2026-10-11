import {RequestError} from './request-body';

/** Read quotas are shared by the whole app, never multiplied by player count.
 * Temple's 5/min is conservative updater guidance pending an agreed read quota.
 * Hiscores/model allowances are our safeguards, not published entitlements.
 */
const policies = {
  temple: {label:'TempleOSRS', gap:12_500, ttl:300_000},
  runeprofile: {label:'RuneProfile', gap:2_100, ttl:60_000},
  wom: {label:'Wise Old Man', gap:3_100, ttl:300_000},
  hiscores: {label:'OSRS Hiscores', gap:1_100, ttl:60_000},
};
export function providerPolicy(url:URL) {
  if(url.protocol!=='https:' || url.username || url.password || url.port)throw new RequestError(400,'Unsupported import source.');
  let provider:keyof typeof policies;
  let model=false;
  if(url.hostname==='templeosrs.com' && url.pathname==='/api/collection-log/player_collection_log.php')provider='temple';
  else if(url.hostname==='api.runeprofile.com' && /^\/v1\/accounts\/[^/]+\/full$/.test(url.pathname))provider='runeprofile';
  else if(url.hostname==='runeprofile.com' && /^\/api\/profiles\/models\/[^/]+$/.test(url.pathname)){provider='runeprofile';model=true;}
  else if(url.hostname==='api.wiseoldman.net' && /^\/v2\/players\/[^/]+$/.test(url.pathname))provider='wom';
  else if(url.hostname==='secure.runescape.com' && url.pathname==='/m=hiscore_oldschool/index_lite.json')provider='hiscores';
  else throw new RequestError(400,'Unsupported import source.');
  url.hash='';url.searchParams.sort();
  return {provider,model,...policies[provider],ttl:model?3_600_000:policies[provider].ttl};
}

/** Respect both seconds and HTTP-date Retry-After; never shorten a provider's wait. */
export function retryDelay(headers:Headers, now:number, fallback=60_000) {
  const value=headers.get('Retry-After');
  if(value!==null){
    const ms=/^\d+(\.\d+)?$/.test(value.trim())?Number(value)*1000:Date.parse(value)-now;
    if(Number.isFinite(ms) && ms>=0)return Math.max(1000,Math.ceil(ms));
  }
  const reset=headers.get('RateLimit-Reset');
  if(reset!==null && /^\d+(\.\d+)?$/.test(reset.trim()))return Math.max(fallback,Math.ceil(Number(reset)*1000));
  return fallback;
}

type Value=string|number|ArrayBuffer;
export interface ProviderStatement {
  bind(...values:Value[]):ProviderStatement;
  first<T>():Promise<T|null>;
  run():Promise<unknown>;
}
export interface ProviderDatabase {prepare(sql:string):ProviderStatement}
type Cached={status:number;content_type:string;body:ArrayBuffer|number[]|null;fetched_at:number;expires_at:number};
type Options={database:ProviderDatabase;key:(url:string)=>Promise<string>;dailyBudget:()=>Promise<void>;fetcher?:typeof fetch;now?:()=>number;paused?:boolean};
const MAX_BYTES=1_800_000;

async function boundedBody(response:Response) {
  const reader=response.body?.getReader();
  if(!reader)return new ArrayBuffer(0);
  const chunks:Uint8Array[]=[];let size=0;
  try{
    for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;
      if(size>MAX_BYTES){await reader.cancel();throw new RequestError(502,'Provider response is too large.');}chunks.push(value);
    }
  }finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  return bytes.buffer;
}

/** D1 coordinates cache fills and pacing across Worker instances/regions.
 * A busy slot fails quickly with Retry-After instead of holding user requests open.
 * Only public GETs are accepted; auth/cookies and arbitrary update endpoints cannot pass.
 */
export function createProviderClient(options:Options):typeof fetch {
  const {database,key,dailyBudget}=options;
  const clock=options.now??Date.now,fetcher=options.fetcher??fetch;
  return async(input,init)=>{
    const request=new Request(input,init),url=new URL(request.url),policy=providerPolicy(url);
    if(request.method!=='GET' || request.headers.has('Authorization') || request.headers.has('Cookie') || request.headers.has('X-API-Key'))throw new RequestError(400,'Only public read requests are supported.');
    const id=await key(url.href),now=clock();
    const cached=await database.prepare('SELECT status,content_type,body,fetched_at,expires_at FROM provider_responses WHERE id=?').bind(id).first<Cached>();
    const serve=(row:Cached)=>new Response(row.status===404?null:new Uint8Array(row.body??[]),{status:row.status,headers:{'Content-Type':row.content_type,'Cache-Control':'no-store','X-Spooned-Cache':'hit','X-Source-Fetched-At':new Date(row.fetched_at).toISOString()}});
    if(cached && cached.expires_at>now && (cached.status===200||cached.status===404))return serve(cached);
    if(options.paused)throw new RequestError(503,'Imports are temporarily paused. Saved profiles remain available.',300);
    request.signal.throwIfAborted();
    const token=crypto.randomUUID();
    const lease=await database.prepare(`INSERT INTO provider_responses(id,token,lease_until) VALUES(?,?,?)
      ON CONFLICT(id) DO UPDATE SET token=excluded.token,lease_until=excluded.lease_until
      WHERE provider_responses.lease_until<=? AND provider_responses.expires_at<=? RETURNING id`).bind(id,token,now+30_000,now,now).first();
    if(!lease){
      const fresh=await database.prepare('SELECT status,content_type,body,fetched_at,expires_at FROM provider_responses WHERE id=?').bind(id).first<Cached>();
      if(fresh && fresh.expires_at>clock() && (fresh.status===200||fresh.status===404))return serve(fresh);
      throw new RequestError(429,`${policy.label} data is already being fetched. Please retry shortly.`,2);
    }
    try{
      // Single atomic slot: fixed minute boundaries cannot create a double burst.
      const gateTime=clock();
      const slot=await database.prepare(`INSERT INTO provider_pacing(provider,next_at) VALUES(?,?)
        ON CONFLICT(provider) DO UPDATE SET next_at=excluded.next_at WHERE provider_pacing.next_at<=? RETURNING next_at`).bind(policy.provider,gateTime+policy.gap,gateTime).first();
      if(!slot){const gate=await database.prepare('SELECT next_at FROM provider_pacing WHERE provider=?').bind(policy.provider).first<{next_at:number}>();
        throw new RequestError(429,`${policy.label} refreshes are busy. Your saved progress is unchanged.`,Math.max(1,Math.ceil(((gate?.next_at??gateTime+1000)-clock())/1000)));
      }
      await dailyBudget();
      await database.prepare('DELETE FROM provider_responses WHERE expires_at<=? AND lease_until<=?').bind(gateTime,gateTime).run();
      // Workers reject redirect:'error' with a TypeError. 'manual' returns any 3xx
      // unfollowed, and the status check below treats it as unavailable.
      const response=await fetcher(url.href,{method:'GET',redirect:'manual',headers:{Accept:policy.model?'model/gltf-binary':'application/json','User-Agent':'SpoonedOSRS/1.0 (https://spoonedosrs.com; Discord: snooked)'},signal:AbortSignal.any([request.signal,AbortSignal.timeout(15_000)])});
      const received=clock();
      const exhausted=response.headers.get('RateLimit-Remaining')==='0';
      if(response.status===429 || response.status===503 || exhausted){
        const wait=retryDelay(response.headers,received);
        await database.prepare(`INSERT INTO provider_pacing(provider,next_at) VALUES(?,?) ON CONFLICT(provider) DO UPDATE SET next_at=MAX(provider_pacing.next_at,excluded.next_at)`).bind(policy.provider,received+wait).run();
        if(response.status===429 || response.status===503){await response.body?.cancel();throw new RequestError(429,`${policy.label} has asked us to wait before refreshing. Your saved progress is unchanged.`,Math.ceil(wait/1000));}
      }
      if(response.status!==200 && response.status!==404){await response.body?.cancel();return new Response(null,{status:response.status,headers:{'Cache-Control':'no-store'}});}
      const body=response.status===404?new ArrayBuffer(0):await boundedBody(response);
      if(response.status===404)await response.body?.cancel();
      const type=policy.model?'model/gltf-binary':'application/json';
      if(response.status===200){
        if(policy.model){if(new Uint8Array(body).slice(0,4).join(',')!=='103,108,84,70')throw new RequestError(502,'Character model unavailable.');}
        else {try{JSON.parse(new TextDecoder().decode(body));}catch{throw new RequestError(502,'Provider returned invalid data.');}}
      }
      // Do not persist private/no-store responses or upstream cookies.
      const noStore=/\b(no-store|private)\b/i.test(response.headers.get('Cache-Control')??'') || response.headers.has('Set-Cookie');
      const ttl=response.status===404?60_000:policy.ttl;
      if(!noStore)await database.prepare(`UPDATE provider_responses SET status=?,content_type=?,body=?,fetched_at=?,expires_at=? WHERE id=? AND token=?`).bind(response.status,type,body,received,received+ttl,id,token).run();
      return new Response(response.status===404?null:body,{status:response.status,headers:{'Content-Type':type,'Cache-Control':'no-store','X-Spooned-Cache':'miss','X-Source-Fetched-At':new Date(received).toISOString()}});
    }finally{await database.prepare('UPDATE provider_responses SET lease_until=0 WHERE id=? AND token=?').bind(id,token).run();}
  };
}
