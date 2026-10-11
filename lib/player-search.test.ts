import assert from 'node:assert/strict';
import test from 'node:test';
import {playerSuggestions, type PlayerSuggestion} from './player-search.ts';

const staff = {role:'owner', prefix:'Sir'} as const;
test('exact names beat staff and cosmetic titles do not match an RSN', () => {
  const rows:PlayerSuggestion[] = [{name:'Obifloat Two',staff}, {name:'Obifloat'}, {name:'Somebody',staff,title:'the Obifloat'}];
  assert.deepEqual(playerSuggestions(rows, 'obifloat').map(p => p.name), ['Obifloat','Obifloat Two']);
  assert.deepEqual(playerSuggestions(rows, 'Sir'), []);
});
test('staff only breaks a tie in name relevance; direct prefix beats staff substring', () => {
  const rows:PlayerSuggestion[] = [{name:'Xobifloat',staff}, {name:'Obi B'}, {name:'Obi A'}, {name:'Obi C',staff}];
  assert.deepEqual(playerSuggestions(rows, 'obi').map(p => p.name), ['Obi C','Obi A','Obi B','Xobifloat']);
});
test('search merges saved and claimed names, preserving staff without duplicate suggestions', () => {
  const result = playerSuggestions([{name:'Some_Name'}, {name:'some name',staff}], ' SOME_NAME ');
  assert.equal(result.length,1);
  assert.equal(result[0].staff?.role,'owner');
  assert.deepEqual(playerSuggestions([{name:'Test'}],''),[]);
});
