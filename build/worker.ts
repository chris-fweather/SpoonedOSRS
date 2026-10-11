import {securityHeaders} from '../lib/security-headers';
import handler from "vinext/server/fetch-handler";

export default {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext) {
    const started=performance.now(),path=new URL(request.url).pathname;
    if(path.startsWith('/api/')&&path!=='/api/discord/interactions'){
      const limiter=request.method==='GET'||request.method==='HEAD'?env.API_READ_LIMIT:env.API_WRITE_LIMIT;
      const ip=request.headers.get('CF-Connecting-IP');
      if(limiter&&ip){
        const {budgetKey}=await import('../lib/request-controls');
        const key=await budgetKey('edge:'+Math.floor(Date.now()/3_600_000)+':'+ip);
        if(!(await limiter.limit({key})).success)return securityHeaders(Response.json({error:'Too many requests. Please wait a minute.'},{status:429,headers:{'Retry-After':'60','Cache-Control':'no-store'}}));
      }
    }
    let response=await handler.fetch(request, env, ctx);
    if(!import.meta.env.DEV)response=securityHeaders(response);
    if(!path.startsWith('/api/'))return response;
    const measured=new Response(response.body,response);
    measured.headers.append('Server-Timing',`app;dur=${(performance.now()-started).toFixed(1)}`);
    measured.headers.set('X-Content-Type-Options','nosniff');
    return measured;
  },
  // Every ten minutes: give a couple of profiles that never had a full pull one pass over all four sources.
  async scheduled(_controller: ScheduledController, _env: Cloudflare.Env, ctx: ExecutionContext) {
    ctx.waitUntil(import('../lib/background-refresh').then(({backgroundRefresh}) => backgroundRefresh()).then(
      results => console.log(JSON.stringify({event:'background-refresh',profiles:Object.keys(results).length,updated:Object.values(results).filter(r=>r==='updated').length})),
      error => console.error(JSON.stringify({event:'background-refresh-failed',message:String(error).slice(0,200)}))));
  },
};
