export const editablePaths = ['app/page.tsx', 'app/globals.css'] as const;
export type Change = { summary: string; files: Array<{ path: string; content: string }> };
export type Check = { name: string; passed: boolean; output: string; durationMs: number };
export const changeSchema = {
  type: 'object', additionalProperties: false, required: ['summary', 'files'], properties: {
    summary: { type: 'string' }, files: { type: 'array', items: {
      type: 'object', additionalProperties: false, required: ['path', 'content'],
      properties: { path: { type: 'string', enum: [...editablePaths] }, content: { type: 'string' } },
    } },
  },
};
export function parseChange(value: unknown): Change {
  const data = value as Change;
  if (!data || typeof data.summary !== 'string' || !data.summary.trim() || data.summary.length > 2000 || !Array.isArray(data.files) || !data.files.length || data.files.length > 2) throw new Error('Invalid change.');
  const paths = new Set<string>();
  for (const file of data.files) {
    if (!file || !editablePaths.includes(file.path as typeof editablePaths[number]) || paths.has(file.path) || typeof file.content !== 'string' || !file.content.trim() || file.content.length > 16000 || file.content.includes('\0')) throw new Error('Only bounded page and CSS replacements are allowed.');
    paths.add(file.path);
  }
  if (JSON.stringify(data).length > 26000) throw new Error('Change too large.');
  return { summary: data.summary.trim(), files: data.files.map(({ path, content }) => ({ path, content })) };
}
export function developmentRepository(): string | null {
  const value = process.env.DEVELOPER_REPOSITORY || '';
  return /^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}\/[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(value) ? value : null;
}
