import { changeDevelopment } from '@/lib/development';
import { isUuid } from '@/lib/planning-contract';
import { apiError, readMutation } from '@/lib/api';
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return Response.json({ error: 'Project not found.' }, { status: 404 });
  try { return Response.json(await changeDevelopment(id, await readMutation(request))); }
  catch (error) { return apiError(error); }
}
