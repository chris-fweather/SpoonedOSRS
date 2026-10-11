import {localPreviewAllowed} from './preview-policy';
import {accountIdentity,OWNER_DISCORD_IDS} from './account-identity';
import {env} from 'cloudflare:workers';
import {accountName, addAccount, db, sameOrigin} from './storage';
import {
  APEX_ORIGIN,
  discordAuthorizeUrl,
  discordAvatarUrl,
  IDENTIFY_SCOPE,
  loginHost,
  open,
  randomToken,
  codeChallenge,
  readCookie,
  redirectUriFor,
  seal,
  SESSION_COOKIE,
  SESSION_SECONDS,
  setCookie,
  STATE_COOKIE,
  STATE_SECONDS,
  validSession,
  type SessionUser,
} from './session';

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

export type PublicUser = {
  id: string;
  username: string;
  globalName: string | null;
  avatarUrl: string;
};

type PendingLogin = {state: string; verifier: string; exp: number};
type DiscordIdentity = {id: string; username: string; globalName: string | null; avatar: string | null};

export async function beginDiscordLogin(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const host = loginHost(url);
  if (host === 'www') return Response.redirect(`${APEX_ORIGIN}/api/auth/discord`, 302);
  if (host !== 'apex' && host !== 'local') {
    if (import.meta.env.DEV && ['localhost','127.0.0.1'].includes(url.hostname)) return Response.redirect(url.origin + '/api/auth/preview', 302);
    return html('Discord login is available at https://spoonedosrs.com. This preview origin is not registered with Discord.', 400);
  }
  const redirectUri = redirectUriFor(host);
  if (!redirectUri) return text('Log in from spoonedosrs.com.', 400);
  const clientId = configuredClientId();
  const secret = configuredSessionSecret();
  if (!clientId || !secret) return html('Discord login is not configured.', 503);
  const state = randomToken();
  const verifier = randomToken();
  const sealed = await seal(secret, {state, verifier, exp: now() + STATE_SECONDS} satisfies PendingLogin);
  const location = discordAuthorizeUrl({
    clientId,
    redirectUri,
    state,
    challenge: await codeChallenge(verifier),
  });
  if (!location.includes(`scope=${IDENTIFY_SCOPE}`)) return html('Discord login is not configured.', 503);
  return continueToDiscord(location, setCookie(STATE_COOKIE, sealed, url, STATE_SECONDS, '/api/auth'));
}

export async function finishDiscordLogin(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const host = loginHost(url);
  if (host !== 'apex' && host !== 'local') return text('Log in from spoonedosrs.com.', 400);
  const redirectUri = redirectUriFor(host);
  const clientId = configuredClientId();
  const clientSecret = configuredClientSecret();
  const secret = configuredSessionSecret();
  if (!redirectUri || !clientId || !clientSecret || !secret) return html('Discord login is not configured.', 503);
  const failed = failRedirect(url);
  if (url.searchParams.get('error')) return failed;
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state || code.length > 512 || state.length > 128) return failed;
  const pending = await open<PendingLogin>(secret, readCookie(request.headers.get('cookie'), STATE_COOKIE) ?? '');
  if (!pending || pending.exp < now() || pending.state !== state || !pending.verifier) return failed;
  const identity = await discordIdentity(clientId, clientSecret, code, redirectUri, pending.verifier);
  if (!identity) return failed;
  try {
    await ensureAuthTables();
    await db().prepare(
      `INSERT INTO users (discord_id, username, global_name, avatar, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(discord_id) DO UPDATE SET
         username = excluded.username,
         global_name = excluded.global_name,
         avatar = excluded.avatar,
         updated_at = excluded.updated_at`,
    ).bind(identity.id, identity.username, identity.globalName, identity.avatar, Date.now()).run();
  } catch {
    return failed;
  }
  const session: SessionUser = {...identity, exp: now() + SESSION_SECONDS};
  const headers = new Headers({Location: '/', 'Cache-Control': 'no-store'});
  headers.append('Set-Cookie', setCookie(SESSION_COOKIE, await seal(secret, session), url, SESSION_SECONDS, '/'));
  headers.append('Set-Cookie', setCookie(STATE_COOKIE, '', url, 0, '/api/auth'));
  return new Response(null, {status: 302, headers});
}

export async function readSession(request: Request): Promise<(SessionUser & {discordId: string}) | null> {
  const secret = configuredSessionSecret();
  if (!secret) return null;
  const token = readCookie(request.headers.get('cookie'), SESSION_COOKIE);
  if (!token) return null;
  const verified = validSession(await open<unknown>(secret, token));
  if(!verified)return null;
  const id=import.meta.env.DEV&&verified.id==='9999900000'&&localPreviewAllowed(true,env.LOCAL_PREVIEW_LOGIN,new URL(request.url))&&OWNER_DISCORD_IDS[0]?OWNER_DISCORD_IDS[0]:accountIdentity(verified.id);
  return {...verified,discordId:verified.id,id};
}

