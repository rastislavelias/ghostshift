export const planFields = [
  ['summary', 'Project summary'], ['scope', 'MVP scope'], ['outOfScope', 'Out of scope'],
  ['architecture', 'Architecture'], ['tasks', 'Implementation tasks'],
  ['acceptanceCriteria', 'Acceptance criteria'], ['risks', 'Risks and assumptions'],
  ['questions', 'Questions for the owner'],
] as const;
export type PlanContent = Record<(typeof planFields)[number][0], string>;
export const planSchema = {
  type: 'object', additionalProperties: false,
  properties: Object.fromEntries(planFields.map(([key, label]) => [key, { type: 'string', description: label }])),
  required: planFields.map(([key]) => key),
};
export function parsePlan(value: unknown): PlanContent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid plan document.');
  const result = {} as PlanContent;
  for (const [key, label] of planFields) {
    const field = (value as Record<string, unknown>)[key];
    if (typeof field !== 'string' || !field.trim() || field.length > 8000) throw new Error(`${label} must contain 1–8,000 characters.`);
    result[key] = field.trim();
  }
  if (JSON.stringify(result).length > 40000) throw new Error('Plan exceeds 40,000 characters.');
  return result;
}
export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
export const statusLabels: Record<string, string> = {
  draft: 'Draft', planning: 'Planning', awaiting_review: 'Awaiting review',
  changes_requested: 'Changes requested', approved: 'Approved',
};
