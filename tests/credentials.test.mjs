import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdtemp, stat, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sealCredential, unsealCredential, parseAPIKey, credentialKey } from '../apps/console/lib/credential-crypto.ts';
test('credentials are encrypted with authenticated random envelopes and never accepted after tampering', () => {
  const key = randomBytes(32), value = 'sk-synthetic-test-key-123456789';
  const encrypted = sealCredential(value, key);
  assert.ok(!encrypted.includes(value)); assert.equal(unsealCredential(encrypted, key), value);
  assert.notEqual(encrypted, sealCredential(value, key));
  assert.throws(() => unsealCredential(encrypted, randomBytes(32)));
  const parts = encrypted.split('.'); const bytes = Buffer.from(parts[3], 'base64'); bytes[0] ^= 1; parts[3] = bytes.toString('base64');
  assert.throws(() => unsealCredential(parts.join('.'), key));
  assert.equal(parseAPIKey(` ${value} `), value);
  for (const invalid of ['', 'short', 'x'.repeat(513), 'x'.repeat(30)+'\r\nAuthorization: injected']) assert.throws(() => parseAPIKey(invalid));
});
test('the private encryption key is stable and atomically initialized under concurrent saves', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'ghostshift-key-test-'));
  const previous = process.env.CREDENTIAL_KEY_PATH; process.env.CREDENTIAL_KEY_PATH = join(directory, 'private', 'credentials.key');
  try {
    const keys = await Promise.all(Array.from({ length: 8 }, () => credentialKey(true)));
    assert.ok(keys.every(key => key.equals(keys[0]))); assert.equal(keys[0].length, 32);
    assert.equal((await stat(process.env.CREDENTIAL_KEY_PATH)).mode & 0o777, 0o600);
    assert.deepEqual(await readdir(join(directory, 'private')), ['credentials.key']);
    assert.ok((await credentialKey()).equals(keys[0]));
  } finally {
    if (previous === undefined) delete process.env.CREDENTIAL_KEY_PATH; else process.env.CREDENTIAL_KEY_PATH = previous;
    await rm(directory, { recursive: true, force: true });
  }
});
