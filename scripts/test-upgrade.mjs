// Destructive cleanup is limited to this explicitly disposable test project.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const project = 'ghostshift-upgrade-test';
const env = { ...process.env, GHOSTSHIFT_PORT: process.env.UPGRADE_TEST_PORT || '3001' };
function docker(args, { input, allowFailure = false } = {}) {
  const result = spawnSync('docker', args, { env, input, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (!allowFailure && result.status !== 0) {
    throw new Error(`${args.join(' ')} failed:\n${result.stdout}\n${result.stderr}`);
  }
  return result;
}
function compose(args, options) {
  return docker(['compose', '-f', 'compose.yaml', '-f', 'compose.test.yaml', '-p', project, ...args], options);
}
function sql(input) {
  return compose(['exec', '-T', 'database', 'psql', '-U', 'ghostshift', '-d', 'ghostshift', '-v', 'ON_ERROR_STOP=1', '-At'], { input }).stdout.trim();
}
const existing = compose(['ps', '-aq']).stdout.trim();
const volume = docker(['volume', 'inspect', `${project}_postgres-data`], { allowFailure: true });
assert.equal(existing, '', 'Refusing to reuse existing upgrade test containers.');
assert.notEqual(volume.status, 0, 'Refusing to reuse an existing upgrade test volume.');

const id = 'fd575e2b-14e9-49cc-8f78-2e6b88c43c60';
try {
  compose(['up', '-d', '--wait', 'database']);
  sql(`CREATE TABLE schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now());
    ${readFileSync('db/migrations/001_projects.sql', 'utf8')}
    INSERT INTO schema_migrations (name) VALUES ('001_projects.sql');
    INSERT INTO projects (id, name, brief, created_at) VALUES
      ('${id}', 'Legacy project', 'Preserve this brief and its UUID.', '2026-01-01T12:00:00Z');
    ALTER TABLE projects DROP CONSTRAINT projects_name_check;`);
  const missingCheck = compose(['run', '--rm', '--build', 'migrate'], { allowFailure: true });
  assert.notEqual(missingCheck.status, 0, 'Missing CHECK constraint must block baseline adoption.');
  assert.match(missingCheck.stderr + missingCheck.stdout, /CHECK constraints differ/);
  assert.equal(sql(`SELECT id FROM projects;`), id);

  sql(`ALTER TABLE projects ADD CONSTRAINT projects_name_check CHECK (char_length(name) BETWEEN 1 AND 100);
    ALTER TABLE projects ADD COLUMN unexpected TEXT;`);
  const drift = compose(['run', '--rm', 'migrate'], { allowFailure: true });
  assert.notEqual(drift.status, 0, 'Schema drift must block baseline adoption.');
  assert.equal(sql(`SELECT to_regclass('public._prisma_migrations') IS NULL;`), 't');
  assert.equal(sql(`SELECT id FROM projects;`), id);
  sql('ALTER TABLE projects DROP COLUMN unexpected;');

  compose(['up', '--build', '-d', '--wait']);
  async function checkProject() {
    const response = await fetch(`http://127.0.0.1:${env.GHOSTSHIFT_PORT}/api/projects`);
    assert.equal(response.status, 200);
    const { projects } = await response.json();
    assert.deepEqual(projects.map(({id,name,brief,status,created_at}) => ({id,name,brief,status,created_at})), [{ id, name: 'Legacy project', brief: 'Preserve this brief and its UUID.', status: 'draft', created_at: '2026-01-01T12:00:00.000Z' }]);
  }
  await checkProject();
  assert.equal(sql('SELECT name FROM schema_migrations;'), '001_projects.sql');
  assert.equal(sql('SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL;'), '4');
  assert.equal(sql("SELECT count(*) FROM pg_constraint WHERE conrelid = 'projects'::regclass AND contype = 'c' AND convalidated;"), '5');
  compose(['down']);
  compose(['up', '-d', '--wait']);
  await checkProject();
  console.log('Legacy upgrade, drift rejection, constraints, API compatibility, and restart persistence passed.');
} finally {
  compose(['down', '-v']);
}
