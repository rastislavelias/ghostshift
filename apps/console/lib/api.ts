import { WorkflowError } from './workflow';
export async function readMutation(request: Request): Promise<Record<string, unknown>> {
  const origin = request.headers.get('origin');
  if (origin) {
    try { if (new URL(origin).host !== request.headers.get('host')) throw new Error(); }
    catch { throw new WorkflowError('Cross-origin requests are not allowed.', 403); }
  }
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new WorkflowError('Send application/json.', 415);
  // Limit the streamed body as well as Content-Length.
  const reader = request.body?.getReader();
  if (!reader) throw new WorkflowError('Provide a JSON request body.');
  let size = 0; const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 100000) { await reader.cancel(); throw new WorkflowError('Request is too large.', 413); }
      chunks.push(value);
    }
    const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error();
    return data;
  } catch (error) {
    if (error instanceof WorkflowError) throw error;
    throw new WorkflowError('Provide a valid JSON object.');
  }
}
export function apiError(error: unknown) {
  return error instanceof WorkflowError
    ? Response.json({ error: error.message }, { status: error.status })
    : Response.json({ error: 'The operation could not be completed. Please try again.' }, { status: 503 });
}
