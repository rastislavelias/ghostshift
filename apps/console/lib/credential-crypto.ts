import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, link, unlink } from 'node:fs/promises';
import { dirname } from 'node:path';
export function sealCredential(value: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from('ghostshift:openai:v1'));
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), encrypted.toString('base64')].join('.');
}
export function unsealCredential(value: string, key: Buffer): string {
  const [version, iv, tag, encrypted, extra] = value.split('.');
  if (version !== 'v1' || !iv || !tag || !encrypted || extra) throw new Error('Invalid credential envelope');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
  decipher.setAAD(Buffer.from('ghostshift:openai:v1'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64')), decipher.final()]).toString('utf8');
}
export function parseAPIKey(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Enter an OpenAI API key.');
  const key = value.trim();
  if (key.length < 20 || key.length > 512 || !/^[\x21-\x7e]+$/.test(key)) throw new Error('Enter a key of 20–512 characters without spaces or line breaks.');
  return key;
}
export async function credentialKey(create = false): Promise<Buffer> {
  const path = process.env.CREDENTIAL_KEY_PATH || '/var/lib/ghostshift/secrets/credentials.key';
  if (create) {
    await mkdir(dirname(path), { recursive: true, mode: 0o700 });
    const temporary = `${path}.${randomUUID()}.tmp`;
    await writeFile(temporary, randomBytes(32), { flag: 'wx', mode: 0o600 });
    try { await link(temporary, path); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
    finally { await unlink(temporary); }
  }
  const key = await readFile(/* turbopackIgnore: true */ path);
  if (key.length !== 32) throw new Error('Credential encryption key unavailable');
  return key;
}
