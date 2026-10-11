import sharp from 'sharp';
import {ownerRankGif} from './owner-rank-gif.mjs';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
const out='artwork/discord/emojis';await mkdir(out+'/01_main',{recursive:true});await mkdir(out+'/02_more_icons',{recursive:true});
const entries=[
 ['pets','brand/rocky-mascot.webp',true,'smooth'],['clogs','icons/navigation/collection-log-icon.png',true],['quests','icons/navigation/quest-point-icon.png',true],['diaries','icons/navigation/achievement-diaries-icon.png',true],['leaderboard','icons/navigation/stats-icon.png',true],
 ['combat','icons/navigation/combat-achievements.png'],['support','icons/community/support-coins.png'],['supporters','icons/community/supporters-heart.png'],['connections','icons/community/settings-icon.png'],['friends_chat','icons/community/friends-chat.png'],['clan_chat','icons/community/clan-chat.png'],['friends_list','icons/community/friends-list.png'],['skills','icons/navigation/skills-icon.png'],['combat_tasks','icons/navigation/combat-achievements-icon.png'],['collection_log','icons/navigation/collection-log.png'],['max_cape','icons/ranks/max-cape.png'],
 ['rank_helper','icons/ranks/adamant-scimitar.png'],['rank_moderator','icons/ranks/rune-scimitar.png'],['rank_admin','icons/ranks/dragon-scimitar.png'],['rank_gilded','icons/ranks/gilded-scimitar.png'],
 ...['easy','medium','hard','elite','master','grandmaster'].map(t=>['combat_'+t,'icons/tiers/ca-'+t+'.png']),
 ...['novice','intermediate','experienced','master','grandmaster','special'].map(t=>['quest_'+t,'icons/tiers/'+t+'.png']),
];
const manifest=[];
for(const [name,source,main,smooth] of entries){
 const sourceData=await readFile('public/'+source);
 const {data,info}=await sharp(sourceData).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let left=info.width,top=info.height,right=-1,bottom=-1;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>0){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
 if(right<left)throw Error('Empty icon '+source);
 const width=right-left+1,height=bottom-top+1,scale=112/Math.max(width,height),w=Math.round(width*scale),h=Math.round(height*scale);
 const sprite=await sharp(sourceData).extract({left,top,width,height}).resize(w,h,{kernel:smooth||source.startsWith('icons/')?'lanczos3':'nearest'}).png().toBuffer();
 const png=await sharp({create:{width:128,height:128,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:sprite,left:Math.floor((128-w)/2),top:Math.floor((128-h)/2)}]).png().toBuffer();
 if(png.length>=256*1024)throw Error('Icon too large '+name);
 const folder=main?'01_main':'02_more_icons';await writeFile(`${out}/${folder}/${name}.png`,png);manifest.push({name,file:`${folder}/${name}.png`,source,width:128,height:128,bytes:png.length});
}
const ownerGif=await ownerRankGif();
await writeFile(out+'/02_more_icons/rank_owner.gif',ownerGif);
manifest.push({name:'rank_owner',file:'02_more_icons/rank_owner.gif',source:'icons/ranks/dragon-scimitar.png + ui/infernal-lava.png + rank-lava-flow CSS',width:128,height:128,bytes:ownerGif.length,frames:50,durationMs:5000});
await writeFile(out+'/manifest.json',JSON.stringify(manifest,null,2));
await writeFile(out+'/README.txt',`SPOONED OSRS - DISCORD EMOJIS\n\n${manifest.length} named icons (${manifest.length-1} PNG + 1 animated GIF), all 128x128 with transparent backgrounds.\nAll visible artwork fits a centred 112px box with consistent padding. Icons come from the site icon pack (public/icons) and are scaled smoothly.\n\nSTART WITH 01_main:\npets = Rocky, the site mascot\nclogs = collection log\nquests = quest point star\ndiaries = achievement diary icon\nleaderboard = three stat bars\n\n02_more_icons contains the other distinct navigation, chat, quest/combat tier and rank sprites. Home reuses pets; Guides reuses clogs; Overview and Insights reuse leaderboard. These do not need duplicate emoji slots. rank_owner.gif is the website Owner scimitar with lava flowing through its cracks: a seamless four-second animated loop. The complete display-rank set is rank_helper, rank_moderator, rank_admin, rank_owner and rank_gilded.\n\nUnzip, then Server Settings > Emoji > Upload Emoji. Select the PNG and GIF files; filenames are valid Discord emoji names. Use the five main emojis in Server Profile > Traits.\n\nThis is the website UI/navigation pack, not the full pet/boss/item catalogue. No emoji has been uploaded automatically.\n\nSource artwork: the Spooned OSRS icon pack (artwork/ui-skills), AI-redrawn from the site's OSRS interface icons, and the Rocky mascot. RuneScape designs belong to Jagex. See manifest.json for exact source paths.\nDiscord upload guidance: https://support.discord.com/hc/en-us/articles/360041139231-How-to-Add-Emojis-on-Discord\n`);
const cells=await Promise.all(manifest.map(async(m,i)=>{const image=m.file.endsWith('.gif')?await sharp(out+'/'+m.file).png().toBuffer():await readFile(out+'/'+m.file);const x=(i%7)*155,y=Math.floor(i/7)*165;return `<g transform="translate(${x},${y})"><rect x="5" y="5" width="145" height="155" rx="8" fill="#23211c"/><image href="data:image/png;base64,${image.toString('base64')}" x="29" y="12" width="96" height="96"/><text x="77" y="138" text-anchor="middle" fill="#e6e1d2" font-family="sans-serif" font-size="11">${m.name}</text></g>`;}));
await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1085" height="${Math.ceil(manifest.length/7)*165}"><rect width="100%" height="100%" fill="#14130f"/>${cells.join('')}</svg>`)).png().toFile('artwork/discord/emoji-preview.png');
console.log(JSON.stringify({icons:manifest.length,maxBytes:Math.max(...manifest.map(x=>x.bytes)),output:out}));
