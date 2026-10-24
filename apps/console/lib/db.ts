import { Pool } from 'pg';

const globalDatabase = globalThis as unknown as { ghostshiftPool?: Pool };

export const database = globalDatabase.ghostshiftPool ?? new Pool({
  max: 5,
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 30_000,
});

globalDatabase.ghostshiftPool = database;
database.on('error', () => console.error('An idle database connection failed.'));

export type Project = {
  id: string;
  name: string;
  brief: string;
  status: 'draft';
  created_at: Date;
};

export async function listProjects(): Promise<Project[]> {
  const result = await database.query<Project>(
    'SELECT id, name, brief, status, created_at FROM projects ORDER BY created_at DESC LIMIT 50'
  );
  return result.rows;
}
