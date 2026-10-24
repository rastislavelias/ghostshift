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
  const text = input.includes('[invalid]') ? '{}' : JSON.stringify(plan);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  if (req.url === '/v1/responses') res.end(JSON.stringify({ status: 'completed', output: [{ content: [{ type: 'output_text', text }] }], usage: { input_tokens: 100, output_tokens: 200 } }));
  else if (req.url === '/v1/chat/completions') res.end(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: text } }], usage: { prompt_tokens: 100, completion_tokens: 200 } }));
  else res.end(JSON.stringify({ done: true, done_reason: 'stop', message: { content: text }, prompt_eval_count: 100, eval_count: 200 }));
}).listen(11434, '0.0.0.0');
