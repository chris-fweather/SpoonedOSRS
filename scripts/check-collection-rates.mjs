/** Audit all collection-log references; writes a reviewable coverage report. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {collectionItemRates} from '../lib/collection-rates.ts';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const names=read('lib/item-names.json'),refs=read('lib/collection-acquisition.json');
const ids=Object.keys(names),rates=collectionItemRates([],ids,names,refs);
assert.equal(Object.keys(refs).length,ids.length,'Every exact item ID must have a reference');
const counts={},unresolved=[],variable=[];
for(const id of ids){
 const doc=refs[id],r=rates[id];assert.ok(doc&&doc.revision>0&&Number.isFinite(Date.parse(doc.fetchedAt)),id+' provenance');
 assert.equal(new URL(doc.url).hostname,'oldschool.runescape.wiki');
 assert.ok(r?.r,id+' display');assert.ok(r.p==null,'Global sources cannot imply activity KC');
 counts[r.status]=(counts[r.status]??0)+1;
 if(r.status==='unresolved')unresolved.push({id,name:names[id],url:doc.url});
 if(r.status==='variable')variable.push({id,name:names[id],rates:r.all,url:doc.url});
}
const report={checkedAt:new Date().toISOString(),items:ids.length,counts,notes:['Numeric means at least one source has an exact numerical probability; it does not mean per kill.','Variable, conditional, purchase, and completion rewards must not be assigned a made-up fixed probability.','Unresolved references remain explicitly unverified in the UI.'],unresolved,variable};
fs.writeFileSync('lib/collection-rate-audit.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({items:ids.length,counts,unresolved},null,2));
