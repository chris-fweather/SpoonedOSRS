import {finishDiscordLogin} from '@/lib/auth';

export function GET(request: Request) {
  return finishDiscordLogin(request);
}
