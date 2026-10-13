import assert from 'node:assert/strict';
import test from 'node:test';
import {
  APEX_REDIRECT,
  cookieAttributes,
  discordAuthorizeUrl,
  IDENTIFY_SCOPE,
  LOCAL_REDIRECT,
  loginHost,
  open,
  redirectUriFor,
  seal,
  validSession,
} from './session.ts';

const secret = 'test-session-secret-at-least-32-chars';

test('classify public and local login hosts', () => {
  assert.equal(loginHost(new URL('https://spoonedosrs.com/api/auth/discord')), 'apex');
  assert.equal(loginHost(new URL('https://www.spoonedosrs.com/api/auth/discord')), 'www');
  assert.equal(loginHost(new URL('http://127.0.0.1:5173/api/auth/discord')), 'local');
  assert.equal(loginHost(new URL('http://spoonedosrs.com/api/auth/discord')), 'reject');
  assert.equal(loginHost(new URL('http://127.0.0.1:8787/api/auth/discord')), 'reject');
  assert.equal(loginHost(new URL('https://example.com/api/auth/discord')), 'reject');
});

test('one production redirect, plus local', () => {
  assert.equal(redirectUriFor('apex'), APEX_REDIRECT);
  assert.equal(redirectUriFor('local'), LOCAL_REDIRECT);
  assert.equal(redirectUriFor('www'), null);
  assert.equal(redirectUriFor('reject'), null);
  assert.equal(APEX_REDIRECT, 'https://spoonedosrs.com/api/auth/discord/callback');
  assert.equal(LOCAL_REDIRECT, 'http://127.0.0.1:5173/api/auth/discord/callback');
});

test('authorize URL asks only for identify', () => {
  const url = new URL(discordAuthorizeUrl({
    clientId: '100000000000000001',
    redirectUri: APEX_REDIRECT,
    state: 'state',
    challenge: 'challenge',
  }));
  assert.equal(url.origin + url.pathname, 'https://discord.com/oauth2/authorize');
  assert.equal(url.searchParams.get('scope'), IDENTIFY_SCOPE);
  assert.equal(url.searchParams.get('response_type'), 'code');
  assert.equal(url.searchParams.get('redirect_uri'), APEX_REDIRECT);
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(url.search.includes('guilds'), false);
  assert.equal(url.search.includes('bot'), false);
  assert.equal(url.search.includes('email'), false);
});

test('production cookie is httpOnly, Secure, and shared by apex and www', () => {
  const apex = cookieAttributes(new URL('https://spoonedosrs.com/'), 60, '/');
  const www = cookieAttributes(new URL('https://www.spoonedosrs.com/'), 60, '/');
  const local = cookieAttributes(new URL('http://127.0.0.1:5173/'), 60, '/');
  for (const value of [apex, www, local]) assert.match(value, /HttpOnly/);
  assert.match(apex, /Secure/);
  assert.match(apex, /Domain=spoonedosrs\.com/);
  assert.match(www, /Domain=spoonedosrs\.com/);
  assert.doesNotMatch(local, /Secure/);
  assert.doesNotMatch(local, /Domain=/);
});

test('sealed session round-trips and rejects tampering', async () => {
  const session = {id: '100000000000000001', username: 'spoon', globalName: 'Spoon', avatar: null, exp: 4_000_000_000};
  const token = await seal(secret, session);
  // A cookie from before Log out everywhere has no version and reads as version 0.
  assert.deepEqual(validSession(await open(secret, token), 1_700_000_000), {...session, v: 0});
  assert.equal(validSession({...session, v: 3}, 1_700_000_000)?.v, 3);
  assert.equal(validSession({...session, v: -1}, 1_700_000_000), null);
  const [payload, sig] = token.split('.');
  assert.equal(await open(secret, `${payload}.${sig.slice(0, -2)}aa`), null);
  assert.equal(await open('another-session-secret-at-least-32', token), null);
  assert.equal(validSession(session, session.exp + 1), null);
});

test('dev rules: production allows everything; dev keeps the owner and Obifloat only',async()=>{
 const {devAllowsAccount,devAllowsProfile}=await import('./environment.ts');
 assert.equal(devAllowsProfile('Snooked',false),true);
 assert.equal(devAllowsProfile(' Obifloat ',true),true);
 assert.equal(devAllowsProfile('Snooked',true),false);
 assert.equal(devAllowsAccount('1',['2'],false),true);
 assert.equal(devAllowsAccount('2',['2','3'],true),true);
 assert.equal(devAllowsAccount('1',['2'],true),false);
});
