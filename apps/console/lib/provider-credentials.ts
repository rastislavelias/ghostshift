import { database } from './db.ts';
import { credentialKey, sealCredential, unsealCredential, parseAPIKey } from './credential-crypto.ts';
export async function openAIKey(): Promise<string | undefined> {
  // Server-managed environment credentials take precedence, preserving existing installations.
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  const record = await database.providerCredential.findUnique({ where: { provider: 'openai' } });
  if (!record) return undefined;
  return unsealCredential(record.ciphertext, await credentialKey());
}
export async function openAIStatus(client: Pick<typeof database, 'providerCredential'> = database) {
  if (process.env.OPENAI_API_KEY) return { configured: true, source: 'environment' as const, updatedAt: null };
  const record = await client.providerCredential.findUnique({ where: { provider: 'openai' }, select: { updated_at: true } });
  return { configured: !!record, source: record ? 'configuration' as const : null, updatedAt: record?.updated_at.toISOString() || null };
}
export async function saveOpenAIKey(value: unknown) {
  if (process.env.OPENAI_API_KEY) throw new Error('environment_managed');
  const key = parseAPIKey(value);
  const ciphertext = sealCredential(key, await credentialKey(true));
  await database.providerCredential.upsert({ where: { provider: 'openai' }, create: { provider: 'openai', ciphertext }, update: { ciphertext } });
}
export async function removeOpenAIKey() {
  if (process.env.OPENAI_API_KEY) throw new Error('environment_managed');
  await database.providerCredential.deleteMany({ where: { provider: 'openai' } });
}
