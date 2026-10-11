import test from 'node:test';
import assert from 'node:assert/strict';
import {validateRelease} from './check-release.mjs';
const fixture=()=>({release:{version:'0.1.0-rc.1',channel:'candidate',notes:'releases/0.1.0-rc.1.md',minimumMigration:'0021_provider_controls.sql'},pkg:{version:'0.1.0-rc.1'},lock:{version:'0.1.0-rc.1',packages:{'':{version:'0.1.0-rc.1'}}},changelog:'## 0.1.0-rc.1 — 2026-10-07',notes:'# Spooned OSRS 0.1.0-rc.1\n'+('Release notes. '.repeat(40)),migrations:['0021_provider_controls.sql']});
test('candidate metadata is valid but cannot deploy to production',()=>{assert.ok(validateRelease(fixture()));assert.throws(()=>validateRelease({...fixture(),production:true}),/stable or beta/);});
test('beta releases deploy to production and must declare the beta channel',()=>{
 const beta=JSON.parse(JSON.stringify(fixture()).replaceAll('0.1.0-rc.1','0.1.0-beta.1'));beta.release.channel='beta';
 assert.ok(validateRelease({...beta,production:true,tag:'v0.1.0-beta.1'}));
 assert.throws(()=>validateRelease({...beta,release:{...beta.release,channel:'candidate'}}),/channel/);
 assert.throws(()=>validateRelease({...fixture(),release:{...fixture().release,channel:'beta'}}),/channel/);
});
test('release cannot publish with mismatched tag, package or schema',()=>{
 assert.throws(()=>validateRelease({...fixture(),tag:'v0.1.0'}),/tag/);
 assert.throws(()=>validateRelease({...fixture(),pkg:{version:'0.2.0'}}),/versions/);
 assert.throws(()=>validateRelease({...fixture(),migrations:['0022_future.sql']}),/schema/);
});
test('notes cannot escape release directory and stable releases pass the deployment gate',()=>{
 const data=fixture();data.release.notes='../private.md';assert.throws(()=>validateRelease(data),/notes/);
 const stable=JSON.parse(JSON.stringify(fixture()).replaceAll('0.1.0-rc.1','0.1.0'));stable.release.channel='stable';
 assert.ok(validateRelease({...stable,production:true,tag:'v0.1.0'}));
});


test('release notes accept Windows and Unix line endings',()=>{
 const data=fixture();data.notes=data.notes.replaceAll('\n','\r\n');
 assert.ok(validateRelease(data));
});
