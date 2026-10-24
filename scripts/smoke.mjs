import assert from 'node:assert/strict';

const base = process.env.GHOSTSHIFT_URL ?? 'http://127.0.0.1:3000';
const health = await fetch(`${base}/api/health`);
assert.equal(health.status, 200);
assert.equal((await health.json()).database, 'ready');
const invalid = await fetch(`${base}/api/projects`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: ' ', brief: 'invalid' }),
});
assert.equal(invalid.status, 400);
const crossOrigin = await fetch(`${base}/api/projects`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://example.org' },
  body: JSON.stringify({ name: 'Not saved', brief: 'Cross-origin check' }),
});
assert.equal(crossOrigin.status, 403);
const response = await fetch(`${base}/api/projects`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Smoke test', brief: 'Disposable integration test project.' }),
});
assert.equal(response.status, 201);
const { project } = await response.json();
assert.equal(project.status, 'draft');
const listing = await fetch(`${base}/api/projects`);
assert.equal(listing.status, 200);
assert.ok((await listing.json()).projects.some(item => item.id === project.id));
const page = await fetch(base);
assert.equal(page.status, 200);
assert.ok((await page.text()).includes('Smoke test'));
console.log(`Smoke checks passed. Test draft ID: ${project.id}`);
