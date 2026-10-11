import {accountName} from '@/lib/storage';
import {providerFetch} from '@/lib/request-controls';
import {RequestError} from '@/lib/request-body';
// Proxies the player's 3D character (GLB) from RuneProfile, which doesn't send CORS headers.
export async function GET(req: Request) {
  try {
    const rsn = accountName(new URL(req.url).searchParams.get('rsn'));
    const r = await providerFetch('https://runeprofile.com/api/profiles/models/' + encodeURIComponent(rsn), {
      headers: {'User-Agent': 'Spooned/1.0 (OSRS pet tracker)'},
      signal: AbortSignal.timeout(10000),
    });
    if (r.status !== 200) return new Response(null, {status: r.status===404?404:502, headers: {'Cache-Control': 'no-store'}});
    const body = await r.arrayBuffer();
    if (body.byteLength > 2_000_000) return new Response(null, {status: 413});
    return new Response(body, {headers: {'Content-Type': 'model/gltf-binary', 'Cache-Control': 'public, max-age=3600'}});
  } catch(error) {
    if(error instanceof RequestError)return new Response(null,{status:error.status,headers:{'Cache-Control':'no-store',...(error.retryAfter?{'Retry-After':String(error.retryAfter)}:{})}});
    if(import.meta.env.DEV)console.warn('Character model unavailable:',error instanceof Error?error.message:'upstream request failed');
    return new Response(null, {status: 502,headers:{'Cache-Control':'no-store'}});
  }
}