export async function sessionPayload(request: Request): Promise<Response> {
  const session = await readSession(request);
  if (!session) return Response.json({user: null, names: []}, {headers: {'Cache-Control': 'no-store'}});
  try {
    await ensureAuthTables();
    const names = await linkedNames(session.id);
    const user: PublicUser = {
      id: session.id,
      username: session.username,
      globalName: session.globalName,
      avatarUrl: discordAvatarUrl(session.discordId, session.avatar),
    };
    return Response.json({user, names}, {headers: {'Cache-Control': 'no-store'}});
  } catch {
    return Response.json({error: 'Could not load your linked names.'}, {status: 503, headers: {'Cache-Control': 'no-store'}});
  }
}

export function logoutResponse(request: Request): Response {
  sameOrigin(request);
  const url = new URL(request.url);
  const headers = new Headers({'Cache-Control': 'no-store'});
  headers.append('Set-Cookie', setCookie(SESSION_COOKIE, '', url, 0, '/'));
  headers.append('Set-Cookie', setCookie(STATE_COOKIE, '', url, 0, '/api/auth'));
  return Response.json({ok: true}, {headers});
}

export async function requireLinkedWriter(request: Request, username: unknown): Promise<string> {
  sameOrigin(request);
  const session = await readSession(request);
  if (!session) throw new HttpError(401, 'Log in with Discord to change this journal.');
  const name = accountName(username);
  await ensureAuthTables();
  const row = await db().prepare('SELECT discord_id FROM claimed_names WHERE rsn = ?').bind(name.toLowerCase()).first<{discord_id: string}>();
  if (!row || row.discord_id !== session.id) throw new HttpError(403, 'This RuneScape name is not linked to your Discord account.');
  return name;
}

/** Linking is not proof of game ownership, so one Discord identity cannot reserve names in bulk.
 * Unlinked names stay reserved to their owner and still count; staff can release them. */
export const MAX_RESERVED_NAMES = 10;

export async function claimRuneScapeName(request: Request, username: unknown) {
  sameOrigin(request);
  const session = await readSession(request);
  if (!session) throw new HttpError(401, 'Log in with Discord to claim a RuneScape name.');
  const name = accountName(username);
  const rsn = name.toLowerCase();
  await ensureAuthTables();
  // A removed link is not a transfer of the previous owner's private journal.
  await db().batch([
    db().prepare('INSERT OR IGNORE INTO profile_link_owners(rsn,discord_id,linked_at) SELECT ?,?,? WHERE (SELECT COUNT(*) FROM profile_link_owners WHERE discord_id=?)<?')
      .bind(rsn,session.id,Date.now(),session.id,MAX_RESERVED_NAMES),
    db().prepare(`INSERT OR IGNORE INTO claimed_names(rsn,display_name,discord_id,claimed_at,companion_pet,display_piece,equipped,pinned_mark)
      SELECT rsn,?,discord_id,?,json_extract(saved_flair,'$.companion_pet'),json_extract(saved_flair,'$.display_piece'),json_extract(saved_flair,'$.equipped'),json_extract(saved_flair,'$.pinned_mark')
      FROM profile_link_owners WHERE rsn=? AND discord_id=?`).bind(name,Date.now(),rsn,session.id),
  ]);
  const row=await db().prepare('SELECT discord_id FROM claimed_names WHERE rsn=?').bind(rsn).first<{discord_id:string}>();
  if(!row&&!await db().prepare('SELECT 1 FROM profile_link_owners WHERE rsn=?').bind(rsn).first())
    throw new HttpError(409,`Each Discord account can hold up to ${MAX_RESERVED_NAMES} RuneScape names, including names you unlinked. Ask staff to release one you no longer use.`);
  if(!row||row.discord_id!==session.id)throw new HttpError(409,`${name} is already linked or reserved. Sign in with the Discord account that linked it. A different owner needs a reviewed transfer.`);
  return addAccount(name);
}

