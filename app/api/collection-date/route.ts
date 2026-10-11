import {HttpError, readSession, requireLinkedWriter} from '@/lib/auth';
import {requestJson, RequestError,publicMessage} from '@/lib/request-body';
import {readJournal, saveJournal} from '@/lib/storage';
import {setCollectionDate} from '@/lib/collection-history';

export async function POST(req: Request) {
  try {
    const {username, itemId, date, revision} = await requestJson(req, 4096);
    await requireLinkedWriter(req, username);
    const journal = await readJournal(username);
    if (!Number.isInteger(revision) || revision !== journal.revision) return Response.json({error: 'Progress changed. Refresh before saving.'}, {status: 409});
    let updated;
    try { updated = setCollectionDate(journal, itemId, date); } catch (error) { throw new HttpError(400, publicMessage(error, 'Choose a valid collection date, or leave it blank.')); }
    return Response.json(await saveJournal(updated, revision,(await readSession(req))!.id), {headers: {'Cache-Control': 'no-store'}});
  } catch (error) {
    return Response.json({error: error instanceof HttpError || error instanceof RequestError ? error.message : 'Could not save. Refresh your profile and try again.'}, {status: error instanceof HttpError || error instanceof RequestError ? error.status : 503});
  }
}
