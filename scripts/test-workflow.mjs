// Run only against a disposable stack using compose.test.yaml.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
assert.equal(process.env.GHOSTSHIFT_TEST_FIXTURE, '1', 'Use only with the synthetic provider test stack.');
import { setTimeout as delay } from 'node:timers/promises';
const runId = Date.now();
const base = process.env.GHOSTSHIFT_URL || 'http://127.0.0.1:3000';
async function json(path, data) {
  const response = await fetch(`${base}${path}`, data ? { method: 'POST', headers: { 'Content-Type': 'application/json', Connection: 'close' }, body: JSON.stringify(data) } : { headers: { Connection: 'close' } });
  return { status: response.status, body: await response.json() };
}
async function create(name, marker = '') {
  const result = await json('/api/projects', { name: `${name} ${runId}`, brief: `Build a small task tracker. ${marker}` });
  assert.equal(result.status, 201); return result.body.project.id;
}
async function detail(id) { const r = await json(`/api/projects/${id}`); assert.equal(r.status, 200); return r.body.project; }
async function action(id, data, expected = 200) {
  const p = await detail(id);
  const result = await json(`/api/projects/${id}/workflow`, { revision: p.revision, planId: p.plans[0]?.id, ...data });
  assert.equal(result.status, expected, JSON.stringify(result.body)); return result;
}
async function wait(id, predicate, timeout = 75000) {
  const until = Date.now() + timeout;
  while (Date.now() < until) { const p = await detail(id); if (predicate(p)) return p; await delay(500); }
  throw new Error(`Workflow timeout for ${id}`);
}
const generate = { action: 'generate', provider: 'ollama', model: 'qwen3:4b', maxOutputTokens: 1024 };
console.log('Checking the review lifecycle…');
const id = await create('Workflow lifecycle');
await action(id, { ...generate, model: 'not-configured' }, 400);
const initial = await detail(id);
const duplicates = await Promise.all([json(`/api/projects/${id}/workflow`, { ...generate, revision: initial.revision }), json(`/api/projects/${id}/workflow`, { ...generate, revision: initial.revision })]);
assert.deepEqual(duplicates.map(r=>r.status).sort(), [200,409]);
let p = await wait(id, p => p.status === 'awaiting_review');
assert.equal(p.plans.length, 1); assert.equal(p.jobs[0].runs[0].input_tokens, 100);
const oldRevision = p.revision;
await action(id, { action: 'save', content: { ...p.plans[0].content, scope: 'A deliberately edited MVP scope.' } });
p = await detail(id); assert.equal(p.plans[0].version, 2);
let stale = await json(`/api/projects/${id}/workflow`, { action: 'approve', revision: oldRevision, planId: p.plans[1].id });
assert.equal(stale.status, 409);
await action(id, { action: 'approve' });
p = await detail(id); assert.equal(p.status, 'approved'); assert.equal(p.approved_plan_id, p.plans[0].id);
await action(id, generate, 409);
await action(id, { action: 'request_changes', feedback: 'Add export and clarify the backup approach.' });
p = await detail(id); assert.equal(p.approved_plan_id, null);
await action(id, generate);
p = await wait(id, p => p.status === 'awaiting_review'); assert.equal(p.plans[0].version, 3);
await action(id, { action: 'approve' });
assert.ok((await detail(id)).events.some(e => e.kind === 'request_changes'));
const cross = await fetch(`${base}/api/projects/${id}/workflow`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://example.org' }, body: JSON.stringify({ action: 'approve', revision: 0 }) });
assert.equal(cross.status, 403);
console.log('Checking retries and terminal failure…');
const retry = await create('Retry case', '[fail-once]'); await action(retry, generate);
p = await wait(retry, p => p.status === 'awaiting_review'); assert.equal(p.jobs[0].attempts, 2); assert.equal(p.jobs[0].runs[0].status, 'failed');
const failed = await create('Failure case', '[always-fail]'); await action(failed, generate);
p = await wait(failed, p => p.jobs[0]?.status === 'failed'); assert.equal(p.status, 'draft'); assert.equal(p.jobs[0].attempts, 2); assert.equal(p.plans.length, 0);
console.log('Checking cancellation…');
const slow = await create('Cancellation case', '[slow]'); await action(slow, generate);
await wait(slow, p => p.jobs[0]?.status === 'running'); await action(slow, { action: 'cancel' });
await delay(26000); p = await detail(slow); assert.equal(p.status, 'draft'); assert.equal(p.plans.length, 0); assert.equal(p.jobs[0].status, 'cancelled');
console.log('Checking worker recovery…');
if (process.env.TEST_COMPOSE_PROJECT) {
  const project = process.env.TEST_COMPOSE_PROJECT;
  assert.ok(['ghostshift-ci', 'ghostshift-workflow-test'].includes(project));
  function compose(args, input) {
    const r = spawnSync('docker', ['compose', '-f', 'compose.yaml', '-f', 'compose.test.yaml', '-p', project, ...args], { env: process.env, input, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr); return r.stdout;
  }
  const recovery = await create('Worker recovery case', '[slow]'); await action(recovery, generate);
  await wait(recovery, p => p.jobs[0]?.status === 'running');
  compose(['kill', '-s', 'SIGKILL', 'worker']);
  compose(['exec', '-T', 'database', 'psql', '-U', 'ghostshift', '-d', 'ghostshift', '-v', 'ON_ERROR_STOP=1'], `UPDATE planning_jobs SET lease_until=now()-interval '1 second' WHERE project_id='${recovery}' AND status='running';`);
  compose(['up', '-d', '--no-deps', 'worker']);
  p = await wait(recovery, p => p.status === 'awaiting_review');
  assert.equal(p.plans.length, 1); assert.equal(p.jobs[0].attempts, 2); assert.equal(p.jobs[0].runs[0].status, 'interrupted');
}
const page = await fetch(`${base}/projects/${id}`, { headers: { Connection: 'close' } }); assert.equal(page.status, 200); assert.match(await page.text(), /Approved/);
console.log('Workflow passed: concurrent queueing, review/edit, stale approval, revision, approval, retries, failure, cancellation, usage, and rendered detail.');