export async function unlinkRuneScapeName(request: Request, username: unknown) {
  sameOrigin(request);
  const session = await readSession(request);
  if (!session) throw new HttpError(401, 'Log in with Discord to unlink a RuneScape name.');
  const name = accountName(username);
  const row = await db().prepare('SELECT discord_id FROM claimed_names WHERE rsn = ?').bind(name.toLowerCase()).first<{discord_id: string}>();
  if (!row || row.discord_id !== session.id) throw new HttpError(403, 'You can unlink a RuneScape name only when it is linked to your Discord account.');
  await db().batch([
    db().prepare(`INSERT INTO profile_link_owners(rsn,discord_id,linked_at,saved_flair)
      SELECT rsn,discord_id,claimed_at,json_object('companion_pet',companion_pet,'display_piece',display_piece,'equipped',equipped,'pinned_mark',pinned_mark)
      FROM claimed_names WHERE rsn=? AND discord_id=?
      ON CONFLICT(rsn) DO UPDATE SET saved_flair=excluded.saved_flair WHERE profile_link_owners.discord_id=excluded.discord_id`).bind(name.toLowerCase(),session.id),
    db().prepare('DELETE FROM claimed_names WHERE rsn=? AND discord_id=?').bind(name.toLowerCase(),session.id),
  ]);
}

async function linkedNames(discordId: string): Promise<string[]> {
  const result = await db().prepare(
    'SELECT display_name FROM claimed_names WHERE discord_id = ? ORDER BY display_name',
  ).bind(discordId).all<{display_name: string}>();
  return result.results.map(row => row.display_name);
}

async function discordIdentity(clientId: string, clientSecret: string, code: string, redirectUri: string, verifier: string): Promise<DiscordIdentity | null> {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  });
  let accessToken = '';
  try {
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        'User-Agent': 'Spooned (https://spoonedosrs.com)',
      },
      body,
      signal: AbortSignal.timeout(15000),
    });
    if (!tokenResponse.ok) return null;
    const tokenText = await tokenResponse.text();
    if (tokenText.length > 20000) return null;
    const token = JSON.parse(tokenText) as {access_token?: unknown; token_type?: unknown};
    if (typeof token.access_token !== 'string' || token.access_token.length < 1 || token.access_token.length > 4096) return null;
    if (typeof token.token_type !== 'string' || token.token_type.toLowerCase() !== 'bearer') return null;
    accessToken = token.access_token;
  } catch {
    return null;
  }
  try {
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        'User-Agent': 'Spooned (https://spoonedosrs.com)',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!userResponse.ok) return null;
    const userText = await userResponse.text();
    if (userText.length > 20000) return null;
    return parseIdentity(JSON.parse(userText) as Record<string, unknown>);
  } catch {
    return null;
  }
}

function parseIdentity(raw: Record<string, unknown>): DiscordIdentity | null {
  if (typeof raw.id !== 'string' || !/^\d{5,32}$/.test(raw.id)) return null;
  const username = raw.username;
  if (!cleanName(username)) return null;
  let globalName: string | null = null;
  if (raw.global_name != null) {
    if (!cleanName(raw.global_name)) return null;
    globalName = raw.global_name;
  }
  let avatar: string | null = null;
  if (raw.avatar != null) {
    if (typeof raw.avatar !== 'string' || !/^[A-Za-z0-9_]{2,64}$/.test(raw.avatar)) return null;
    avatar = raw.avatar;
  }
  return {id: raw.id, username, globalName, avatar};
}

function cleanName(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 32 && !/[\u0000-\u001f]/.test(value);
}

function configuredClientId(): string | null {
  const id = env.DISCORD_CLIENT_ID;
  return id && /^\d{5,32}$/.test(id) ? id : null;
}

function configuredClientSecret(): string | null {
  const secret = env.DISCORD_CLIENT_SECRET;
  return secret && secret.length >= 8 ? secret : null;
}

