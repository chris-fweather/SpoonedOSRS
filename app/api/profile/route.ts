import {requestJson,RequestError,publicMessage} from '@/lib/request-body';
import type {Presentation} from '@/lib/presentation';
import {HttpError, readSession} from '@/lib/auth';
import {publicProfile, saveProfile} from '@/lib/profile-store';

export async function GET(req: Request) {
  try {
    const session = await readSession(req);
    const username = new URL(req.url).searchParams.get('username');
    return Response.json(await publicProfile(username, session?.id ?? null), {headers: {'Cache-Control': 'private, no-store', Vary: 'Cookie'}});
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request) {
  try {
    const body = await requestJson(req,8000) as {username?: unknown; companionPet?: unknown; displayPiece?: unknown; equipped?: unknown; pinnedMark?: unknown; title?: unknown; visibility?: unknown} & Partial<Presentation>;
    const saved = await saveProfile(req, body.username, body);
    return Response.json(saved, {headers: {'Cache-Control': 'private, no-store', Vary: 'Cookie'}});
  } catch (e) {
    return fail(e);
  }
}

function fail(e: unknown) {
  if (e instanceof HttpError||e instanceof RequestError) return Response.json({error: e.message}, {status: e.status, headers: {'Cache-Control': 'private, no-store', Vary: 'Cookie'}});
  const message = publicMessage(e, '');
  const status = /RuneScape name|JSON|large/.test(message) ? 400 : 503;
  return Response.json({error: status===400?message:'Could not update profile. Please retry.'}, {status, headers: {'Cache-Control': 'private, no-store', Vary: 'Cookie'}});
}
