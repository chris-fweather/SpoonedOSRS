import assert from 'node:assert/strict';
import test from 'node:test';
import {protectionReasons,canSubmitCase,canReviewCase,validDiscordId} from './moderation-policy';
const low={pets:49,log:499,recordHolder:false,staffOwned:false,unknown:false};
test('protection boundaries include records, staff and unverified progress',()=>{
 assert.deepEqual(protectionReasons(low),[]);
 for(const risk of [{pets:50},{log:500},{recordHolder:true},{staffOwned:true},{unknown:true}])assert.ok(protectionReasons({...low,...risk}).length);
});
test('helpers cannot submit protected cases and moderators cannot approve them',()=>{
 assert.equal(canSubmitCase('helper',true),false);assert.equal(canSubmitCase('helper',false),true);assert.equal(canSubmitCase('moderator',true),true);
 assert.equal(canReviewCase('moderator',true,'a','b','c','d'),false);assert.equal(canReviewCase('moderator',false,'a','b','c','d'),true);
 assert.equal(canReviewCase('admin',true,'a','b','c','d'),true);
 for(const role of ['helper','moderator','admin','owner'] as const)for(const ids of [['a','a','c','d'],['a','b','a','d'],['a','b','c','a']])assert.equal(canReviewCase(role,false,...ids as [string,string,string,string]),false);
});
test('Discord transfers accept bounded snowflake strings, not imprecise numbers',()=>{
 assert.equal(validDiscordId('123456789012345678'),true);
 for(const id of ['someone',123456789012345678,'99999999999999999999','00000000000000000'])assert.equal(validDiscordId(id),false);
});
