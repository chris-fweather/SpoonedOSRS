// Runs the production build (`npm run build` first) inside workerd with an empty in-memory D1 that has
// every migration applied. Outbound requests are refused unless a check supplies a mock, so nothing
// leaves the machine and no real secrets are needed.
import {randomBytes} from 'node:crypto';
import {existsSync,readdirSync,readFileSync,statSync} from 'node:fs';
import path from 'node:path';
import {convertV4MiniflareOptions,Miniflare} from 'miniflare';

export const ORIGIN='https://spoonedosrs.com';

/** D1 exec() runs one line per statement, so batch whole statements; trigger bodies end at END;. */
export function statements(sql){
 const out=[];let current='';
 for(const line of sql.split('\n')){
  if(/^\s*--/.test(line))continue;
  current+=line+'\n';const text=current.trim();
  if(!text.endsWith(';')||/^CREATE\s+TRIGGER/i.test(text)&&!/\bEND\s*;$/i.test(text))continue;
  out.push(text);current='';
 }
 if(current.trim())out.push(current.trim());
 return out;
}

const types={'.png':'image/png','.gif':'image/gif','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.ttf':'font/ttf'};
/** The ASSETS binding, served from the built static files like Workers static assets. */
async function assets(request){
 const root=path.resolve('dist/client'),file=path.resolve(root,'.'+decodeURIComponent(new URL(request.url).pathname));
 if(!file.startsWith(root+path.sep)||!existsSync(file)||!statSync(file).isFile())return new Response('Not found',{status:404});
 return new Response(readFileSync(file),{headers:{'Content-Type':types[path.extname(file)]??'application/octet-stream'}});
}

/** Starts one isolated Worker. `outbound` receives every upstream Request; by default they get a 503. */
export async function startWorker({outbound,bindings={}}={}){
 const config=JSON.parse(readFileSync('dist/server/wrangler.json','utf8'));
 const secret=randomBytes(32).toString('base64'),upstream=[];
 const mf=new Miniflare(convertV4MiniflareOptions({
  // Every bundled chunk and WebAssembly module, as Wrangler uploads them.
  modules:readdirSync('dist/server',{recursive:true}).filter(f=>/\.(js|wasm)$/.test(f)).sort((a,b)=>(b==='index.js')-(a==='index.js'))
   .map(f=>({type:f.endsWith('.wasm')?'CompiledWasm':'ESModule',path:f,contents:readFileSync(path.join('dist/server',f))})),
  compatibilityDate:config.compatibility_date,compatibilityFlags:config.compatibility_flags,
  d1Databases:['DB'],serviceBindings:{ASSETS:assets},
  bindings:{...config.vars,SESSION_SECRET:secret,...bindings},
  outboundService:async request=>{upstream.push(request.url);return outbound?await outbound(request):new Response('Upstream requests are blocked in tests.',{status:503});},
 }));
 const database=await mf.getD1Database('DB');
 for(const file of readdirSync('drizzle').filter(f=>/^\d{4}_.+\.sql$/.test(f)).sort())
  await database.batch(statements(readFileSync('drizzle/'+file,'utf8')).map(sql=>database.prepare(sql)));
 return {
  origin:ORIGIN,secret,database,upstream,mf,
  /** Same as fetch(), dispatched to the Worker. Redirects are returned, never followed off-machine. */
  fetch:(input,init={})=>mf.dispatchFetch(String(input),{redirect:'manual',...init}),
  /** Rows as arrays, like sqlite3's fetchall(). */
  sql:async(query,params=[])=>await database.prepare(query).bind(...params).raw(),
  /** Rows as objects keyed by column name. */
  rows:async(query,params=[])=>(await database.prepare(query).bind(...params).all()).results,
  dispose:()=>mf.dispose(),
 };
}
