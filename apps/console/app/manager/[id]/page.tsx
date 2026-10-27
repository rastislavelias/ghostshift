import { notFound } from 'next/navigation';
import { managerDetail } from '@/lib/manager';
import { configuredModels } from '@/lib/provider-configuration';
import { isUuid } from '@/lib/planning-contract';
import { ManagerWorkspace } from './workspace';
export const dynamic = 'force-dynamic';
export default async function Conversation({ params }: { params: Promise<{id:string}> }) {
  const {id}=await params; if (!isUuid(id)) notFound();
  const conversation=await managerDetail(id); if (!conversation) notFound();
  const models=(await configuredModels()).filter(m=>m.provider==='ollama'||m.provider==='openai');
  return <main className="mx-auto max-w-7xl space-y-6 p-5 md:p-8"><header className="space-y-2"><h1 className="text-3xl font-semibold wrap-anywhere">{conversation.title}</h1><p className="text-sm text-muted-foreground">Discovery with your project manager. Drafts and suggestions require your review.</p></header><ManagerWorkspace conversation={JSON.parse(JSON.stringify(conversation))} models={models}/></main>;
}
