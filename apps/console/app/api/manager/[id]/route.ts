import { managerAction, managerDetail } from '@/lib/manager';
import { isUuid } from '@/lib/planning-contract';
import { apiError, readMutation } from '@/lib/api';
export const dynamic = 'force-dynamic';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return Response.json({ error: 'Not found.' }, { status: 404 });
  try { const conversation = await managerDetail(id); return Response.json({ conversation }, { status: conversation ? 200 : 404, headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { return apiError(error); }
}
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return Response.json({ error: 'Not found.' }, { status: 404 });
  try { return Response.json(await managerAction(id, await readMutation(request))); }
  catch (error) { return apiError(error); }
}
