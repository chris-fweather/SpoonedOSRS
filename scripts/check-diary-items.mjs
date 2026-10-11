import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const items=read('lib/diary-requirement-items.json'),areas=read('lib/diary-tasks.json').areas;
const requirements=new Set(Object.values(areas).flatMap(a=>a.tiers.flatMap(t=>t.tasks.flatMap(task=>task.requirements.split('\n').map(line=>line.replace(/^\*+\s?/,'').replace(/^Quest\s+/,'').trim())))));
const ids=new Set();
for(const [text,rows] of Object.entries(items)){
 assert.ok(requirements.has(text),'Unmatched requirement: '+text);
 assert.equal(new Set(rows.map(r=>r.id)).size,rows.length,'Duplicate item in '+text);
 for(const item of rows){assert.ok(Number.isInteger(item.id)&&item.id>0);ids.add(item.id);}
}
for(const id of ids){const png=fs.readFileSync('public/items/'+id+'.png');assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.ok(png.readUInt32BE(16)>0&&png.readUInt32BE(20)>0);}
assert.deepEqual(items.Silk.map(i=>i.id),[950]);
assert.deepEqual(items['Rusty sword and 100 coins'].map(i=>i.id),[686,995]);
assert.deepEqual(items['Dramen or Lunar staff to travel to Fairy ring code .'].map(i=>i.id),[772,9084]);
console.log(`Validated ${Object.keys(items).length} diary item requirement lines and ${ids.size} local PNGs; quantities and alternatives remain in the original text.`);
