import {discordInteraction} from '@/lib/discord-interactions';
export async function POST(request:Request){return discordInteraction(request);}
