import { runManagerCycle } from './manager-worker.ts';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { database } from '../../apps/console/lib/db.ts';
import { type PlanningJob, type Prisma } from '../../apps/console/generated/prisma/client.ts';
import { generatePlan, ProviderError, requestTimeout } from './provider.ts';

let stopping = false;
let current: AbortController | undefined;
process.on('SIGTERM', () => { stopping = true; current?.abort(); });
process.on('SIGINT', () => { stopping = true; current?.abort(); });

async function lockProject(tx: Prisma.TransactionClient, id: string) {
  await tx.$queryRaw`SELECT id FROM projects WHERE id = ${id}::uuid FOR UPDATE`;
}
async function recoverExpired() {
  const expired = await database.planningJob.findMany({ where: { status: 'running', lease_until: { lt: new Date() } }, take: 10 });
  for (const job of expired) {
    await database.$transaction(async tx => {
      await lockProject(tx, job.project_id);
      const currentJob = await tx.planningJob.findUniqueOrThrow({ where: { id: job.id } });
      const exhausted = currentJob.attempts >= currentJob.max_attempts;
      const updated = await tx.planningJob.updateMany({ where: { id: job.id, status: 'running', lease_owner: currentJob.lease_owner, lease_until: { lt: new Date() } }, data: {
        status: exhausted ? 'failed' : 'queued', lease_owner: null, lease_until: null,
        available_at: new Date(), error: 'worker_interrupted', finished_at: exhausted ? new Date() : null,
      } });
      if (!updated.count) return;
      await tx.planningAttempt.updateMany({ where: { job_id: job.id, status: 'running' }, data: { status: 'interrupted', error: 'worker_interrupted', finished_at: new Date() } });
      if (exhausted) await releaseProject(tx, job.project_id);
      await tx.projectEvent.create({ data: { project_id: job.project_id, kind: 'worker_recovered', detail: { jobId: job.id, retry: !exhausted } } });
    });
  }
}
async function releaseProject(tx: Prisma.TransactionClient, projectId: string) {
  const plan = await tx.projectPlan.findFirst({ where: { project_id: projectId } });
  await tx.project.update({ where: { id: projectId }, data: { status: plan ? 'changes_requested' : 'draft', revision: { increment: 1 } } });
}
async function claim(): Promise<PlanningJob | null> {
  return database.$transaction(async tx => {
    // Lock projects first everywhere to prevent deadlocks with cancellation/review.
    const candidates = await tx.$queryRaw<Array<{ id: string }>>`SELECT p.id FROM projects p
      WHERE EXISTS (SELECT 1 FROM planning_jobs j WHERE j.project_id=p.id AND j.status='queued' AND j.available_at <= now())
      ORDER BY p.created_at FOR UPDATE OF p SKIP LOCKED LIMIT 1`;
    if (!candidates.length) return null;
    const job = await tx.planningJob.findFirst({ where: { project_id: candidates[0].id, status: 'queued', available_at: { lte: new Date() } } });
    if (!job) return null;
    const claimed = await tx.planningJob.update({ where: { id: job.id }, data: { status: 'running', attempts: { increment: 1 }, lease_owner: randomUUID(), lease_until: new Date(Date.now() + 60000), error: null } });
    await tx.planningAttempt.create({ data: { job_id: job.id, number: claimed.attempts } });
    await tx.projectEvent.create({ data: { project_id: job.project_id, kind: 'planning_started', detail: { jobId: job.id, attempt: claimed.attempts } } });
    return claimed;
  });
}
async function execute(job: PlanningJob) {
  const controller = new AbortController(); current = controller;
  const started = Date.now();
  const timeout = setTimeout(() => controller.abort(), requestTimeout());
  const heartbeat = setInterval(async () => {
    try {
      const renewed = await database.planningJob.updateMany({ where: { id: job.id, status: 'running', lease_owner: job.lease_owner }, data: { lease_until: new Date(Date.now() + 60000) } });
      if (!renewed.count) controller.abort();
      await writeFile('/tmp/ghostshift-worker-heartbeat', String(Date.now()));
    } catch { controller.abort(); }
  }, 10000);
  try {
    const result = await generatePlan(job, controller.signal);
    await database.$transaction(async tx => {
      await lockProject(tx, job.project_id);
      const accepted = await tx.planningJob.updateMany({ where: { id: job.id, status: 'running', lease_owner: job.lease_owner, lease_until: { gt: new Date() } }, data: { status: 'succeeded', finished_at: new Date(), lease_owner: null, lease_until: null } });
      if (!accepted.count) return; // A cancelled or superseded worker cannot publish a result.
      const last = await tx.projectPlan.findFirst({ where: { project_id: job.project_id }, orderBy: { version: 'desc' } });
      const plan = await tx.projectPlan.create({ data: { project_id: job.project_id, version: (last?.version || 0) + 1, content: result.content, source: 'ai' } });
      await tx.project.update({ where: { id: job.project_id }, data: { status: 'awaiting_review', revision: { increment: 1 }, feedback: null } });
      await tx.planningAttempt.update({ where: { job_id_number: { job_id: job.id, number: job.attempts } }, data: { status: 'succeeded', input_tokens: result.usage.input, output_tokens: result.usage.output, duration_ms: Date.now() - started, finished_at: new Date() } });
      await tx.projectEvent.create({ data: { project_id: job.project_id, kind: 'plan_ready', detail: { version: plan.version, planId: plan.id, jobId: job.id } } });
    });
  } catch (error) {
    const code = error instanceof ProviderError ? error.code : 'worker_error';
    const retry = job.attempts < job.max_attempts && (!(error instanceof ProviderError) || error.retryable);
    await database.$transaction(async tx => {
      await lockProject(tx, job.project_id);
      const updated = await tx.planningJob.updateMany({ where: { id: job.id, status: 'running', lease_owner: job.lease_owner }, data: {
        status: retry ? 'queued' : 'failed', error: code, lease_owner: null, lease_until: null,
        available_at: new Date(Date.now() + 15000 * job.attempts), finished_at: retry ? null : new Date(),
      } });
      if (!updated.count) return;
      await tx.planningAttempt.update({ where: { job_id_number: { job_id: job.id, number: job.attempts } }, data: { status: 'failed', error: code, duration_ms: Date.now() - started, finished_at: new Date() } });
      if (!retry) await releaseProject(tx, job.project_id);
      await tx.projectEvent.create({ data: { project_id: job.project_id, kind: retry ? 'planning_retry' : 'planning_failed', detail: { jobId: job.id, code } } });
    });
  } finally { clearTimeout(timeout); clearInterval(heartbeat); current = undefined; }
}
console.log('Planner worker started. No jobs run until requested by the owner.');
while (!stopping) {
  try {
    await recoverExpired();
    await writeFile('/tmp/ghostshift-worker-heartbeat', String(Date.now()));
    const job = await claim();
    if (job) { console.log(`Planning job ${job.id}, attempt ${job.attempts}.`); await execute(job); }
    else {
      current = new AbortController();
      const managerWorked = await runManagerCycle(current);
      current = undefined;
      if (!stopping && !managerWorked) await delay(1500);
    }
  } catch { console.error('Planner database operation failed; retrying.'); await delay(3000); }
}
await database.$disconnect();