function configuredSessionSecret(): string | null {
  const secret = env.SESSION_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

function now(): number {
  return Math.floor(Date.now() / 1000);
}

let authTables: Promise<void> | null = null;

export async function ensureAuthTables(): Promise<void> {
  // Production schema changes belong to versioned migrations, not cold requests.
  if (!import.meta.env.DEV) return;
  if (!authTables) {
    authTables = (async () => {
      const database = db();
      await database.prepare(
        `CREATE TABLE IF NOT EXISTS users (
          discord_id text PRIMARY KEY NOT NULL,
          username text NOT NULL,
          global_name text,
          avatar text,
          title text,
          updated_at integer NOT NULL
        )`,
      ).run();
      await database.prepare(
        `CREATE TABLE IF NOT EXISTS claimed_names (
          rsn text PRIMARY KEY NOT NULL,
          display_name text NOT NULL,
          discord_id text NOT NULL,
          claimed_at integer NOT NULL,
          companion_pet text,
          display_piece text,
          equipped text,
          pinned_mark text,
          FOREIGN KEY (discord_id) REFERENCES users(discord_id)
        )`,
      ).run();
      await database.prepare('CREATE INDEX IF NOT EXISTS claimed_names_discord_id ON claimed_names (discord_id)').run();
      await database.prepare("CREATE TABLE IF NOT EXISTS profile_link_owners (rsn TEXT PRIMARY KEY NOT NULL, discord_id TEXT NOT NULL, linked_at INTEGER NOT NULL, saved_flair TEXT NOT NULL DEFAULT '{}')").run();
      await database.prepare('INSERT OR IGNORE INTO profile_link_owners(rsn,discord_id,linked_at) SELECT rsn,discord_id,claimed_at FROM claimed_names').run();
      await database.prepare('CREATE TABLE IF NOT EXISTS public_lookup_limits (id TEXT PRIMARY KEY NOT NULL, window INTEGER NOT NULL, count INTEGER NOT NULL)').run();
      await database.prepare("CREATE TABLE IF NOT EXISTS profile_visibility (rsn TEXT PRIMARY KEY NOT NULL, visibility TEXT NOT NULL DEFAULT 'public' CHECK(visibility IN ('public','private')))").run();
      await database.prepare("CREATE TABLE IF NOT EXISTS profile_presentation (rsn TEXT PRIMARY KEY NOT NULL, staff_badge TEXT, staff_prefix TEXT, title_choice TEXT NOT NULL DEFAULT 'auto', show_donation INTEGER NOT NULL DEFAULT 1 CHECK(show_donation IN (0,1)))").run();
      await database.prepare("CREATE TABLE IF NOT EXISTS profile_appearance (rsn TEXT PRIMARY KEY NOT NULL, body_type TEXT NOT NULL DEFAULT 'auto' CHECK(body_type IN ('auto','male','female')), hair_color TEXT NOT NULL DEFAULT 'brown' CHECK(hair_color IN ('brown','blonde','black','red','grey')));").run();
      await database.prepare("CREATE TABLE IF NOT EXISTS profile_supporter_totals (rsn TEXT PRIMARY KEY NOT NULL, amount_minor INTEGER NOT NULL CHECK(amount_minor>=0), currency TEXT NOT NULL DEFAULT 'USD')").run();
      await database.prepare("CREATE TABLE IF NOT EXISTS supporter_totals (discord_id TEXT PRIMARY KEY NOT NULL, amount_minor INTEGER CHECK(amount_minor>=0), currency TEXT NOT NULL DEFAULT 'USD')").run();
      await database.prepare("CREATE TABLE IF NOT EXISTS profile_options (rsn TEXT PRIMARY KEY NOT NULL, details TEXT NOT NULL DEFAULT '{}', skin TEXT NOT NULL DEFAULT 'default', background TEXT NOT NULL DEFAULT 'none');").run();
      await addColumn(database, 'users', 'title', 'ALTER TABLE users ADD COLUMN title text');
      await addColumn(database, 'claimed_names', 'companion_pet', 'ALTER TABLE claimed_names ADD COLUMN companion_pet text');
      await addColumn(database, 'claimed_names', 'display_piece', 'ALTER TABLE claimed_names ADD COLUMN display_piece text');
      await addColumn(database, 'claimed_names', 'pinned_mark', 'ALTER TABLE claimed_names ADD COLUMN pinned_mark text');
      await addColumn(database, 'claimed_names', 'equipped', 'ALTER TABLE claimed_names ADD COLUMN equipped text');
    })().catch(error => {
      authTables = null;
      throw error;
    });
  }
  return authTables;
}

async function addColumn(database: ReturnType<typeof db>, table: string, column: string, sql: string) {
  const info = await database.prepare(`PRAGMA table_info(${table})`).all<{name: string}>();
  if (!info.results.some(row => row.name === column)) await database.prepare(sql).run();
}

function continueToDiscord(location: string, cookie: string): Response {
  const href = location.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
  const headers = new Headers({'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store'});
  headers.append('Set-Cookie', cookie);
  const body = `<!doctype html><meta charset="utf-8"><title>Continue to Discord</title><meta http-equiv="refresh" content="0;url=${href}"><p>Continuing to Discord…</p><p><a href="${href}">Continue</a></p><script>location.replace(${JSON.stringify(location)})</script>`;
  return new Response(body, {status: 200, headers});
}

function failRedirect(url: URL): Response {
  const headers = new Headers({Location: '/?login=failed', 'Cache-Control': 'no-store'});
  headers.append('Set-Cookie', setCookie(STATE_COOKIE, '', url, 0, '/api/auth'));
  return new Response(null, {status: 302, headers});
}

function text(message: string, status: number): Response {
  return new Response(message, {status, headers: {'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store'}});
}

function html(message: string, status: number): Response {
  const safe = message.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  return new Response(`<!doctype html><meta charset="utf-8"><title>Spooned</title><p>${safe}</p><p><a href="/">Back to Spooned</a></p>`, {
    status,
    headers: {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store'},
  });
}
