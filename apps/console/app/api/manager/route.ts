import { database } from '@/lib/db';
import { apiError, readMutation } from '@/lib/api';
import { WorkflowError } from '@/lib/workflow';
export const dynamic = 'force-dynamic';
export async function GET() {
  try { return Response.json({ conversations: await database.managerConversation.findMany({ orderBy: { created_at: 'desc' }, take: 100, select: { id: true, title: true, created_at: true, project_id: true } }) }, { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { return apiError(error); }
}
export async function POST(request: Request) {
  try {
    const body = await readMutation(request);
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title || title.length > 100) throw new WorkflowError('Use a title between 1 and 100 characters.');
    return Response.json({ conversation: await database.managerConversation.create({ data: { title } }) }, { status: 201 });
  } catch (error) { return apiError(error); }
}
