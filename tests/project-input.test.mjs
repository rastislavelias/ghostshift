import test from 'node:test';
import assert from 'node:assert/strict';
import { parseProject } from '../apps/console/lib/project-input.ts';

test('normalizes a brief without accepting execution instructions as fields', () => {
  assert.deepEqual(parseProject({ name: ' Demo ', brief: ' Build a booking app. ', status: 'running' }), {
    name: 'Demo', brief: 'Build a booking app.',
  });
});

test('rejects malformed input, blank fields and oversized briefs', () => {
  for (const input of [null, [], 'text', {}, { name: ' ', brief: 'a' }, { name: 'a', brief: 42 },
    { name: 'x'.repeat(101), brief: 'a' }, { name: 'a', brief: 'x'.repeat(10001) }]) {
    assert.throws(() => parseProject(input));
  }
});
