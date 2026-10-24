import pg from 'pg';
import { readdir, readFile } from 'node:fs/promises';

const client = new pg.Client({ connectionTimeoutMillis: 10_000 });
await client.connect();
try {
  await client.query('BEGIN');
  // Serialize application startup when more than one instance starts at once.
  await client.query('SELECT pg_advisory_xact_lock(71420501)');
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  const directory = new URL('../db/migrations/', import.meta.url);
  for (const name of (await readdir(directory)).filter(n => /^\d{3}_[a-z0-9_]+\.sql$/.test(n)).sort()) {
    const existing = await client.query('SELECT 1 FROM schema_migrations WHERE name = $1', [name]);
    if (existing.rowCount) continue;
    await client.query(await readFile(new URL(name, directory), 'utf8'));
    await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [name]);
    console.log(`Applied migration: ${name}`);
  }
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  console.error('Database migration failed:', error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
