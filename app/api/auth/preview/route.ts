import {env} from 'cloudflare:workers';
import {ensureAuthTables} from '@/lib/auth';
import {db} from '@/lib/storage';
import {localPreviewAllowed} from '@/lib/preview-policy';
import {OWNER_DISCORD_IDS} from '@/lib/account-identity';
import {seal, SESSION_COOKIE, setCookie} from '@/lib/session';

function enabled(request: Request) {
  return localPreviewAllowed(import.meta.env.DEV, env.LOCAL_PREVIEW_LOGIN, new URL(request.url)) && !!env.SESSION_SECRET && env.SESSION_SECRET.length >= 32;
}
export async function GET(request: Request) {
  if (!import.meta.env.DEV) return new Response('Not found', {status:404});
  if (!enabled(request)) return new Response('Not found', {status:404});
  return new Response(`<!doctype html><meta charset="utf-8"><title>Local preview · SpoonedOSRS</title><style>body{color:#eee;background:#1d1b17;font:16px/1.6 system-ui;max-width:540px;margin:12vh auto;padding:24px}button,a{color:#ffb650}button{padding:12px;background:#30281d;border:1px solid #74654b;cursor:pointer}</style><h1>Local owner preview</h1><p>This signs in a test account on this computer so you can edit Obifloat and SpoonedOSRS locally. It does not sign in to Discord or change the live website.</p><form method="post"><button>Enter local owner preview</button></form><p><a href="/player/Obifloat">Back to profile</a> · <a href="https://spoonedosrs.com/api/auth/discord">Real Discord login on the live site</a></p>`, {headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'"}});
}
export async function POST(request: Request) {
  if (!import.meta.env.DEV) return new Response('Not found', {status:404});
  if (!enabled(request)) return new Response('Not found', {status:404});
  const url = new URL(request.url);
  if (request.headers.get('origin') !== url.origin) return new Response('Use the local preview form.', {status:403});
  await ensureAuthTables();
  const id = OWNER_DISCORD_IDS[0];
  if (!id) return new Response('Set OWNER_DISCORD_IDS to use the local owner preview.', {status:404});
  await db().batch([
    db().prepare("DELETE FROM staff_members WHERE discord_id='9999900000'"),
    db().prepare("INSERT OR IGNORE INTO users(discord_id,username,global_name,avatar,updated_at) VALUES(?,'local_preview','Local preview',NULL,0)").bind(id),
    db().prepare("INSERT INTO claimed_names(rsn,display_name,discord_id,claimed_at) VALUES('obifloat','Obifloat',?,0),('spoonedosrs','SpoonedOSRS',?,0) ON CONFLICT(rsn) DO UPDATE SET discord_id=excluded.discord_id WHERE claimed_names.discord_id='9999900000' OR claimed_names.discord_id IN (SELECT value FROM json_each(?))").bind(id,id,JSON.stringify(OWNER_DISCORD_IDS)),
    db().prepare("INSERT INTO staff_members(discord_id,role,prefix,revision) VALUES(?,'owner',NULL,'local-preview') ON CONFLICT(discord_id) DO UPDATE SET role='owner'").bind(id),
  ]);
  const token = await seal(env.SESSION_SECRET!, {id,username:'local_preview',globalName:'Local preview',avatar:null,exp:Math.floor(Date.now()/1000)+3600});
  return new Response(null, {status:303,headers:{Location:'/player/Obifloat','Cache-Control':'no-store','Set-Cookie':setCookie(SESSION_COOKIE,token,url,3600,'/')}});
}
