export const APEX_ORIGIN = 'https://spoonedosrs.com';
export const LOCAL_ORIGIN = 'http://127.0.0.1:5173';
export const APEX_REDIRECT = `${APEX_ORIGIN}/api/auth/discord/callback`;
export const LOCAL_REDIRECT = `${LOCAL_ORIGIN}/api/auth/discord/callback`;
export const SESSION_COOKIE = 'spooned_session';
export const STATE_COOKIE = 'spooned_oauth';
export const SESSION_SECONDS = 60 * 60 * 24 * 30;
export const STATE_SECONDS = 60 * 10;
export const IDENTIFY_SCOPE = 'identify';

export type LoginHost = 'apex' | 'www' | 'local' | 'reject';

export type SessionUser = {
  id: string;
  username: string;
  globalName: string | null;
  avatar: string | null;
  exp: number;
};

export function loginHost(url: URL): LoginHost {
  if (url.protocol === 'https:' && url.hostname === 'spoonedosrs.com') return 'apex';
  if (url.protocol === 'https:' && url.hostname === 'www.spoonedosrs.com') return 'www';
  if (url.protocol === 'http:' && url.hostname === '127.0.0.1' && url.port === '5173') return 'local';
  return 'reject';
}

export function redirectUriFor(host: LoginHost): string | null {
  if (host === 'local') return LOCAL_REDIRECT;
  if (host === 'apex') return APEX_REDIRECT;
  return null;
}

export function cookieAttributes(url: URL, maxAge: number, path: string): string {
  const parts = ['HttpOnly', `Path=${path}`, 'SameSite=Lax', `Max-Age=${maxAge}`];
  if (url.protocol === 'https:') parts.push('Secure');
  const host = loginHost(url);
  if (host === 'apex' || host === 'www') parts.push('Domain=spoonedosrs.com');
  return parts.join('; ');
}

export function setCookie(name: string, value: string, url: URL, maxAge: number, path: string): string {
  return `${name}=${value}; ${cookieAttributes(url, maxAge, path)}`;
}

export function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return null;
}

export function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

export async function codeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return bytesToBase64Url(new Uint8Array(digest));
}

export function discordAuthorizeUrl(input: {clientId: string; redirectUri: string; state: string; challenge: string}): string {
  const params = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    response_type: 'code',
    scope: IDENTIFY_SCOPE,
    state: input.state,
    code_challenge: input.challenge,
    code_challenge_method: 'S256',
  });
  return `https://discord.com/oauth2/authorize?${params}`;
}

export function discordAvatarUrl(id: string, avatar: string | null): string {
  if (avatar) {
    const ext = avatar.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${id}/${avatar}.${ext}`;
  }
  const index = Number((BigInt(id) >> BigInt(22)) % BigInt(6));
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}

export async function seal(secret: string, data: unknown): Promise<string> {
  const payload = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(data)));
  const sig = await sign(secret, payload);
  return `${payload}.${sig}`;
}

export async function open<T>(secret: string, token: string): Promise<T | null> {
  const dot = token.indexOf('.');
  if (dot <= 0 || dot !== token.lastIndexOf('.')) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await sign(secret, payload);
  if (!safeEqual(sig, expected)) return null;
  try {
    return JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload))) as T;
  } catch {
    return null;
  }
}

export function validSession(data: unknown, now = Math.floor(Date.now() / 1000)): SessionUser | null {
  if (!data || typeof data !== 'object') return null;
  const session = data as Partial<SessionUser>;
  if (typeof session.id !== 'string' || !/^\d{5,32}$/.test(session.id)) return null;
  if (!displayText(session.username)) return null;
  if (!(session.globalName === null || displayText(session.globalName))) return null;
  if (!(session.avatar === null || (typeof session.avatar === 'string' && /^[A-Za-z0-9_]{2,64}$/.test(session.avatar)))) return null;
  if (typeof session.exp !== 'number' || !Number.isFinite(session.exp) || session.exp < now) return null;
  return {
    id: session.id,
    username: session.username,
    globalName: session.globalName ?? null,
    avatar: session.avatar ?? null,
    exp: session.exp,
  };
}

function displayText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 32 && !/[\u0000-\u001f]/.test(value);
}

async function sign(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    {name: 'HMAC', hash: 'SHA-256'},
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return bytesToBase64Url(new Uint8Array(sig));
}

function safeEqual(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  if (left.byteLength !== right.byteLength) return false;
  const timingSafeEqual = (crypto.subtle as {timingSafeEqual?: (left: Uint8Array, right: Uint8Array) => boolean}).timingSafeEqual;
  if (typeof timingSafeEqual === 'function') return timingSafeEqual.call(crypto.subtle, left, right);
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left[i] ^ right[i];
  return diff === 0;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  const pad = value.length % 4 === 0 ? '' : '='.repeat(4 - (value.length % 4));
  const binary = atob(value.replaceAll('-', '+').replaceAll('_', '/') + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
