import { apiError, readMutation } from '@/lib/api';
import { WorkflowError } from '@/lib/workflow';
import { openAIStatus, saveOpenAIKey, removeOpenAIKey } from '@/lib/provider-credentials';
import { parseAPIKey } from '@/lib/credential-crypto';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };
export async function GET() {
  try { return Response.json(await openAIStatus(), { headers }); }
  catch (error) { return apiError(error); }
}
export async function POST(request: Request) {
  try {
    const body = await readMutation(request);
    if (process.env.OPENAI_API_KEY) throw new WorkflowError('This key is managed by OPENAI_API_KEY on the server. Remove that setting before managing it here.', 409);
    if (body.action === 'save') {
      let key: string;
      try { key = parseAPIKey(body.apiKey); } catch { throw new WorkflowError('Enter an API key of 20–512 characters without spaces or line breaks.'); }
      await saveOpenAIKey(key);
    } else if (body.action === 'remove') await removeOpenAIKey();
    else throw new WorkflowError('Unknown configuration action.');
    return Response.json(await openAIStatus(), { headers });
  } catch (error) { return apiError(error); }
}
