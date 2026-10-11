import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {characterPortrait,menuAccount} from './account-menu.ts';
import {SKIN_TONES,HAIR_COLORS} from './appearance.ts';
import {initial} from './model.ts';
test('every allowed body, hair and skin maps to a local character portrait',()=>{for(const body of ['male','female'] as const)for(const hair of HAIR_COLORS)for(const skin of Object.keys(SKIN_TONES) as (keyof typeof SKIN_TONES)[])assert.ok(existsSync('public'+characterPortrait({body,hair,skin}).split('?')[0]));assert.throws(()=>characterPortrait({body:'../secret',hair:'brown'} as any));});
test('account summary returns only compact identity data and respects earned titles',()=>{const journal=structuredClone(initial);journal.username='Sample';journal.pets.forEach(p=>p.obtained=false);const input={name:'Sample',title:null,choice:'pet-collector',mark:null,owner:false,donation:{amountMinor:null,currency:'USD',hidden:true},journal};const result=menuAccount(input);assert.equal(result.achievementTitle,null);assert.deepEqual(Object.keys(result).sort(),['achievementTitle','donation','name','portrait','title']);journal.pets.slice(0,25).forEach(p=>p.obtained=true);assert.equal(menuAccount(input).achievementTitle,'the Pet Collector');});
