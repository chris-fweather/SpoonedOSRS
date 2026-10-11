import catalogue from './release-dates.json';
export function releaseDate(name:string,kind:'pets'|'bosses'):string|null {
 return Object.entries(catalogue[kind]).find(([n])=>n.toLowerCase()===name.toLowerCase())?.[1]??null;
}
export function releaseOrder(kind:'pets'|'bosses'){
 return (a:{name:string},b:{name:string})=>(releaseDate(a.name,kind)??'9999').localeCompare(releaseDate(b.name,kind)??'9999');
}
export function releaseLabel(name:string,kind:'pets'|'bosses'):string|null {
 const date=releaseDate(name,kind);return date?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(date+'T00:00:00Z')):null;
}
