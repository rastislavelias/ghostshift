import test from 'node:test';
import assert from 'node:assert/strict';
import { generatePlan, ProviderError } from '../services/orchestrator/provider.ts';
import { planFields } from '../apps/console/lib/planning-contract.ts';

test('provider adapters send bounded structured requests and normalize usage', async () => {
  const originalFetch = globalThis.fetch;
  const names = ['OPENAI_API_KEY','OPENAI_MODELS','COMPATIBLE_API_KEY','COMPATIBLE_MODELS','COMPATIBLE_BASE_URL','OLLAMA_MODELS'];
  const originalEnv = Object.fromEntries(names.map(n => [n, process.env[n]]));
  Object.assign(process.env, { OPENAI_API_KEY: 'synthetic-key', OPENAI_MODELS: 'test-model', COMPATIBLE_API_KEY: 'synthetic-key', COMPATIBLE_MODELS: 'test-model', COMPATIBLE_BASE_URL: 'https://provider.example/v1', OLLAMA_MODELS: 'test-model' });
  const content = Object.fromEntries(planFields.map(([key]) => [key, 'A concise synthetic requirement.']));
  try {
    for (const provider of ['ollama','openai','compatible']) {
      globalThis.fetch = async (url, options) => {
        const body = JSON.parse(options.body); assert.equal(body.model, 'test-model'); assert.equal(options.redirect, 'error');
        if (provider === 'openai') {
          assert.equal(url, 'https://api.openai.com/v1/responses'); assert.equal(body.store, false); assert.equal(body.max_output_tokens, 512); assert.equal(body.text.format.strict, true);
          return Response.json({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(content) }] }], usage: { input_tokens: 12, output_tokens: 34 } });
        }
        if (provider === 'compatible') {
          assert.equal(url, 'https://provider.example/v1/chat/completions'); assert.equal(body.max_tokens, 512);
          return Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(content) } }], usage: { prompt_tokens: 12, completion_tokens: 34 } });
        }
        assert.equal(body.options.num_predict, 512); assert.equal(body.stream, false);
        return Response.json({ done: true, done_reason: 'stop', message: { content: JSON.stringify(content) }, prompt_eval_count: 12, eval_count: 34 });
      };
      const result = await generatePlan({ provider, model: 'test-model', input: { brief: 'Plan a small app.' }, max_output_tokens: 512 }, new AbortController().signal);
      assert.deepEqual(result.content, content); assert.deepEqual(result.usage, { input: 12, output: 34 });
    }
    globalThis.fetch = async () => Response.json({ status: 'incomplete' });
    await assert.rejects(generatePlan({ provider: 'openai', model: 'test-model', input: {}, max_output_tokens: 512 }, new AbortController().signal), e => e instanceof ProviderError && !e.retryable);
    globalThis.fetch = async () => new Response('secret-provider-error', { status: 401 });
    await assert.rejects(generatePlan({ provider: 'openai', model: 'test-model', input: {}, max_output_tokens: 512 }, new AbortController().signal), e => e.message === 'provider_http_401' && !e.retryable);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [name,value] of Object.entries(originalEnv)) { if (value === undefined) delete process.env[name]; else process.env[name] = value; }
  }
});
