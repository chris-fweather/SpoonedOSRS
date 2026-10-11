/** Server-to-server GET authentication: HMAC-SHA256 over `${timestamp}\nGET\n${path}${search}`,
 * valid for 60 seconds. Used by the Discord role bridge and the post-deploy sync check. */
export async function verifySignedGet(request:Request,secret:string|undefined,now=Date.now()) {
 if(!secret||secret.length<32)return false;
 const timestamp=request.headers.get('x-spooned-timestamp')??'',signature=request.headers.get('x-spooned-signature')??'';
 if(!/^\d{10}$/.test(timestamp)||Math.abs(now/1000-Number(timestamp))>60||!/^([a-f0-9]{2}){32}$/.test(signature))return false;
 const url=new URL(request.url),message=`${timestamp}\nGET\n${url.pathname}${url.search}`;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 return crypto.subtle.verify('HMAC',key,Uint8Array.from(signature.match(/../g)!,s=>parseInt(s,16)),new TextEncoder().encode(message));
}
