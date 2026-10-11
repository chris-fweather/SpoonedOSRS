import {beginDiscordLogin} from '@/lib/auth';

export function GET(request: Request) {
  return beginDiscordLogin(request);
}
