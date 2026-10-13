import {HttpError, logoutEverywhere} from '@/lib/auth';
import {publicMessage} from '@/lib/request-body';

export async function POST(request: Request) {
  try {
    return await logoutEverywhere(request);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 400;
    return Response.json({error: publicMessage(error, 'Could not log out everywhere.')}, {status, headers: {'Cache-Control': 'no-store'}});
  }
}
