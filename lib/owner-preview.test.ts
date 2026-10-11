import assert from 'node:assert/strict';
import test from 'node:test';
import {accountIdentity, OWNER_DISCORD_IDS} from './account-identity.ts';
const [OWNER_DISCORD_ID, OWNER_ALT_DISCORD_ID] = OWNER_DISCORD_IDS;
import {localPreviewAllowed} from './preview-policy.ts';

test('only the explicitly linked owner identities share an account', () => {
  assert.equal(accountIdentity(OWNER_ALT_DISCORD_ID), OWNER_DISCORD_ID);
  assert.equal(accountIdentity(OWNER_DISCORD_ID), OWNER_DISCORD_ID);
  assert.equal(accountIdentity('123456789012345678'), '123456789012345678');
  assert.notEqual(accountIdentity('obifloat'), OWNER_DISCORD_ID);
});
test('local owner preview cannot be enabled in production or on a public host', () => {
  for (const host of ['http://localhost:5174', 'http://127.0.0.1:5174']) {
    assert.equal(localPreviewAllowed(true, '1', new URL(host)), true);
    assert.equal(localPreviewAllowed(false, '1', new URL(host)), false);
    assert.equal(localPreviewAllowed(true, undefined, new URL(host)), false);
  }
  for (const host of ['https://spoonedosrs.com', 'http://evil.test', 'http://localhost.evil.test']) {
    assert.equal(localPreviewAllowed(true, '1', new URL(host)), false);
  }
});
