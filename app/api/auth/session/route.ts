import {sessionPayload} from '@/lib/auth';

export function GET(request: Request) {
  return sessionPayload(request);
}
