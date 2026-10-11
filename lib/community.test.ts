import assert from 'node:assert/strict';
import test from 'node:test';
import {journalStats, metricAverage, metricValue, rankedPlayers, rankedSupporters, communityPage, comparisonSeries, communityDistribution} from './community.ts';
import {badgeCatalogue, assertFlair, DONATOR_TITLE} from './flair.ts';
import type {Journal} from './model.ts';
const base = {username:'Tester',pets:[],hiscores:{skills:[],activities:[]},log:null,statsSyncedAt:null,logSyncedAt:null,revision:0} as Journal;
test('filtering a leaderboard preserves global ranks and never promotes staff', () => {
  const rows = [{name:'First',title:null,pets:20,log:30}, {name:'Owner',title:null,pets:3,log:30,staff:{role:'owner',prefix:'Sir'} as const}, {name:'Unknown',title:null,pets:0,log:0,hasJournal:false}];
  assert.equal(rankedPlayers(rows,'pets','Owner')[0].rank,2);
  assert.equal(rankedPlayers(rows,'pets')[0].row.name,'First');
  assert.equal(rankedPlayers(rows,'pets','Unknown')[0].rank,null);
});
test('missing snapshots stay unknown and do not depress community averages', () => {
  const stats = journalStats(base);
  assert.equal(stats.questPoints, null);
  assert.equal(stats.xp, null);
  const rows = [{name:'A',title:null,pets:10,log:0,stats:{...stats,petsKnown:true}}, {name:'B',title:null,pets:0,log:0,hasJournal:false}];
  assert.deepEqual(metricAverage(rows, 'pets'), {count:1,value:10});
  assert.deepEqual(metricAverage(rows, 'log'), {count:0,value:null});
  assert.equal(metricValue(rows[1], 'pets'), null);
});
test('quest and diary completion badges require a nonempty synced catalogue', () => {
  assert.equal(badgeCatalogue(base).some(b => b.unlocked), false);
  assert.throws(() => assertFlair(base,{pinnedMark:'quest-cape'}), /earned/);
  const j = {...base, profile:{quests:[{id:1,name:'Q',state:'finished',points:2,type:'quest'}],diaries:[{areaId:1,area:'Test',tiers:[{tier:'Easy',completed:2,total:3}]}],combat:[{id:1,name:'Easy',completed:100,total:200}],syncedAt:'2026-10-05'}};
  const badges=badgeCatalogue(j);
  assert.equal(badges.find(b => b.id==='quest-cape')?.unlocked,true);
  assert.equal(badges.find(b => b.id==='diary-cape')?.unlocked,false);
  assert.equal(assertFlair(j,{pinnedMark:'combat-100'}).pinnedMark,'combat-100');
  assert.throws(() => assertFlair(j,{pinnedMark:'combat-250'}), /earned/);
});

test('home pages show five entries and stop at 25 while the leaderboard uses 20',()=>{
 const rows=Array.from({length:53},(_,i)=>i+1);
 assert.deepEqual(communityPage(rows,0,5,25).items,[1,2,3,4,5]);
 const last=communityPage(rows,100,5,25);
 assert.deepEqual(last.items,[21,22,23,24,25]);assert.equal(last.pages,5);assert.equal(last.total,25);
 assert.deepEqual(communityPage(rows,1).items,rows.slice(20,40));
 assert.equal(communityPage([],0,5,25).total,0);
 assert.equal(communityPage(rows.slice(0,2),4,5,25).current,0);
});
test('legacy supporter rows rank visible amounts and never compare unlike currencies',()=>{
 const donor=(name:string,amountMinor:number|null,hidden=false,currency='USD')=>({name,title:DONATOR_TITLE,pets:0,log:0,donation:{amountMinor,hidden,currency}});
 const rows=[donor('Unknown',null),donor('Small',100),donor('Hidden',999999,true),donor('Big',500),donor('Zero',0),donor('Euro',10000,false,'EUR')];
 const list=rankedSupporters(rows);
 assert.deepEqual(list.map(r=>r.row.name),['Big','Small','Zero','Hidden','Unknown']);
 assert.deepEqual(list.map(r=>r.rank),[1,2,3,null,null]);
 assert.equal(rankedSupporters(rows,'EUR')[0].row.name,'Euro');
});
test('comparison retains an independent average alongside either one or two players',()=>{
 const rows=[{name:'A',title:null,pets:10,log:0},{name:'B',title:null,pets:30,log:0},{name:'Missing',title:null,pets:0,log:0,hasJournal:false}];
 const two=comparisonSeries(rows,'pets',rows[0],rows[1]);
 assert.deepEqual(two.series.map(s=>s.value),[10,30,20]);assert.equal(two.average.count,2);
 assert.deepEqual(comparisonSeries(rows,'pets',rows[0]).series.map(s=>s.value),[10,20]);
 rows.push({name:'New',title:null,pets:50,log:0});
 assert.equal(comparisonSeries(rows,'pets',rows[0],rows[1]).average.value,30);
 assert.ok(two.ceiling>=30);
});

