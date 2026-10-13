import assert from 'node:assert/strict';
import test from 'node:test';
import {sniffImage,uploadKey,uploadUrl,uploadFile,isUploadUrl,typeOfFile} from './guide-upload-rules.ts';
test('upload type comes from the file bytes, never the name', ()=>{
 assert.equal(sniffImage(new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0])),'image/png');
 assert.equal(sniffImage(new Uint8Array([0xff,0xd8,0xff,0xe0])),'image/jpeg');
 assert.equal(sniffImage(new TextEncoder().encode('GIF89a...')),'image/gif');
 assert.equal(sniffImage(new TextEncoder().encode('RIFF\0\0\0\0WEBPVP8 ')),'image/webp');
 assert.equal(sniffImage(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>')),null);
 assert.equal(sniffImage(new TextEncoder().encode('GIF87b')),null);
});
test('upload addresses round-trip and refuse anything else', ()=>{
 const hash='a'.repeat(64),key=uploadKey(hash,'image/gif'),url=uploadUrl(key);
 assert.equal(key,`guides/${hash}.gif`);assert.ok(isUploadUrl(url));assert.equal(uploadFile(hash+'.gif'),hash+'.gif');assert.equal(typeOfFile(hash+'.jpg'),'image/jpeg');
 for(const bad of ['../x.png','A'.repeat(64)+'.png','a'.repeat(64)+'.svg',''])assert.equal(uploadFile(bad),null);
 assert.equal(isUploadUrl('/api/uploads?f='+'a'.repeat(64)+'.png&x=1'),false);
});
