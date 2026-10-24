import { database } from '@/lib/db';
import { isUuid } from '@/lib/planning-contract';
import { apiError } from '@/lib/api';
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const jobId = new URL(request.url).searchParams.get('job');
  if (!isUuid(id) || !jobId || !isUuid(jobId)) return new Response('Not found', { status: 404 });
  try {
    const job = await database.developmentJob.findFirst({ where: { id: jobId, project_id: id } });
    if (!job?.patch) return new Response('Not found', { status: 404 });
    return new Response(job.patch, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Disposition': `attachment; filename="ghostshift-${job.id}.patch"`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
  } catch (error) { return apiError(error); }
}
