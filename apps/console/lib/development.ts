import { selectConfiguredModel } from './provider-configuration';
import { database } from './db';
import { WorkflowError } from './workflow';
import { boundedNumber } from './providers';
import { developmentRepository } from './development-contract';
const text = (value: unknown, max: number) => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max ? value.trim() : null;
export async function changeDevelopment(id: string, body: Record<string, unknown>) {
  if (!Number.isSafeInteger(body.revision)) throw new WorkflowError('A current project revision is required.');
  if (!['start', 'cancel', 'accept', 'request_changes'].includes(String(body.action))) throw new WorkflowError('Unknown development action.');
  return database.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM projects WHERE id=${id}::uuid FOR UPDATE`;
    const project = await tx.project.findUnique({ where: { id } });
    if (!project) throw new WorkflowError('Project not found.', 404);
    if (project.revision !== body.revision) throw new WorkflowError('Project changed. Reload before continuing.', 409);
    const latest = await tx.developmentJob.findFirst({ where: { project_id: id }, orderBy: { created_at: 'desc' } });
    let eventJobId = latest?.id || null;
    const active = latest && ['queued', 'running'].includes(latest.status);
    if (body.action === 'cancel') {
      if (!active || latest.id !== body.jobId) throw new WorkflowError('No matching active development job.', 409);
      await tx.developmentJob.update({ where: { id: latest.id }, data: { status: 'cancelled', lease_owner: null, lease_until: null, finished_at: new Date() } });
      await tx.developmentAttempt.updateMany({ where: { job_id: latest.id, status: 'running' }, data: { status: 'cancelled', finished_at: new Date() } });
    } else {
      if (project.status !== 'approved' || !project.approved_plan_id || body.planId !== project.approved_plan_id) throw new WorkflowError('Approve the current plan before developing or reviewing a result.', 409);
      if (body.action === 'start') {
        if (active) throw new WorkflowError('A development job is already active.', 409);
        if (latest?.status === 'awaiting_review' && latest.plan_id === project.approved_plan_id) throw new WorkflowError('Accept the latest result or request changes before starting another task.', 409);
        const repository = developmentRepository();
        if (!repository) throw new WorkflowError('Configure DEVELOPER_REPOSITORY on the server first.', 409);
        let selected; try { selected = await selectConfiguredModel(body.provider, body.model, tx); } catch { throw new WorkflowError('Select a configured model.'); }
        if (selected.paid && body.allowPaid !== true) throw new WorkflowError('Confirm possible API charges.');
        const task = text(body.task, 3000), criteria = text(body.criteria, 3000);
        if (!task || !criteria) throw new WorkflowError('Task and acceptance criteria are required (up to 3,000 characters each).');
        const parent = body.parentJobId ? latest : null;
        if (body.parentJobId && (!parent || parent.id !== body.parentJobId || parent.status !== 'changes_requested' || parent.plan_id !== project.approved_plan_id || parent.repository !== repository)) throw new WorkflowError('Only the latest requested revision can be continued.', 409);
        if (parent && (task !== parent.task || criteria !== parent.criteria)) throw new WorkflowError('Keep the original task and criteria when revising a result.');
        let maxAttempts; try { maxAttempts = boundedNumber(process.env.DEVELOPER_MAX_ATTEMPTS, 2, 1, 3); } catch { throw new WorkflowError('Invalid server attempt limit.', 503); }
        const created = await tx.developmentJob.create({ data: {
          project_id: id, plan_id: project.approved_plan_id, task, criteria, repository,
          provider: selected.provider, model: selected.model, max_attempts: maxAttempts,
          max_output_tokens: 4096, parent_job_id: parent?.id,
          base_commit: parent?.base_commit, feedback: parent?.feedback,
          ...(parent?.files ? { files: parent.files } : {}),
        } });
        eventJobId = created.id;
      } else {
        if (!latest || latest.id !== body.jobId || latest.status !== 'awaiting_review' || latest.plan_id !== project.approved_plan_id) throw new WorkflowError('Review the latest result for the approved plan.', 409);
        const feedback = text(body.feedback, 4000);
        if (body.action === 'request_changes' && !feedback) throw new WorkflowError('Describe the requested changes (up to 4,000 characters).');
        await tx.developmentJob.update({ where: { id: latest.id }, data: { status: body.action === 'accept' ? 'accepted' : 'changes_requested', feedback } });
      }
    }
    await tx.project.update({ where: { id }, data: { revision: { increment: 1 } } });
    await tx.projectEvent.create({ data: { project_id: id, kind: `development_${body.action}`, detail: { jobId: eventJobId } } });
    return { ok: true };
  });
}
