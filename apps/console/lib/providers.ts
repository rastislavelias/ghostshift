export type ProviderId = 'ollama' | 'openai' | 'compatible';
export type ModelOption = { provider: ProviderId; model: string; label: string; paid: boolean };
const models = (value: string | undefined) => [...new Set((value || '').split(',').map(s => s.trim()).filter(s => s && s.length <= 100))];
export function modelCatalog(): ModelOption[] {
  return [
    ...models(process.env.OLLAMA_MODELS || process.env.OLLAMA_MODEL || 'qwen3:4b').map(model => ({ provider: 'ollama' as const, model, label: `Ollama · ${model}`, paid: false })),
    ...(process.env.OPENAI_API_KEY ? models(process.env.OPENAI_MODELS) : []).map(model => ({ provider: 'openai' as const, model, label: `OpenAI · ${model}`, paid: true })),
    ...(process.env.COMPATIBLE_API_KEY && process.env.COMPATIBLE_BASE_URL ? models(process.env.COMPATIBLE_MODELS) : []).map(model => ({ provider: 'compatible' as const, model, label: `Compatible API · ${model}`, paid: true })),
  ];
}
export function selectModel(provider: unknown, model: unknown): ModelOption {
  const selected = modelCatalog().find(m => m.provider === provider && m.model === model);
  if (!selected) throw new Error('Choose a model configured on the server.');
  return selected;
}
export function boundedNumber(value: unknown, fallback: number, min: number, max: number): number {
  const number = Number(value ?? fallback);
  if (!Number.isInteger(number) || number < min || number > max) throw new Error(`Use a whole number from ${min} to ${max}.`);
  return number;
}
export const outputLimit = () => boundedNumber(process.env.PLANNER_MAX_OUTPUT_TOKENS, 2048, 256, 8192);
export const attemptLimit = () => boundedNumber(process.env.PLANNER_MAX_ATTEMPTS, 2, 1, 3);
