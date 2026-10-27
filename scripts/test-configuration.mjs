import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
assert.equal(process.env.GHOSTSHIFT_TEST_FIXTURE, '1', 'Use only the disposable synthetic stack.');
const project = process.env.TEST_COMPOSE_PROJECT;
assert.ok(['ghostshift-ci', 'ghostshift-console-test'].includes(project));
const base = process.env.GHOSTSHIFT_URL || 'http://127.0.0.1:3000';
function compose(args) {
  const result = spawnSync('docker', ['compose', '-f', 'compose.yaml', '-f', 'compose.test.yaml', '-p', project, ...args], { env: process.env, encoding: 'utf8', timeout: 180000 });
  assert.equal(result.status, 0, result.stderr); return result.stdout;
}
async function api(body, status = 200, origin = new URL(base).origin) {
  const r = await fetch(base+'/api/configuration/openai', { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', Connection: 'close', Origin: origin }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const text = await r.text(); assert.equal(r.status, status, text); return { data: JSON.parse(text), text, headers: r.headers };
}
function workerKey(expected) {
  compose(['exec', '-T', 'worker', 'node', '--input-type=module', '-e', `const {openAIKey}=await import('./worker/apps/console/lib/provider-credentials.js');if(await openAIKey()!==${expected === undefined ? 'undefined' : JSON.stringify(expected)})process.exit(1);process.exit(0);`]);
}
let response = await api(); assert.equal(response.data.configured, false); assert.equal(response.headers.get('cache-control'), 'no-store');
await api({ action: 'save', apiKey: 'short' }, 400);
await api({ action: 'save', apiKey: 'synthetic'.repeat(5) }, 403, 'https://example.invalid');
const key = 'sk-ghostshift-fixture-'+randomBytes(24).toString('hex');
response = await api({ action: 'save', apiKey: key }); assert.equal(response.data.configured, true);
for (const forbidden of [key, 'ciphertext', 'apiKey']) assert.ok(!response.text.includes(forbidden));
const ciphertext = compose(['exec', '-T', 'database', 'psql', '-U', 'ghostshift', '-d', 'ghostshift', '-At', '-c', "SELECT ciphertext FROM provider_credentials WHERE provider='openai'"]).trim();
assert.ok(ciphertext.startsWith('v1.')); assert.ok(!ciphertext.includes(key));
workerKey(key);
compose(['exec', '-T', 'console', 'node', '-e', "if((require('node:fs').statSync('/var/lib/ghostshift/secrets/credentials.key').mode & 0o777)!==0o600)process.exit(1)"]);
compose(['exec', '-T', 'executor', 'node', '-e', "if(require('node:fs').existsSync('/var/lib/ghostshift/secrets/credentials.key'))process.exit(1)"]);
for (const path of ['/configuration', '/projects', '/']) {
  const page = await fetch(base+path, { headers: { Connection: 'close' } }); assert.equal(page.status, 200);
  const html = await page.text(); assert.ok(!html.includes(key)); assert.match(html, /Main navigation/);
}
const projects = (await (await fetch(base+'/api/projects', { headers: { Connection: 'close' } })).json()).projects;
if (projects.length) {
  const html = await (await fetch(base+'/projects/'+projects[0].id, { headers: { Connection: 'close' } })).text();
  assert.match(html, /OpenAI/); assert.match(html, /gpt-5-mini/); assert.ok(!html.includes(key));
}
const draft = projects.find(p => p.name === 'Smoke test' && p.status === 'draft');
if (draft) {
  const detail = (await (await fetch(base+'/api/projects/'+draft.id, { headers: { Connection: 'close' } })).json()).project;
  const r = await fetch(base+'/api/projects/'+draft.id+'/workflow', { method: 'POST', headers: { 'Content-Type': 'application/json', Connection: 'close' }, body: JSON.stringify({ action: 'generate', revision: detail.revision, provider: 'openai', model: 'gpt-5-mini', allowPaid: false }) });
  assert.equal(r.status, 400); assert.match((await r.json()).error, /charges/);
  const unchanged = (await (await fetch(base+'/api/projects/'+draft.id, { headers: { Connection: 'close' } })).json()).project;
  assert.equal(unchanged.jobs.length, detail.jobs.length);
}
compose(['down']); compose(['up', '-d', '--wait']);
assert.equal((await api()).data.configured, true); workerKey(key);
const replacement = 'sk-ghostshift-replacement-'+randomBytes(24).toString('hex');
await api({ action: 'save', apiKey: replacement }); workerKey(replacement);
await api({ action: 'remove' }); assert.equal((await api()).data.configured, false); workerKey(undefined);
console.log('Configuration passed: encrypted storage, no secret disclosure, validation/origin checks, model availability, worker reload, restart persistence, replacement and removal. No OpenAI requests made.');
