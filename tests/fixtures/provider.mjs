// Synthetic provider for integration checks only; never included in the runtime image.
import { createServer } from 'node:http';
const counts = new Map();
const plan = Object.fromEntries(['summary','scope','outOfScope','architecture','tasks','acceptanceCriteria','risks','questions'].map(key => [key, `${key}: a reviewable synthetic project plan with clear requirements.`]));
createServer(async (req, res) => {
  if (req.method === 'GET') { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ models: [{ name: 'qwen3:4b' }] })); return; }
  let raw = ''; for await (const chunk of req) raw += chunk;
  const body = JSON.parse(raw);
  const input = body.messages?.at(-1)?.content || body.input || '';
  const count = (counts.get(input) || 0) + 1; counts.set(input, count);
  if (input.includes('[always-fail]') || (input.includes('[fail-once]') && count === 1)) { res.writeHead(503); res.end('Synthetic failure'); return; }
  if (input.includes('[slow]')) await new Promise(resolve => setTimeout(resolve, 25000));
  const coding = body.format?.properties?.files || body.text?.format?.name === 'code_change';
  const parsed = coding ? JSON.parse(input) : null;
  const invalidCode = coding && (parsed.task.includes('[bad-code]') || (parsed.task.includes('[repair]') && !parsed.checks?.length));
  const change = { summary: 'Implemented the requested playground page.', files: [{ path: 'app/page.tsx', content: invalidCode ? 'export default function Home() { return <main><h1>Broken</h1></main> BAD; }' : 'export default function Home() { return <main><h1>Ghostshift Development Demo</h1><p>A verified change prepared for human review.</p><section><h2>Features</h2><p>Bounded tasks, isolated checks and reviewable patches.</p></section></main>; }\n' }] };
  const manager = body.format?.properties?.reply || body.text?.format?.name === 'manager_response';
  const context = manager ? JSON.parse(input) : null;
  const managerResult = manager ? { reply: `Let's clarify the MVP. Confirmed memory: ${context.confirmedMemory || '(none)'}`, summary: 'Synthetic summary: scope and acceptance criteria still need owner review.', brief: context.kind === 'brief' ? 'Problem: help a human manage tasks. Users: the owner. MVP: task list. Exclusions: payments. Acceptance: saved tasks survive restart. Open questions: hosting budget.' : '' } : null;
  const text = input.includes('[invalid]') ? '{}' : JSON.stringify(manager ? managerResult : coding ? change : plan);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  if (req.url === '/v1/responses') res.end(JSON.stringify({ status: 'completed', output: [{ content: [{ type: 'output_text', text }] }], usage: { input_tokens: 100, output_tokens: 200 } }));
  else if (req.url === '/v1/chat/completions') res.end(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: text } }], usage: { prompt_tokens: 100, completion_tokens: 200 } }));
  else res.end(JSON.stringify({ done: true, done_reason: 'stop', message: { content: text }, prompt_eval_count: 100, eval_count: 200 }));
}).listen(11434, '0.0.0.0');
