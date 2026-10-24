import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseChange } from '../apps/console/lib/development-contract.ts';
import { developmentGraph } from '../services/orchestrator/development-graph.ts';
test('code changes reject traversal, dependencies, duplicates and oversized output', () => {
  assert.equal(parseChange({ summary: 'A change', files: [{ path: 'app/page.tsx', content: 'export default () => null;' }] }).files.length, 1);
  for (const files of [[{ path: '../secrets', content: 'x' }], [{ path: 'package.json', content: '{}' }], [{ path: 'app/page.tsx', content: 'x' }, { path: 'app/page.tsx', content: 'y' }], [{ path: 'app/page.tsx', content: 'x'.repeat(16001) }]]) {
    assert.throws(() => parseChange({ summary: 'Change', files }));
  }
});
test('LangGraph repairs a failed check and respects the attempt budget', async () => {
  const run = async (succeed) => {
    const calls = [];
    const graph = developmentGraph({ maxAttempts: 2,
      generate: async state => { calls.push('generate'); return { attempt: state.attempt + 1, change: { summary: 'test', files: [] }, error: null, retryable: true }; },
      check: async state => { calls.push('check'); return { passed: succeed && state.attempt === 2, checks: [], error: 'checks_failed', retryable: true }; },
    });
    const result = await graph.invoke({ attempt: 0, change: null, checks: [], passed: false, error: null, retryable: true });
    assert.deepEqual(calls, ['generate', 'check', 'generate', 'check']);
    assert.equal(result.attempt, 2); assert.equal(result.passed, succeed);
  };
  await run(true); await run(false);
});
