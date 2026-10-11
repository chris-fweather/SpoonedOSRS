import test from 'node:test';
import assert from 'node:assert/strict';
import {securityHeaders} from './security-headers.ts';

test('HTML receives framing and content safeguards without changing response data',async()=>{
 const response=securityHeaders(new Response('<p>Hello</p>',{status:201,headers:{'Content-Type':'text/html; charset=utf-8','Set-Cookie':'fixture=1; HttpOnly','Cache-Control':'no-store'}}));
 assert.equal(response.status,201);assert.equal(await response.text(),'<p>Hello</p>');
 assert.equal(response.headers.get('Set-Cookie'),'fixture=1; HttpOnly');
 assert.equal(response.headers.get('Cache-Control'),'no-store');
 assert.equal(response.headers.get('X-Frame-Options'),'SAMEORIGIN');
 assert.match(response.headers.get('Content-Security-Policy')!,/frame-ancestors 'self'/);
 assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff');
});
test('existing stricter policies survive and JSON is not treated as HTML',()=>{
 const html=securityHeaders(new Response('',{headers:{'Content-Type':'text/html','Content-Security-Policy':"default-src 'none'",'X-Frame-Options':'DENY'}}));
 assert.equal(html.headers.get('Content-Security-Policy'),"default-src 'none'");assert.equal(html.headers.get('X-Frame-Options'),'DENY');
 const json=securityHeaders(Response.json({ok:true}));assert.equal(json.headers.has('Content-Security-Policy'),false);
 assert.equal(json.headers.get('Referrer-Policy'),'strict-origin-when-cross-origin');
 assert.equal(json.headers.get('Strict-Transport-Security'),'max-age=15552000');assert.equal(html.headers.get('Strict-Transport-Security'),'max-age=15552000');
});
