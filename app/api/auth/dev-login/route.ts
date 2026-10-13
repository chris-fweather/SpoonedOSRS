import {sessionVersion} from '@/lib/auth';
import {env} from 'cloudflare:workers';
import {db} from '@/lib/storage';
import {OWNER_DISCORD_IDS} from '@/lib/account-identity';
import {IS_DEV_ENVIRONMENT} from '@/lib/environment';
import {seal, SESSION_COOKIE, setCookie} from '@/lib/session';

/** Dev environment only: the owner signs in with a password (the DEV_LOGIN_PASSWORD Worker secret) instead of Discord.
 * Every other deployment answers 404, and the session is always the owner's own account. */
const SESSION_SECONDS = 60 * 60 * 24 * 7;
const page = (error: boolean) => new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Dev sign-in · SpoonedOSRS</title><style>body{color:#e6dfcd;background:#12110e;font:15px/1.6 system-ui,sans-serif;max-width:380px;margin:14vh auto;padding:24px}h1{font-size:20px;margin:0 0 6px}p{color:#a59e8b;margin:0 0 18px}label{display:grid;gap:6px;font-size:13px}input{padding:11px;border:1px solid #4b4233;border-radius:5px;background:#16140f;color:inherit;font:inherit}button{margin-top:14px;width:100%;padding:11px;border:1px solid #b77e25;border-radius:5px;background:#4d3b1e;color:#ffd994;font:600 15px system-ui;cursor:pointer}.error{color:#e57a6b}</style><h1>Dev environment sign-in</h1><p>Signs in as the site owner. This page exists only on dev.</p>${error ? '<p class="error">That password is not right.</p>' : ''}<form method="post"><label>Password<input type="password" name="password" autocomplete="current-password" required autofocus></label><button>Sign in</button></form>`, {headers: {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store'}});

function configured() { return IS_DEV_ENVIRONMENT && !!env.DEV_LOGIN_PASSWORD && env.DEV_LOGIN_PASSWORD.length >= 8 && !!env.SESSION_SECRET && env.SESSION_SECRET.length >= 32 && !!OWNER_DISCORD_IDS[0]; }

/** Compares in constant time so response timing does not reveal how much of a guess was right. */
async function matches(given: string, expected: string) {
  const enc = new TextEncoder(), [a, b] = await Promise.all([given, expected].map(v => crypto.subtle.digest('SHA-256', enc.encode(v))));
  const x = new Uint8Array(a), y = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

export function GET(request: Request) {
  if (!configured()) return new Response('Not found', {status: 404});
  return page(new URL(request.url).searchParams.has('error'));
}

export async function POST(request: Request) {
  if (!configured()) return new Response('Not found', {status: 404});
  const url = new URL(request.url);
  if (request.headers.get('origin') !== url.origin) return new Response('Use the dev sign-in form.', {status: 403});
  const form = await request.formData().catch(() => null);
  const password = String(form?.get('password') ?? '').slice(0, 200);
  if (!(await matches(password, env.DEV_LOGIN_PASSWORD!))) return new Response(null, {status: 303, headers: {Location: '/api/auth/dev-login?error=1', 'Cache-Control': 'no-store'}});
  const id = OWNER_DISCORD_IDS[0]!;
  const user = await db().prepare('SELECT username, global_name, avatar FROM users WHERE discord_id = ?').bind(id).first<{username: string; global_name: string | null; avatar: string | null}>();
  const token = await seal(env.SESSION_SECRET!, {id, username: user?.username ?? 'owner', globalName: user?.global_name ?? 'Owner', avatar: user?.avatar ?? null, exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS, v: await sessionVersion(id)});
  return new Response(null, {status: 303, headers: {Location: '/', 'Cache-Control': 'no-store', 'Set-Cookie': setCookie(SESSION_COOKIE, token, url, SESSION_SECONDS, '/')}});
}
