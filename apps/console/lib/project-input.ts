export function parseProject(input: unknown): { name: string; brief: string } {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new Error('Provide a project name and brief.');
  }
  const fields = input as Record<string, unknown>;
  const name = typeof fields.name === 'string' ? fields.name.trim() : '';
  const brief = typeof fields.brief === 'string' ? fields.brief.trim() : '';
  if (!name || name.length > 100) throw new Error('Use a project name between 1 and 100 characters.');
  if (!brief || brief.length > 10000) throw new Error('Use a project brief between 1 and 10,000 characters.');
  return { name, brief };
}
