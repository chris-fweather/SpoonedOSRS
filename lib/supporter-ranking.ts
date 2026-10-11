/** Compute public positions on the server before donation amounts are redacted. */
export function supporterPositions(rows: {name:string; amountMinor:number|null; currency:string}[]): Map<string,number> {
 const positions=new Map<string,number>(),counts=new Map<string,number>();
 const known=rows.filter(r=>r.amountMinor!==null&&Number.isFinite(r.amountMinor)&&r.amountMinor>=0)
  .sort((a,b)=>a.currency.localeCompare(b.currency)||b.amountMinor!-a.amountMinor!||a.name.localeCompare(b.name));
 for(const row of known){const rank=(counts.get(row.currency)??0)+1;counts.set(row.currency,rank);positions.set(row.name,rank);}
 return positions;
}
