/** Browser safeguards for production responses. Does not alter bodies or cookies. */
export function securityHeaders(response:Response):Response {
 if(response.status===101)return response;
 const result=new Response(response.body,response);
 if(!result.headers.has('X-Content-Type-Options'))result.headers.set('X-Content-Type-Options','nosniff');
 if(!result.headers.has('Referrer-Policy'))result.headers.set('Referrer-Policy','strict-origin-when-cross-origin');
 // Production is HTTPS-only; browsers then never make plain-HTTP requests that could expose the session cookie.
 if(!result.headers.has('Strict-Transport-Security'))result.headers.set('Strict-Transport-Security','max-age=15552000');
 if(result.headers.get('Content-Type')?.toLowerCase().includes('text/html')){
  if(!result.headers.has('X-Frame-Options'))result.headers.set('X-Frame-Options','SAMEORIGIN');
  // RSC currently emits inline scripts. This document policy protects framing,
  // base URLs and plugins without pretending to be a complete script CSP.
  if(!result.headers.has('Content-Security-Policy'))result.headers.set('Content-Security-Policy',"base-uri 'self'; object-src 'none'; frame-ancestors 'self'");
 }
 return result;
}
