import { z } from 'zod';
export const managerOutput = z.object({
  reply: z.string().trim().min(1).max(6000),
  summary: z.string().max(4000),
  brief: z.string().max(10000),
}).strict();
export const managerSchema = z.toJSONSchema(managerOutput);
export function managerContext(messages: Array<{ role: string; content: string }>) {
  // Select whole recent messages under a hard budget. The full transcript remains in PostgreSQL.
  const selected: Array<{ role: string; content: string }> = [];
  let size = 0;
  for (const message of [...messages].reverse()) {
    if (size + message.content.length > 10000) break;
    selected.unshift({ role: message.role, content: message.content }); size += message.content.length;
  }
  return selected;
}
export function managerText(value: unknown, max: number, empty = false) {
  if (typeof value !== 'string' || value.length > max || (!empty && !value.trim())) throw new Error(`Use ${empty ? '0' : '1'}–${max} characters.`);
  return value.trim();
}
