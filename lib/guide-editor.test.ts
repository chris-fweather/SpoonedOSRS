import assert from 'node:assert/strict';
import test from 'node:test';
import {existsSync,readFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
import {emptyGuide,parseGuide,guideItems,guideItemChoices,guideItemImage,guideSlotChoices,searchGuideItems,guideInline,guidePlainText,GUIDE_TEXT_STYLES} from './guides.ts';
import {GUIDE_EMOJIS} from './guide-emojis.ts';
import {guideTopics,guideTopicImage} from './guide-topics.ts';
import {EQUIP_SLOTS,wearables} from './flair.ts';
const file=(path:string)=>existsSync('public'+path);
const valid=()=>({...emptyGuide(),title:'Nex guide',activity:'Nex',summary:'A sample inventory and equipment setup.',strategy:'Use this strategy with your preferred combat setup.'});

test('every item a guide author can pick resolves to an existing official icon',()=>{
 const missing=guideItemChoices.filter(([id])=>{const image=guideItemImage(id);return !image||!file(image);});
 assert.deepEqual(missing,[]);
 for(const slot of EQUIP_SLOTS){const choices=guideSlotChoices(slot);assert.ok(choices.length>0,slot);assert.ok(choices.every(([id])=>wearables.items[id].slot===slot&&file(guideItemImage(id)!)),slot);}
 // Saved guides may hold any known id: each one either has an icon file or is marked as having none.
 const broken=Object.keys(guideItems).filter(id=>{const image=guideItemImage(id);return image!==null&&!file(image);});
 assert.deepEqual(broken,[]);
});
test('Torva, damaged and restored, shows its own icon',()=>{
 for(const id of ['26376','26378','26380','26382','26384','26386']){assert.equal(guideItemImage(id),`/items/${id}.png`);assert.ok(file(`/items/${id}.png`));}
 const [helm]=searchGuideItems('torva full helm',guideSlotChoices('head'));assert.deepEqual(helm,['26382','Torva full helm']);
 // The same-named unobtainable copy is not offered twice, and still renders if a saved guide uses it.
 assert.equal(guideSlotChoices('head').filter(([,name])=>name==='Torva full helm').length,1);assert.equal(guideItemImage('30302'),'/items/26382.png');
 assert.ok(searchGuideItems('torva').some(([id])=>id==='26376'));
});
test('the item catalogue covers supplies as well as gear',()=>{
 for(const name of ['Super combat potion(4)','Saradomin brew(4)','Prayer potion(4)','Shark','Rune pouch','Looting bag','Stamina potion(4)']){const [hit]=searchGuideItems(name);assert.equal(hit?.[1],name);}
 const g=valid();g.inventory[0]=searchGuideItems('Saradomin brew(4)')[0][0];g.requiredItems=[{id:searchGuideItems('Rune pouch')[0][0],quantity:1}];assert.doesNotThrow(()=>parseGuide(g));
 const names=guideItemChoices.map(([,name])=>name);assert.deepEqual(names,[...names].sort((a,b)=>a.localeCompare(b)));
});
test('inline formatting: bold, colours and site emojis, everything else stays text',()=>{
 assert.deepEqual(guideInline('Use {gold}**Protect**{/gold} :quests: now'),['Use ',{kind:'tone',tone:'gold',children:[{kind:'bold',children:['Protect']}]},' ',{kind:'emoji',name:'quests'},' now']);
 assert.deepEqual(guideInline('{green}a{orange}b{/orange}c{/green}'),[{kind:'tone',tone:'green',children:['a',{kind:'tone',tone:'orange',children:['b']},'c']}]);
 assert.deepEqual(guideInline('{gold}open :nope: {/green} 10:30'),['{gold}open :nope: {/green} 10:30']);
 assert.deepEqual(guideInline('{red}x{/red} <b>y</b>'),['{red}x{/red} <b>y</b>']);
 assert.equal(guidePlainText('{gold}Phase **one**{/gold} :pets:'),'Phase one ');
});
test('numbered lists are a supported text style',()=>{
 assert.deepEqual([...GUIDE_TEXT_STYLES],['body','heading','subheading','list','numbered']);
 const g={...valid(),blocks:[{id:'steps',kind:'text',text:'Enter\n{gold}Kill{/gold}',style:'numbered',tone:'default'}]};
 assert.equal(parseGuide(g).blocks?.[0].kind==='text'&&parseGuide(g).blocks?.[0].style,'numbered');
 assert.throws(()=>parseGuide({...g,blocks:[{...g.blocks[0],style:'ordered'}]}));
});
test('guide emojis are the site emoji set and every image exists',()=>{
 const manifest=JSON.parse(readFileSync('artwork/discord/emojis/manifest.json','utf8')) as {name:string;source:string}[];
 const pack=Object.fromEntries(manifest.filter(m=>m.name!=='rank_owner').map(m=>[m.name,'/'+m.source]));
 assert.deepEqual(GUIDE_EMOJIS,pack);
 assert.ok(Object.values(GUIDE_EMOJIS).every(file));
 // Rocky is the site mascot from the nav bar, not the in-game pet sprite.
 assert.equal(GUIDE_EMOJIS.pets,'/brand/rocky-mascot.webp');
});
test('retired emojis in saved guides stay plain text, never a broken image',()=>{
 for(const name of ['crossed_swords','join_chat','quest_list']){
  assert.ok(!Object.hasOwn(GUIDE_EMOJIS,name),name);
  assert.deepEqual(guideInline(`Bring :${name}: and :pets:`),[`Bring :${name}: and `,{kind:'emoji',name:'pets'}]);
 }
 assert.equal(guidePlainText('Fight :crossed_swords:'),'Fight :crossed_swords:');
});
test('every worn slot has the game\'s 32x32 transparent slot silhouette',()=>{
 for(const slot of EQUIP_SLOTS){
  const png=readFileSync(`public/ui/slots/${slot}.png`);
  // IHDR: width, height, bit depth 8, colour type 6 (RGBA).
  assert.deepEqual([png.readUInt32BE(16),png.readUInt32BE(20),png[24],png[25]],[32,32,8,6],slot);
  // Cache sprites are an outline on transparency; the old inverted copies filled the square with black.
  const chunks:Buffer[]=[];for(let at=8;at<png.length;){const size=png.readUInt32BE(at);if(png.toString('latin1',at+4,at+8)==='IDAT')chunks.push(png.subarray(at+8,at+8+size));at+=size+12;}
  const raw=inflateSync(Buffer.concat(chunks));let visible=0,black=0;
  for(let y=0;y<32;y++){assert.equal(raw[y*129],0,slot+' rows are unfiltered');for(let x=0;x<32;x++){const i=y*129+1+x*4;if(raw[i+3]){visible++;if(!raw[i]&&!raw[i+1]&&!raw[i+2])black++;}}}
  assert.ok(visible>20&&visible<400&&black===0,`${slot}: ${visible} visible, ${black} black`);
 }
});
test('new guides pick a boss or activity with its official icon',()=>{
 assert.ok(guideTopics.length>100);assert.ok(guideTopics.every(t=>file(t.image)));
 assert.equal(new Set(guideTopics.map(t=>t.name)).size,guideTopics.length);
 for(const name of ['Nex','Chambers of Xeric','Guardians of the Rift','Slayer'])assert.ok(guideTopicImage(name),name);
 assert.ok(!guideTopics.some(t=>/ points$| - rank$/i.test(t.name)));
});
