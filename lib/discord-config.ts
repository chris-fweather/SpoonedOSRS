/** Public Discord identifiers, compiled in from the deployment configuration
 * (scripts/deployment-config.mjs). Not credentials; kept out of source so copies of this code
 * never point at our Discord application or server. */
declare const __SPOONED_DISCORD__:{applicationId:string;guildId:string;publicKey:string}|undefined;
// Unit tests and Node scripts run without Vite and get inert identifiers.
const discord=typeof __SPOONED_DISCORD__==='undefined'?{applicationId:'100000000000000001',guildId:'100000000000000002',publicKey:'ab'.repeat(32)}:__SPOONED_DISCORD__;
export const DISCORD_APPLICATION_ID=discord.applicationId;
export const DISCORD_GUILD_ID=discord.guildId;
export const DISCORD_PUBLIC_KEY=discord.publicKey;
export const DISCORD_INTERACTIONS_URL='https://spoonedosrs.com/api/discord/interactions';
export const DISCORD_COMMANDS=[
 {name:'profile',description:'Share a public Spooned OSRS player card',type:1,options:[{name:'name',description:'RuneScape name',type:3,required:true,min_length:1,max_length:12}]},
 {name:'leaderboard',description:'Open the Spooned OSRS public leaderboards',type:1},
 {name:'spooned',description:'Community links and bot help',type:1},
];
