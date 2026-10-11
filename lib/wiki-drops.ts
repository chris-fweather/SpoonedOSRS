export type WikiCell={text:string;url?:string;fraction?:string};
export type WikiTable={heading:string;headers:string[];rows:WikiCell[][]};
export type WikiDrops={title:string;url:string;revision:number;fetchedAt:string;intro:string;tables:WikiTable[]};
export const wikiUrl=(name:string)=>'https://oldschool.runescape.wiki/w/'+encodeURIComponent(name.replaceAll(' ','_'));
const entities:Record<string,string>={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',times:'×',ndash:'–',mdash:'—',rsquo:'’'};
export function plain(html:string){return html.replace(/<sup\b[\s\S]*?<\/sup>/gi,'').replace(/<[^>]*>/g,' ').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,(_,s:string)=>s[0]==='#'?String.fromCodePoint(Math.min(0x10ffff,parseInt(s.slice(s[1]==='x'?2:1),s[1]==='x'?16:10))):entities[s]??' ').replace(/\s+/g,' ').trim();}
export function parseWiki(title:string,html:string,revision:number):WikiDrops{
 const tables:WikiTable[]=[];
 for(const match of html.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)){
  const raw=match[0];if(!/wikitable|item-drops|drops-table/.test(raw.slice(0,500)))continue;
  const before=html.slice(0,match.index),heads=[...before.matchAll(/<h[2-4]\b[^>]*>[\s\S]*?<\/h[2-4]>/gi)];
  const trail:string[]=[];for(const h of heads){const level=Number(h[0][2])-2;trail[level]=plain(h[0]).replace(/\[ edit.*$/i,'').trim();trail.length=level+1;}
  const heading=trail.filter(Boolean).join(' › ')||'Acquisition';
  if(/Changes|Gallery|Dialogue|Trivia|History|Versions|Variants|Combat stats/i.test(heading))continue;
  const rows=[...raw.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(r=>[...r[1].matchAll(/<(td|th)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map(c=>{
   const href=c[2].match(/<a[^>]+href="(\/w\/[^"#][^"]*)"/i)?.[1];
   return {text:plain(c[2]),...(href?{url:'https://oldschool.runescape.wiki'+href.replaceAll('&amp;','&')}:{ }),...(c[2].match(/data-drop-fraction="([^"]+)"/)?{fraction:plain(c[2].match(/data-drop-fraction="([^"]+)"/)![1])}:{})};
  }));
  if(rows.length<2)continue;const headers=rows[0].map(c=>c.text);
  if(headers.some(h=>/Emotes|STASH/.test(h)))continue;
  if(!/rarity|chance|rate|source|cost|points|requirement/i.test(headers.join(' ')))continue;
  const keep=headers.map((h,i)=>/league/i.test(h)?-1:i).filter(i=>i>=0);
  tables.push({heading,headers:keep.map(i=>headers[i]),rows:rows.slice(1,501).filter(r=>r.length>=headers.length).map(r=>keep.map(i=>r[i]))});
 }
 const first=[...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(x=>plain(x[1])).find(t=>t.length>70&&!/^This article|^For |^You can/.test(t))??'';
 tables.sort((a,b)=>Number(b.headers[0]==='Source')-Number(a.headers[0]==='Source'));
 return {title,url:wikiUrl(title),revision,fetchedAt:new Date().toISOString(),intro:first.slice(0,430),tables};
}
export function rollProbability(fraction:string):number|null{
 const s=fraction.replaceAll(',','').trim();if(/^always$/i.test(s))return 1;
 const m=s.match(/^(?:(\d+)\s*×\s*)?(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);if(!m)return null;
 const p=Number(m[2])/Number(m[3]);if(!(p>0&&p<=1))return null;return -Math.expm1(Number(m[1]??1)*Math.log1p(-p));
}
