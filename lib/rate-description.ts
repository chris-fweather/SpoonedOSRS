/** Preserve conditional Wiki text; formatting a fraction does not make it a per-kill probability. */
export function rateDescription(raw:string){
 const fraction=/(\d[\d,]*(?:\.\d+)?\s*\/\s*\d[\d,]*(?:\.\d+)?)/g;
 const parts=raw.split(fraction).filter(Boolean).map(text=>({text,fraction:/^\d[\d,]*(?:\.\d+)?\s*\/\s*\d[\d,]*(?:\.\d+)?$/.test(text)}));
 const plain=raw.trim().match(/^(\d[\d,]*(?:\.\d+)?)\s*\/\s*(\d[\d,]*(?:\.\d+)?)$/);
 let explanation:string|null=null;
 if(plain){
  const numerator=Number(plain[1].replaceAll(',','')),denominator=Number(plain[2].replaceAll(',',''));
  if(Number.isFinite(numerator)&&Number.isFinite(denominator)&&numerator>0&&denominator>=numerator)explanation=`${numerator.toLocaleString('en-US')} in ${denominator.toLocaleString('en-US')} (${(numerator/denominator*100).toLocaleString('en-US',{maximumFractionDigits:2})}%) on the listed table. This is a chance, not an item quantity; source conditions determine which roll it describes.`;
 }
 const repeated=raw.trim().match(/^(\d+)\s*×\s*(\d[\d,]*(?:\.\d+)?\s*\/\s*\d[\d,]*(?:\.\d+)?)$/);
 if(!explanation&&repeated&&Number(repeated[1])>0)explanation=`${Number(repeated[1]).toLocaleString('en-US')} rolls are listed, each at ${repeated[2]}. This counts rolls, not items received; the source conditions determine how those rolls apply.`;
 return {parts,explanation};
}
