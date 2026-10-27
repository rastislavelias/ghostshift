import { modelCatalog, selectModel } from './providers.ts';
import { openAIStatus } from './provider-credentials.ts';
export async function configuredModels() { return modelCatalog((await openAIStatus()).configured); }
export async function selectConfiguredModel(provider: unknown, model: unknown, client?: Parameters<typeof openAIStatus>[0]) {
  return selectModel(provider, model, provider === 'openai' ? (await openAIStatus(client)).configured : false);
}