const distributionRow=(pets:number)=>({name:String(pets),title:null,pets,log:0});
test('community spread includes zeros and the maximum once, excludes missing totals',()=>{
 const rows=[...Array.from({length:25},(_,i)=>distributionRow(i)),{...distributionRow(0),hasJournal:false}];
 const d=communityDistribution(rows,'pets');
 assert.equal(d.count,25);assert.equal(d.bins.reduce((n,b)=>n+b.count,0),25);
 assert.equal(d.bins[0].count,5);assert.equal(d.bins.at(-1)?.count,5);
 assert.ok(d.ceiling>24);assert.equal(d.bins.length,5);
});
test('community spread handles absent, zero-only and identical totals without fabricated values',()=>{
 assert.deepEqual(communityDistribution([],'pets'),{count:0,ceiling:1,bins:[]});
 const zeros=communityDistribution(Array.from({length:8},()=>distributionRow(0)),'pets');
 assert.deepEqual(zeros.bins,[{low:0,high:1,count:8}]);
 const same=communityDistribution(Array.from({length:20},()=>distributionRow(71)),'pets');
 assert.equal(same.bins.filter(b=>b.count>0).length,1);assert.equal(same.bins.at(-1)?.count,20);
 assert.equal(communityDistribution([distributionRow(NaN),distributionRow(Infinity)],'pets').count,0);
});


test('Hiscores-only discovery ranks XP but does not invent zero pets',()=>{
 const j={...base,hiscores:{skills:[{name:'Overall',level:2277,xp:300000000,rank:42}],activities:[]},statsSyncedAt:'2026-10-06T01:00:00Z'};
 const row={name:j.username,title:null,pets:0,log:0,hasJournal:true,stats:journalStats(j)};
 assert.equal(metricValue(row,'xp'),300000000);
 assert.equal(metricValue(row,'pets'),null);
 assert.equal(metricValue(row,'log'),null);
 assert.equal(metricValue({...row,stats:journalStats({...j,logSyncedAt:'2026-10-06T01:00:00Z'})},'pets'),0);
});

 test('hidden amounts retain server supporter positions through ordering and pagination',()=>{
 const rows=[{name:'Visible',title:DONATOR_TITLE,pets:0,log:0,supporterRank:2,donation:{amountMinor:1000,hidden:false,currency:'USD'}},
 {name:'Hidden',title:DONATOR_TITLE,pets:0,log:0,supporterRank:1,donation:{amountMinor:null,hidden:true,currency:'USD'}},
 {name:'Unknown',title:DONATOR_TITLE,pets:0,log:0,supporterRank:null,donation:{amountMinor:null,hidden:false,currency:'USD'}}];
 const ranked=rankedSupporters(rows);
 assert.deepEqual(ranked.map(r=>[r.row.name,r.rank]),[['Hidden',1],['Visible',2],['Unknown',null]]);
 assert.equal(communityPage(ranked,0,1).items[0].row.donation.amountMinor,null);
 assert.equal(rankedSupporters(rows,'EUR').length,0);
 });
