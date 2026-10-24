import { database } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await database.project.findFirst({ select: { id: true } });
    return Response.json({ status: 'ok', database: 'ready', version: '0.1.0' });
  } catch {
    return Response.json({ status: 'unavailable', database: 'unavailable' }, { status: 503 });
  }
}
