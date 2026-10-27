'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
type Status = { configured: boolean; source: 'environment' | 'configuration' | null; updatedAt: string | null };
export function OpenAIForm({ initialStatus }: { initialStatus: Status }) {
  const [status, setStatus] = useState(initialStatus), [key, setKey] = useState('');
  const [pending, setPending] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const router = useRouter();
  async function mutate(action: 'save' | 'remove') {
    setPending(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/configuration/openai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...(action === 'save' ? { apiKey: key } : {}) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not update configuration.');
      setStatus(result); setKey(''); setMessage(action === 'save' ? 'OpenAI API key saved. It is available for new planning and development requests.' : 'Saved OpenAI API key removed.'); router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not reach the server.'); }
    finally { setPending(false); }
  }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void mutate('save'); }
  const managed = status.source === 'environment';
  return <Card className="max-w-3xl">
    <CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-lg border bg-muted"><KeyRound className="size-5" aria-hidden="true" /></span><CardTitle><h2>OpenAI</h2></CardTitle></div><Badge variant={status.configured ? 'secondary' : 'outline'}>{status.configured ? 'Key configured' : 'Not configured'}</Badge></div><CardDescription className="pt-2">Manage the API key used by OpenAI models in this workspace.</CardDescription></CardHeader>
    <CardContent className="space-y-6">
      {managed ? <p className="rounded-lg border bg-muted p-4 text-sm leading-relaxed">This key is managed by <code>OPENAI_API_KEY</code> on the server. Remove that environment setting to manage the key from this page.</p> : <form onSubmit={submit} className="space-y-4" aria-busy={pending}>
        <div className="space-y-2"><Label htmlFor="openai-api-key">{status.configured ? 'Replace API key' : 'API key'}</Label><Input id="openai-api-key" name="openai-api-key" type="password" autoComplete="new-password" autoCapitalize="none" spellCheck={false} placeholder={status.configured ? 'Enter a new key to replace the saved key' : 'sk-…'} value={key} onChange={event => setKey(event.target.value)} maxLength={512} disabled={pending} aria-describedby="openai-key-help" /><p id="openai-key-help" className="text-xs leading-relaxed text-muted-foreground">The saved key is never displayed again. Leave this field empty to keep your current key.</p></div>
        <div className="flex flex-wrap gap-3"><Button type="submit" disabled={pending || key.trim().length < 20}>{pending ? 'Saving…' : status.configured ? 'Replace key' : 'Save key'}</Button>{status.configured && <Button type="button" variant="outline" disabled={pending} onClick={() => void mutate('remove')}>Remove saved key</Button>}</div>
      </form>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {message && <p role="status" className="text-sm text-primary">{message}</p>}
      {status.updatedAt && <p className="text-xs text-muted-foreground">Last updated: {new Date(status.updatedAt).toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC')}</p>}
      <div className="flex gap-3 rounded-lg border bg-muted/40 p-4"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /><div className="space-y-2 text-sm leading-relaxed text-muted-foreground"><p>Stored encrypted on the server. Saving a key does not call OpenAI or start a paid request.</p><p>Select an OpenAI model and authorize API charges when starting a planning or development job. Saving a key does not verify its validity or your account’s model access.</p></div></div>
    </CardContent>
  </Card>;
}
