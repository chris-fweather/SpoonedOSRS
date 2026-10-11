import {HttpError} from '@/lib/auth';
import {readReputation, writeReputation} from '@/lib/reputation-store';

const headers = {'Cache-Control':'no-store'};
async function handle(request: Request) {
  try {
    const rep = request.method === 'GET' ? await readReputation(request) : await writeReputation(request);
    return Response.json(rep, {headers});
  } catch (error) {
    return Response.json({error:error instanceof HttpError ? error.message : 'Respect is temporarily unavailable. Please retry.'}, {status:error instanceof HttpError ? error.status : 503, headers:{...headers,...(error instanceof HttpError&&error.status===429?{'Retry-After':'600'}:{})}});
  }
}
export const GET = handle;
export const PUT = handle;
export const DELETE = handle;
