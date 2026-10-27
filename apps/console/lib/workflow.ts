import { selectConfiguredModel } from './provider-configuration';
import { database } from './db';
import { Prisma } from '../generated/prisma/client';
import { parsePlan } from './planning-contract';
import { attemptLimit, boundedNumber, outputLimit } from './providers';

export class WorkflowError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export async function projectDetail(id: string) {
  return database.project.findUnique({ where: { id }, include: {
    plans: { orderBy: { version: 'desc' }, take: 30 },
    jobs: { orderBy: { created_at: 'desc' }, take: 20, select: {
      id: true, provider: true, model: true, status: true, attempts: true, max_attempts: true,
      max_output_tokens: true, error: true, created_at: true, finished_at: true,
      runs: { orderBy: { number: 'asc' } },
    } },
    development_jobs: { orderBy: { created_at: 'desc' }, take: 10, include: { runs: { orderBy: { number: 'asc' } } } },
    events: { orderBy: [{ created_at: 'desc' }, { id: 'desc' }], take: 100 },
  } });
}
function validated<T>(fn: () => T): T {
  try { return fn(); } catch (error) { throw new WorkflowError(error instanceof Error ? error.message : 'Invalid input.'); }
}
export async function changeWorkflow(id: string, body: Record<string, unknown>) {
  if (!Number.isSafeInteger(body.revision) || Number(body.revision) < 0) throw new WorkflowError('A current project revision is required.');
  const allowed = ['generate', 'save', 'approve', 'request_changes', 'cancel'];
  if (!allowed.includes(String(body.action))) throw new WorkflowError('Unknown workflow action.');
  return database.$transaction(async tx => {
    // All mutations, including worker completion, lock the project before touching jobs.
    const locked = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM projects WHERE id = ${id}::uuid FOR UPDATE`;
    if (!locked.length) throw new WorkflowError('Project not found.', 404);
    const project = await tx.project.findUniqueOrThrow({ where: { id } });
    if (project.revision !== body.revision) throw new WorkflowError('This project changed. Reload before submitting again.', 409);
    const latest = await tx.projectPlan.findFirst({ where: { project_id: id }, orderBy: { version: 'desc' } });
    const active = await tx.planningJob.findFirst({ where: { project_id: id, status: { in: ['queued', 'running'] } } });
    let status = project.status;
    let feedback = project.feedback;
    let approved_plan_id: string | null = null;
    let approved_at: Date | null = null;
    let detail: Prisma.InputJsonObject = {};
    if (body.action === 'generate') {
      if (active) throw new WorkflowError('A planning job is already active.', 409);
      if (project.status === 'approved') throw new WorkflowError('Request changes before replacing an approved plan.', 409);
      let selected;
      try { selected = await selectConfiguredModel(body.provider, body.model, tx); } catch { throw new WorkflowError('Choose a model configured on the server.'); }
      if (selected.paid && body.allowPaid !== true) throw new WorkflowError('Confirm that this request may incur API charges.');
      const max_output_tokens = validated(() => boundedNumber(body.maxOutputTokens, outputLimit(), 256, outputLimit()));
      const job = await tx.planningJob.create({ data: {
        project_id: id, provider: selected.provider, model: selected.model, max_output_tokens,
        max_attempts: attemptLimit(), input: {
          name: project.name, brief: project.brief, feedback: feedback || '',
          previousPlan: latest ? JSON.stringify(latest.content).slice(0, 12000) : '',
        },
      } });
      status = 'planning';
      detail = { jobId: job.id, provider: selected.provider, model: selected.model, maxOutputTokens: max_output_tokens };
    } else if (body.action === 'cancel') {
      if (!active) throw new WorkflowError('There is no active planning job.', 409);
      await tx.planningJob.update({ where: { id: active.id }, data: { status: 'cancelled', finished_at: new Date(), lease_owner: null, lease_until: null } });
      await tx.planningAttempt.updateMany({ where: { job_id: active.id, status: 'running' }, data: { status: 'cancelled', finished_at: new Date() } });
      status = latest ? 'changes_requested' : 'draft';
      detail = { jobId: active.id };
    } else {
      if (active) throw new WorkflowError('Cancel or finish the active job first.', 409);
      if (!latest || body.planId !== latest.id) throw new WorkflowError('Review the latest plan version before continuing.', 409);
      if (body.action === 'save') {
        const content = validated(() => parsePlan(body.content));
        const plan = await tx.projectPlan.create({ data: { project_id: id, version: latest.version + 1, content, source: 'human' } });
        status = 'awaiting_review';
        detail = { version: plan.version, planId: plan.id };
      } else if (body.action === 'approve') {
        if (project.status !== 'awaiting_review') throw new WorkflowError('Only a plan awaiting review can be approved.', 409);
        status = 'approved'; approved_plan_id = latest.id; approved_at = new Date();
        detail = { version: latest.version, planId: latest.id };
      } else {
        feedback = typeof body.feedback === 'string' ? body.feedback.trim() : '';
        if (!feedback || feedback.length > 4000) throw new WorkflowError('Describe the requested changes in 1–4,000 characters.');
        status = 'changes_requested'; detail = { version: latest.version, feedback };
      }
    }
    await tx.project.update({ where: { id }, data: { status, feedback, approved_plan_id, approved_at, revision: { increment: 1 } } });
    await tx.projectEvent.create({ data: { project_id: id, kind: String(body.action), detail } });
    return { status };
  }, { timeout: 10000 });
}
