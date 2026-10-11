'use client';
import type {Pet} from '@/lib/model';
import {acquisitionEffort,type HuntSegment} from '@/lib/hunt-history';
import {num} from '@/lib/ui';

export function EffortBasis({pet}:{pet:Pet}){
 if(!pet.obtained&&!pet.huntHistory?.length&&pet.recordedHours==null)return null;
 const estimate=acquisitionEffort(pet);
 return <p className="fine calculation-basis">{estimate.range&&<><b>Estimated range: {num(estimate.range[0])}–{num(estimate.range[1])} h.</b> </>}{estimate.basis}</p>;
}
export function HuntHistory({pet,onChange}:{pet:Pet;onChange:(pet:Pet)=>void}){
 const history=pet.huntHistory??[];
 function update(i:number,patch:Partial<HuntSegment>){onChange({...pet,huntHistory:history.map((s,index)=>index===i?{...s,...patch}:s)});}
 return <details className="pet-method-settings"><summary>Historical methods · {history.length} recorded</summary>
  <p className="fine">Split the work done before receiving the pet into separate methods. Counts are the work done in each segment, not cumulative totals. These entries replace the single-method time estimate and stay unchanged when you sync.</p>
  {history.map((s,i)=><fieldset key={i} className="pet-edit-section"><legend>Method {i+1}</legend>
   <div className="pet-edit-fields">
    <label className="field pet-edit-wide">Method<select value={pet.methods.some(m=>m.name===s.method)?s.method:'custom'} onChange={e=>{const m=pet.methods.find(m=>m.name===e.target.value);if(m)update(i,{method:m.name,unit:m.unit,count:null,pace:m.kph,rate:m.rate});else update(i,{method:'Custom method',count:null,pace:null,rate:null});}}>{pet.methods.map((m,index)=><option key={index} value={m.name}>{m.name}</option>)}<option value="custom">Custom method</option></select></label>
    <label className="field">Label<input value={s.method} maxLength={200} onChange={e=>update(i,{method:e.target.value})}/></label>
    <label className="field">Unit<select value={s.unit} onChange={e=>update(i,{unit:e.target.value,count:null,pace:null,rate:null})}>{[...new Set([s.unit,'kills','XP','rolls','actions','runs','raids','rewards','plants','harvests'])].map(unit=><option key={unit}>{unit}</option>)}</select></label>
    <label className="field">{s.unit} during this method<input type="number" min={0} max={1e12} step={s.unit==='XP'?'any':1} value={s.count??''} onChange={e=>update(i,{count:e.target.value===''?null:Number(e.target.value)})}/></label>
    <label className="field">{s.unit} per hour<input type="number" min={0.001} max={1e12} step="any" value={s.pace??''} onChange={e=>update(i,{pace:e.target.value===''?null:Number(e.target.value)})}/></label>
    <label className="field pet-edit-wide">{s.unit==='XP'?'Mean XP per pet (estimate)':'Historical drop rate — 1 in…'}<input type="number" min={1} max={1e12} step="any" value={s.rate??''} onChange={e=>update(i,{rate:e.target.value===''?null:Number(e.target.value)})}/><small>Starts from the selected method’s current assumption. Adjust for your historical level, mode, team size or rate changes. Leave unknown rates blank; time can still be estimated.</small></label>
   </div><button type="button" className="btn ghost sm" onClick={()=>onChange({...pet,huntHistory:history.filter((_,index)=>index!==i)})}>Remove method {i+1}</button>
  </fieldset>)}
  <button type="button" className="btn sm" disabled={history.length>=30} onClick={()=>{const m=pet.methods[pet.plannedMethod??0];onChange({...pet,huntHistory:[...history,{method:m?.name??'Custom method',unit:m?.unit??'kills',count:null,pace:m?.kph??null,rate:m?.rate??null}]});}}>Add historical method</button>
  <EffortBasis pet={pet}/>
 </details>;
}
