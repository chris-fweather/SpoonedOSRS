import test from 'node:test';
import assert from 'node:assert/strict';
import {calendarCells,placeLollipops,timelineSpan} from './collection-timeline.ts';

const DAY=86_400_000,NOW=Date.parse('2026-10-07T15:00:00Z'),END=Date.parse('2026-10-08T00:00:00Z');

test('the timeline opens from the first collection to today, or on the past year or 30 days',()=>{
 const first=Date.parse('2024-03-05T12:00:00Z');
 assert.deepEqual(timelineSpan([Date.parse('2025-01-01T12:00:00Z'),first],'all',NOW),{start:first-10*DAY,end:END});
 assert.deepEqual(timelineSpan([first],'year',NOW),{start:END-365*DAY,end:END});
 assert.deepEqual(timelineSpan([first],'month',NOW),{start:END-30*DAY,end:END});
 // A single recent collection still gets at least a month of room.
 assert.deepEqual(timelineSpan([END-2*DAY],'all',NOW),{start:END-30*DAY,end:END});
});

test('calendar cells cover the view, clipped at both ends, with stable shading indexes',()=>{
 const start=Date.parse('2024-11-20T00:00:00Z'),end=Date.parse('2025-02-10T00:00:00Z');
 const months=calendarCells(start,end,'month');
 assert.deepEqual(months.map(c=>[c.date.getUTCFullYear(),c.date.getUTCMonth()]),[[2024,10],[2024,11],[2025,0],[2025,1]]);
 assert.equal(months[0].start,start);
 assert.equal(months.at(-1)!.end,end);
 assert.equal(months[1].index-months[0].index,1);
 assert.deepEqual(calendarCells(start,end,'year').map(c=>c.date.getUTCFullYear()),[2024,2025]);
 const days=calendarCells(start,start+3*DAY,'day');
 assert.deepEqual(days.map(c=>c.date.getUTCDate()),[20,21,22]);
});

test('lollipops stack on free levels, then gather into the nearest head',()=>{
 const items=[0,10,20,30,40,200].map(time=>({time}));
 const heads=placeLollipops(items,t=>t,34,3);
 assert.deepEqual(heads.map(h=>[h.x,h.level,h.items.length]),[[0,0,1],[10,1,1],[20,2,2],[40,0,1],[200,0,1]]);
});
