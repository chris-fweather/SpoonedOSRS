import test from 'node:test';
import assert from 'node:assert/strict';
import {initial} from './model.ts';
import {oddsCurve, petChartRecord} from './odds-chart.ts';

test('compact and full charts contain the exact 775 reward-search point, with matching odds', () => {
  for (const steps of [40,60]) {
    const model = oddsCurve(1/4000,775,false,steps);
    const point = model.curve.find(p => p.a === 775)!;
    assert.ok(point);
    assert.equal(point.c,model.chance);
    assert.equal((point.c*100).toFixed(1),'17.6');
    assert.ok(model.curve.every(p => Number.isInteger(p.a)));
    assert.equal(new Set(model.curve.map(p => p.a)).size,model.curve.length);
    const updated=oddsCurve(1/4000,1200,false,steps);
    assert.ok(updated.curve.some(p=>p.a===1200));
    assert.ok(updated.chance!>model.chance!);
  }
});
test('graphs use obtained effort first, current progress only when acquisition is unknown, and do not cross units', () => {
  const p=structuredClone(initial.pets.find(p=>p.name==='Abyssal protector')!);
  p.methods=[{name:'Abyssal protector',unit:'rewards',kc:1800,rate:4000,kph:null,activity:null,source:'Wiki'}];
  Object.assign(p,{obtained:true,obtainedCount:775,obtainedUnit:'rewards',obtainedMethod:'Abyssal protector'});
  assert.equal(petChartRecord(p).method?.kc,775);
  assert.equal(petChartRecord(p).label,'Obtained');
  p.obtainedCount=null;
  assert.equal(petChartRecord(p).method?.kc,1800);
  assert.equal(petChartRecord(p).label,'Current progress');
  p.obtainedCount=775;p.obtainedUnit='games';
  assert.equal(petChartRecord(p).method?.kc,null);
  p.obtained=false;
  assert.equal(petChartRecord(p).method?.kc,1800);
});
test('unknown counts have no marker; zero, fractional XP and counts beyond the usual domain remain exact', () => {
  assert.equal(oddsCurve(1/4000,null).chance,null);
  assert.equal(oddsCurve(1/4000,0).chance,0);
  const xp=oddsCurve(1/25000000,6517253.5,true);
  assert.ok(xp.curve.some(p=>p.a===6517253.5));
  const far=oddsCurve(1/4000,40000);
  assert.ok(far.max>40000);
  assert.ok(far.curve.some(p=>p.a===40000));
  assert.deepEqual(oddsCurve(1,1).curve,[{a:0,c:0},{a:1,c:1}]);
});
