import {HttpError, logoutResponse} from '@/lib/auth';
import {publicMessage} from '@/lib/request-body';

export function POST(request: Request) {
  try {
    return logoutResponse(request);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 400;
    return Response.json({error: publicMessage(error, 'Could not log out.')}, {status});
  }
}
