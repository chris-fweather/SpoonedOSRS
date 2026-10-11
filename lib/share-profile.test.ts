import test from 'node:test';
import assert from 'node:assert/strict';
import {shareProfileDetails} from './share-profile.ts';
import {initial} from './model.ts';
import {emptyEquipped} from './flair.ts';
const flair={companionPet:null,displayPiece:null,equipped:emptyEquipped(),pinnedMark:null,title:null,canEdit:false,donation:{hidden:true,amountMinor:null,currency:'USD'}};
test('share cards omit private metrics and never include donation or notes',()=>{
 const j=structuredClone(initial);j.username='Private';j.restricted=true;j.pets[0].notes='secret';
 const result=shareProfileDetails(j,flair);assert.deepEqual(result.stats,[]);assert.equal(result.status,'Private journal');
 assert.ok(!JSON.stringify(result).includes('secret'));assert.ok(!Object.hasOwn(result,'donation'));
});
test('unsynced and individually hidden collections do not become zero-score share cards',()=>{
 const j=structuredClone(initial);j.pets.forEach(p=>{p.obtained=false;p.source='Public Hiscores';});j.log=null;j.logSyncedAt=null;j.hiscores={skills:[],activities:[]};
 assert.deepEqual(shareProfileDetails(j,flair).stats,[]);
 j.hiscores.skills=[{name:'Overall',level:2277,xp:12345678,rank:100}];
 assert.equal(shareProfileDetails(j,flair).stats[0].value,'2,277');
 j.details={pets:false,log:false,quests:false,diaries:false,combat:false,skills:false,petRecords:false};
 assert.deepEqual(shareProfileDetails(j,flair).stats,[]);
});
