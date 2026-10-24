import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePlan, planFields } from '../apps/console/lib/planning-contract.ts';
import { modelCatalog, selectModel } from '../apps/console/lib/providers.ts';

test('a plan requires every review section and bounded content', () => {
  const plan = Object.fromEntries(planFields.map(([key]) => [key, 'A clear requirement.']));
  assert.deepEqual(parsePlan({ ...plan, injectedApproval: true }), plan);
  assert.throws(() => parsePlan({ ...plan, tasks: '' }));
  assert.throws(() => parsePlan({ ...plan, scope: 'x'.repeat(8001) }));
  assert.throws(() => parsePlan(Object.fromEntries(planFields.map(([key]) => [key, 'x'.repeat(7000)]))));
});
test('model selection is an allowlist and never returns credentials', () => {
  const catalog = modelCatalog();
  assert.ok(catalog.some(m => m.provider === 'ollama'));
  assert.throws(() => selectModel('openai', 'not-configured'));
  assert.throws(() => selectModel('http://untrusted', 'anything'));
  for (const model of catalog) assert.deepEqual(Object.keys(model).sort(), ['label','model','paid','provider']);
});
