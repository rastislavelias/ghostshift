import { database } from './db';
import { WorkflowError } from './workflow';
import { selectConfiguredModel } from './provider-configuration';
import { attemptLimit, outputLimit } from './providers';
import { managerContext, managerText } from './manager-contract';
export async function managerDetail(id: string) {
  const conversation = await database.managerConversation.findUnique({ where: { id }, include: {
    messages: { orderBy: [{ created_at: 'desc' }, { id: 'desc' }], take: 100 },
    briefs: { orderBy: { version: 'desc' }, take: 30 },
    jobs: { orderBy: { created_at: 'desc' }, take: 20, select: { id: true, kind: true, status: true, provider: true, model: true, attempts: true, max_attempts: true, input_tokens: true, output_tokens: true, error: true } },
  } });
  if (conversation) conversation.messages.reverse();
  return conversation;
}
function text(value: unknown, max: number, empty = false) {
  try { return managerText(value, max, empty); } catch (e) { throw new WorkflowError((e as Error).message); }
}
export async function managerAction(id: string, body: Record<string, unknown>) {
  if (!Number.isSafeInteger(body.revision)) throw new WorkflowError('A current revision is required.');
  return database.$transaction(async tx => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM manager_conversations WHERE id=${id}::uuid FOR UPDATE`;
    if (!rows.length) throw new WorkflowError('Conversation not found.', 404);
    const c = await tx.managerConversation.findUniqueOrThrow({ where: { id } });
    if (c.revision !== body.revision) throw new WorkflowError('Conversation changed. Reload and try again.', 409);
    const active = await tx.managerJob.findFirst({ where: { conversation_id: id, status: { in: ['queued','running'] } } });
    const latest = await tx.managerBrief.findFirst({ where: { conversation_id: id }, orderBy: { version: 'desc' } });
    if (body.action === 'cancel') {
      if (!active) throw new WorkflowError('No active request.', 409);
      await tx.managerJob.update({ where: { id: active.id }, data: { status: 'cancelled', lease_owner: null, lease_until: null, finished_at: new Date() } });
    } else {
      if (active) throw new WorkflowError('Finish or cancel the active request first.', 409);
      if (body.action === 'memory') {
        await tx.managerConversation.update({ where: { id }, data: { memory: text(body.memory, 4000, true) } });
      } else if (body.action === 'save_brief' || body.action === 'approve') {
        if (c.project_id) throw new WorkflowError('This brief has already been handed off. Continue in Projects.', 409);
        if (!latest || latest.id !== body.briefId) throw new WorkflowError('Review the latest brief first.', 409);
        if (body.action === 'save_brief') {
          await tx.managerBrief.create({ data: { conversation_id: id, version: latest.version + 1, content: text(body.content, 10000), source: 'human' } });
        } else {
          const project = await tx.project.create({ data: { name: c.title, brief: latest.content } });
          await tx.managerBrief.update({ where: { id: latest.id }, data: { approved_at: new Date() } });
          await tx.managerConversation.update({ where: { id }, data: { project_id: project.id } });
          await tx.projectEvent.create({ data: { project_id: project.id, kind: 'manager_brief_approved', detail: { conversationId: id, briefId: latest.id, version: latest.version } } });
        }
      } else if (body.action === 'chat' || body.action === 'brief') {
        if (body.action === 'brief' && c.project_id) throw new WorkflowError('Continue documentation changes in the linked project.', 409);
        if (!['ollama','openai'].includes(String(body.provider))) throw new WorkflowError('Choose Ollama or OpenAI.');
        let selected;
        try { selected = await selectConfiguredModel(body.provider, body.model, tx); } catch { throw new WorkflowError('Choose a configured model.'); }
        if (selected.paid && body.allowPaid !== true) throw new WorkflowError('Allow API charges and sending this conversation context to the provider.');
        if (body.action === 'chat') await tx.managerMessage.create({ data: { conversation_id: id, role: 'user', content: text(body.message, 4000) } });
        const messages = await tx.managerMessage.findMany({ where: { conversation_id: id }, orderBy: [{ created_at: 'desc' }, { id: 'desc' }], take: 50 });
        if (!messages.length) throw new WorkflowError('Discuss your idea before preparing a brief.');
        const input = {
          revision: c.revision + 1, title: c.title, confirmedMemory: c.memory, summary: c.summary,
          messages: managerContext(messages.reverse()), kind: body.action,
          previousBrief: body.action === 'brief' ? latest?.content || '' : '',
        };
        if (JSON.stringify(input).length > 32000) throw new WorkflowError('This context exceeds the provider input limit. Shorten the saved memory or brief before retrying.');
        await tx.managerJob.create({ data: { conversation_id: id, kind: body.action, provider: selected.provider, model: selected.model,
          max_attempts: attemptLimit(), max_output_tokens: outputLimit(), input } });
      } else throw new WorkflowError('Unknown manager action.');
    }
    await tx.managerConversation.update({ where: { id }, data: { revision: { increment: 1 } } });
    return { saved: true };
  }, { timeout: 10000 });
}
