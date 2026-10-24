import pg from 'pg';
import { spawn } from 'node:child_process';
import { databaseUrl } from './database-url.mjs';

const baseline = '20261024000000_baseline';
const client = new pg.Client({ connectionString: databaseUrl(), connectionTimeoutMillis: 10_000 });

function prisma(...args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['node_modules/prisma/build/index.js', ...args], {
      stdio: 'inherit',
      env: { ...process.env, CHECKPOINT_DISABLE: '1' },
    });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve() : reject(new Error('Prisma migration command failed.')));
  });
}

try {
  await client.connect();
  // Keep baseline adoption and deployment serialized across concurrent startups.
  await client.query("SET statement_timeout = '60s'");
  await client.query('SELECT pg_advisory_lock(71420501)');
  const { rows: [tables] } = await client.query(`SELECT
    to_regclass('public.schema_migrations') IS NOT NULL AS legacy,
    to_regclass('public._prisma_migrations') IS NOT NULL AS prisma`);
  const recorded = tables.prisma
    ? (await client.query('SELECT count(*)::int AS count FROM public._prisma_migrations')).rows[0].count
    : 0;
  if (tables.legacy && recorded === 0) {
    const history = await client.query('SELECT name FROM public.schema_migrations ORDER BY name');
    if (history.rows.length !== 1 || history.rows[0].name !== '001_projects.sql') {
      throw new Error('Unrecognized legacy migration history; baseline adoption stopped.');
    }
    // Prisma's schema comparison does not cover PostgreSQL CHECK constraints.
    const checks = await client.query(`SELECT conname, pg_get_constraintdef(oid) AS definition
      FROM pg_constraint WHERE conrelid = 'public.projects'::regclass AND contype = 'c' AND convalidated
      ORDER BY conname`);
    const expected = [
      ['projects_brief_check', 'CHECK (((char_length(brief) >= 1) AND (char_length(brief) <= 10000)))'],
      ['projects_name_check', 'CHECK (((char_length(name) >= 1) AND (char_length(name) <= 100)))'],
      ['projects_status_check', "CHECK ((status = 'draft'::text))"],
    ];
    if (JSON.stringify(checks.rows.map(r => [r.conname, r.definition])) !== JSON.stringify(expected)) {
      throw new Error('Legacy CHECK constraints differ; baseline adoption stopped.');
    }
    // Compare to the immutable baseline, not a future version of the application schema.
    await prisma('migrate', 'diff', '--from-config-datasource', '--to-schema', 'prisma/baseline.prisma', '--exit-code');
    await prisma('migrate', 'resolve', '--applied', baseline);
    console.log('Adopted the legacy schema without changing project data.');
  }
  await prisma('migrate', 'deploy');
} catch (error) {
  // Do not log database URLs or driver error details containing credentials.
  console.error('Database migration failed. Check migration history and schema compatibility.');
  if (error.message?.includes('baseline adoption stopped')) console.error(error.message);
  process.exitCode = 1;
} finally {
  await client.end(); // Also releases the session advisory lock.
}
