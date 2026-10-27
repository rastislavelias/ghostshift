import { openAIStatus } from '@/lib/provider-credentials';
import { OpenAIForm } from './openai-form';
export const dynamic = 'force-dynamic';
export default async function Configuration() {
  const status = await openAIStatus();
  return <main className="mx-auto w-full max-w-7xl space-y-8 p-5 md:p-8"><header className="space-y-2"><h1 className="text-3xl font-semibold tracking-tight">Configuration</h1><p className="text-sm text-muted-foreground">Manage provider credentials for your workspace.</p></header><OpenAIForm initialStatus={status} /></main>;
}
