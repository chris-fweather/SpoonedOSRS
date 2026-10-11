export const keys=['helper','moderator','admin','owner','supporter'];
export function parseRoleMap(text,guildId){
 const map=JSON.parse(text);if(!map||Array.isArray(map)||typeof map!=='object')throw Error('Role map must be an object.');
 for(const [key,id] of Object.entries(map))if(!keys.includes(key)||typeof id!=='string'||!/^\d{17,20}$/.test(id)||id===guildId)throw Error('Invalid role mapping.');
 if(new Set(Object.values(map)).size!==Object.keys(map).length)throw Error('Map each website entitlement to a distinct Discord role.');
 return map;
}
export function roleDiff(map,desired,current){
 const managed=new Set(Object.values(map)),wanted=new Set(desired.filter(k=>keys.includes(k)).map(k=>map[k]).filter(Boolean));
 return {remove:[...current].filter(id=>managed.has(id)&&!wanted.has(id)),add:[...wanted].filter(id=>!current.includes(id))};
}
export function validateEntitlement(row){
 if(!row||!/^\d{17,20}$/.test(row.id)||!Array.isArray(row.roles)||row.roles.some(r=>!keys.includes(r))||row.roles.length>5||row.nickname!==null&&(typeof row.nickname!=='string'||!/^[A-Za-z0-9 _-]{1,12}$/.test(row.nickname)))throw Error('Invalid entitlement response.');
 return row;
}
