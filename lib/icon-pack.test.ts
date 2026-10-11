import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync,readdirSync} from 'node:fs';

const sources=(dir:string):string[]=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?sources(`${dir}/${e.name}`):/\.(tsx?|css|json)$/.test(e.name)?[`${dir}/${e.name}`]:[]);

test('every icon the site names is installed from the icon pack',()=>{
 const named=new Set(['app','lib'].flatMap(sources).flatMap(f=>[...readFileSync(f,'utf8').matchAll(/\/icons\/[a-z-]+\/[a-z0-9-]+\.png/g)].map(m=>m[0])));
 assert.ok(named.size>40);
 for(const path of named)assert.ok(existsSync('public'+path),path);
 const pack=JSON.parse(readFileSync('artwork/ui-skills/manifest.json','utf8')) as {icons:{file:string}[]};
 const retired=new Set(['ranks/crossed-swords.png','ranks/white-scimitar.png']);
 for(const {file} of pack.icons)if(!retired.has(file))assert.ok(existsSync('public/icons/'+file),file);
});

test('skills and account types use the icon pack',()=>{
 const art=JSON.parse(readFileSync('lib/boss-artwork.json','utf8')) as Record<string,string>;
 for(const skill of ['attack','hitpoints','thieving','sailing'])assert.equal(art[skill],`/icons/skills/${skill}.png`);
 for(const mode of ['ironman','hardcore-ironman','ultimate-ironman','group-ironman','hardcore-group-ironman','unranked-group-ironman'])assert.ok(existsSync(`public/icons/account-modes/${mode}.png`),mode);
});
