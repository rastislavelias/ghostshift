import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, readdir, rm, mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
const exec = promisify(execFile);
const git = (cwd: string, args: string[], signal?: AbortSignal) => exec('git', ['-c', 'core.hooksPath=/dev/null', '-c', 'protocol.file.allow=never', ...args], { cwd, signal, timeout: 60000, maxBuffer: 300000, env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_CONFIG_NOSYSTEM: '1' } });
async function manifest(directory: string, prefix = ''): Promise<string[]> {
  const result: string[] = [];
  for (const entry of await readdir(join(directory, prefix), { withFileTypes: true })) {
    if (['node_modules', '.next', '.git'].includes(entry.name)) continue;
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) result.push(...await manifest(directory, path));
    else if (entry.isFile()) result.push(path);
  }
  return result.sort();
}
export async function loadRepository(repository: string, base: string | null, signal: AbortSignal) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error('repository_not_allowed');
  const directory = await mkdtemp(join(tmpdir(), 'ghostshift-repository-'));
  try {
    const template = process.env.PLAYGROUND_TEMPLATE || join(process.cwd(), 'examples/playground');
    const names = await manifest(template);
    // Fixture mode only uses a local bare Git repository inside the disposable test image.
    const fixture = process.env.GHOSTSHIFT_TEST_FIXTURE === '1' && repository === 'ghostshift/test-fixture';
    const url = fixture ? '/fixtures/playground.git' : `https://github.com/${repository}.git`;
    if (fixture) await exec('git', ['clone', '--bare', url, 'repo.git'], { cwd: directory, signal, timeout: 60000 });
    else await git(directory, ['clone', '--bare', '--depth=1', url, 'repo.git'], signal);
    const repo = join(directory, 'repo.git');
    if (base && !/^[a-f0-9]{40}$/.test(base)) throw new Error('invalid_base_commit');
    if (base && !fixture) await git(repo, ['fetch', '--depth=1', 'origin', base], signal);
    const commit = (await git(repo, ['rev-parse', `${base || 'HEAD'}^{commit}`], signal)).stdout.trim();
    const tree = (await git(repo, ['ls-tree', '-r', commit], signal)).stdout.trim().split('\n');
    const entries = tree.map(line => line.split('\t'));
    if (entries.some(([mode]) => !mode.startsWith('100644 blob ')) || JSON.stringify(entries.map(([, name]) => name).sort()) !== JSON.stringify(names)) throw new Error('repository_manifest_mismatch');
    const files: Record<string, string> = {};
    for (const name of names) {
      files[name] = (await git(repo, ['show', `${commit}:${name}`], signal)).stdout;
      if (!['app/page.tsx', 'app/globals.css'].includes(name) && files[name] !== await readFile(join(template, name), 'utf8')) throw new Error('protected_repository_file_changed');
    }
    return { commit, files };
  } finally { await rm(directory, { recursive: true, force: true }); }
}
export async function createPatch(base: Record<string, string>, changed: Record<string, string>) {
  const directory = await mkdtemp(join(tmpdir(), 'ghostshift-diff-'));
  try {
    await git(directory, ['init', '-q']);
    for (const [name, content] of Object.entries(base)) { await mkdir(dirname(join(directory, name)), { recursive: true }); await writeFile(join(directory, name), content); }
    await git(directory, ['add', '.']);
    for (const [name, content] of Object.entries(changed)) await writeFile(join(directory, name), content);
    return (await git(directory, ['diff', '--no-ext-diff', '--no-color', '--', 'app/page.tsx', 'app/globals.css'])).stdout;
  } finally { await rm(directory, { recursive: true, force: true }); }
}
