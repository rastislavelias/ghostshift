import { projectDetail } from '@/lib/workflow';
import { isUuid } from '@/lib/planning-contract';
import { apiError } from '@/lib/api';
export const dynamic = 'force-dynamic';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return Response.json({ error: 'Project not found.' }, { status: 404 });
  try {
    const project = await projectDetail(id);
    return project ? Response.json({ project }) : Response.json({ error: 'Project not found.' }, { status: 404 });
  } catch (error) { return apiError(error); }
}
