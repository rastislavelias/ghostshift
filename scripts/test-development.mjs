import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
if (process.env.GHOSTSHIFT_TEST_FIXTURE !== '1') throw new Error('Run only against the synthetic disposable Compose stack.');
const base = process.env.GHOSTSHIFT_URL || 'http://127.0.0.1:3000';
const idSuffix = Date.now();
async function api(path, body, expected = 200) {
  const response = await fetch(base + path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', Origin: new URL(base).origin, Connection: 'close' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json();
  assert.equal(response.status, expected, JSON.stringify(data)); return data;
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function detail(id) { return (await api(`/api/projects/${id}`)).project; }
async function wait(id, predicate, seconds = 180) {
  const deadline = Date.now() + seconds * 1000;
  while (Date.now() < deadline) { const project = await detail(id); if (predicate(project)) return project; await sleep(1000); }
  throw new Error('Development job timed out');
}
const created = await api('/api/projects', { name: `Development integration ${idSuffix}`, brief: 'Build a simple playground landing page.' }, 201);
let project = await detail(created.project.id);
const dev = (body, expected = 200) => api(`/api/projects/${project.id}/development`, { revision: project.revision, planId: project.approved_plan_id, ...body }, expected);
await dev({ action: 'start', provider: 'ollama', model: 'qwen3:4b', task: 'page', criteria: 'heading' }, 409);
await api(`/api/projects/${project.id}/workflow`, { action: 'generate', revision: project.revision, provider: 'ollama', model: 'qwen3:4b' });
project = await wait(project.id, p => p.status === 'awaiting_review');
await api(`/api/projects/${project.id}/workflow`, { action: 'approve', revision: project.revision, planId: project.plans[0].id });
project = await detail(project.id);
await dev({ action: 'start', provider: 'ollama', model: 'qwen3:4b', task: '[repair] Build the demo page.', criteria: 'A heading and feature section.' });
await dev({ action: 'start', provider: 'ollama', model: 'qwen3:4b', task: 'Duplicate', criteria: 'No duplicate jobs.' }, 409);
project = await wait(project.id, p => ['awaiting_review', 'failed'].includes(p.development_jobs[0]?.status));
let job = project.development_jobs[0];
assert.equal(job.status, 'awaiting_review', JSON.stringify(job));
assert.equal(job.attempts, 2); assert.equal(job.runs[0].status, 'failed'); assert.equal(job.runs[1].status, 'succeeded');
assert.equal(job.checks.length, 3); assert.ok(job.checks.every(c => c.passed));
assert.match(job.patch, /diff --git a\/app\/page.tsx b\/app\/page.tsx/); assert.match(job.base_commit, /^[a-f0-9]{40}$/);
const patchResponse = await fetch(`${base}/api/projects/${project.id}/patch?job=${job.id}`); assert.equal(patchResponse.status, 200); assert.equal(await patchResponse.text(), job.patch);
await dev({ action: 'request_changes', jobId: job.id, feedback: 'Keep the implementation simple.' });
project = await detail(project.id);
await dev({ action: 'accept', jobId: job.id }, 409);
await dev({ action: 'start', parentJobId: job.id, provider: 'ollama', model: 'qwen3:4b', task: job.task, criteria: job.criteria });
project = await wait(project.id, p => ['awaiting_review', 'failed'].includes(p.development_jobs[0]?.status));
assert.equal(project.development_jobs[0].status, 'awaiting_review'); assert.equal(project.development_jobs[0].base_commit, job.base_commit);
job = project.development_jobs[0];
await dev({ action: 'accept', jobId: job.id }); project = await detail(project.id); assert.equal(project.development_jobs[0].status, 'accepted');
await dev({ action: 'start', provider: 'ollama', model: 'qwen3:4b', task: '[bad-code] invalid page', criteria: 'Must compile.' });
project = await wait(project.id, p => p.development_jobs[0]?.status === 'failed');
assert.equal(project.development_jobs[0].attempts, 2);
await dev({ action: 'start', provider: 'ollama', model: 'qwen3:4b', task: '[slow] page', criteria: 'heading' }); project = await wait(project.id, p => p.development_jobs[0]?.status === 'running' && p.development_jobs[0].attempts === 1);
await dev({ action: 'cancel', jobId: project.development_jobs[0].id });
await sleep(4000); project = await detail(project.id); assert.equal(project.development_jobs[0].status, 'cancelled');
// A crashed worker consumes its reserved attempt; a replacement has only the remaining budget.
if (process.env.TEST_COMPOSE_PROJECT) {
  const stack = process.env.TEST_COMPOSE_PROJECT;
  assert.ok(['ghostshift-ci', 'ghostshift-development-test'].includes(stack));
  const compose = (args, input) => {
    const result = spawnSync('docker', ['compose', '-f', 'compose.yaml', '-f', 'compose.test.yaml', '-p', stack, ...args], { env: process.env, input, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr); return result.stdout;
  };
  await dev({ action: 'start', provider: 'ollama', model: 'qwen3:4b', task: '[slow] recover worker', criteria: 'heading' });
  project = await wait(project.id, p => p.development_jobs[0]?.attempts === 1 && p.development_jobs[0].status === 'running');
  const recoveryJob = project.development_jobs[0].id;
  compose(['kill', '-s', 'SIGKILL', 'developer']);
  compose(['exec', '-T', 'database', 'psql', '-U', 'ghostshift', '-d', 'ghostshift', '-v', 'ON_ERROR_STOP=1'], `UPDATE development_jobs SET lease_until=now()-interval '1 second' WHERE id='${recoveryJob}';`);
  compose(['up', '-d', '--no-deps', 'developer']);
  project = await wait(project.id, p => ['awaiting_review','failed'].includes(p.development_jobs[0]?.status));
  assert.equal(project.development_jobs[0].status, 'awaiting_review');
  assert.equal(project.development_jobs[0].attempts, 2);
  assert.equal(project.development_jobs[0].runs[0].status, 'interrupted');
}
// Revoking approval cancels active work and prevents accepting an old result.
await dev({ action: 'start', provider: 'ollama', model: 'qwen3:4b', task: '[slow] approval revoked', criteria: 'heading' }); project = await wait(project.id, p => p.development_jobs[0]?.status === 'running' && p.development_jobs[0].attempts === 1);
await api(`/api/projects/${project.id}/workflow`, { action: 'request_changes', revision: project.revision, planId: project.plans[0].id, feedback: 'Revise scope.' });
await sleep(4000); project = await detail(project.id);
await dev({ action: 'accept', jobId: job.id }, 409);
assert.ok(['failed', 'cancelled'].includes(project.development_jobs[0].status));
console.log('Development integration passed: approval gating, concurrency, real compile/test/build, repair, patch, revision, acceptance, exhaustion, cancellation, worker recovery (when configured) and revoked approval.');
