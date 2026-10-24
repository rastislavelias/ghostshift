'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { planFields, parsePlan, type PlanContent } from '@/lib/planning-contract';
import type { ModelOption } from '@/lib/providers';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Plan = { id: string; version: number; source: string; content: PlanContent; created_at: string };
type Job = { id: string; provider: string; model: string; status: string; attempts: number; max_attempts: number; max_output_tokens: number; error: string | null; created_at: string;
  runs: Array<{ id: string; number: number; status: string; input_tokens: number | null; output_tokens: number | null; duration_ms: number | null; error: string | null }> };
type Project = { id: string; revision: number; status: string; feedback: string | null; approved_plan_id: string | null; approved_at: string | null;
  plans: Plan[]; jobs: Job[]; events: Array<{ id: string; kind: string; detail: Record<string, unknown>; created_at: string }> };
const eventLabels: Record<string, string> = { development_start: 'Development requested', development_cancel: 'Owner cancelled development', development_accept: 'Owner accepted the result', development_request_changes: 'Owner requested a code revision', development_finished: 'Development checks completed', generate: 'Planning requested', planning_started: 'Worker started', plan_ready: 'Plan ready for review', save: 'Owner saved a new version', approve: 'Owner approved the plan', request_changes: 'Owner requested changes', cancel: 'Owner cancelled planning', planning_retry: 'Retry scheduled', planning_failed: 'Planning failed', worker_recovered: 'Interrupted job recovered' };
const formatTime = (value: string) => new Date(value).toISOString().replace('T', ' ').replace('.000Z', ' UTC');
const fieldClass = 'rounded-lg border border-input bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring';
export function ProjectWorkflow({ project, models, outputLimit, attemptLimit }: { project: Project; models: ModelOption[]; outputLimit: number; attemptLimit: number }) {
  const router = useRouter();
  const latest = project.plans[0];
  const active = project.jobs.find(j => ['queued', 'running'].includes(j.status));
  const previousModel = project.jobs[0];
  const initial = models.findIndex(m => m.provider === previousModel?.provider && m.model === previousModel?.model);
  const [modelIndex, setModelIndex] = useState(initial >= 0 ? initial : 0);
  const [maxTokens, setMaxTokens] = useState(outputLimit);
  const [allowPaid, setAllowPaid] = useState(false);
  const [feedback, setFeedback] = useState(project.feedback || '');
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState<PlanContent | undefined>(latest?.content);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [viewedVersion, setViewedVersion] = useState(latest?.version);
  const viewed = project.plans.find(p => p.version === viewedVersion) || latest;
  const selected = models[modelIndex];
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => { if (document.visibilityState === 'visible') router.refresh(); }, 3000);
    return () => clearInterval(timer);
  }, [active?.id, router]);
  async function act(action: string) {
    setPending(true); setError(''); setMessage('');
    try {
      if (action === 'save') parsePlan(content);
      const response = await fetch(`/api/projects/${project.id}/workflow`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        action, revision: project.revision, planId: latest?.id, content: action === 'save' ? content : undefined,
        feedback, provider: selected?.provider, model: selected?.model, maxOutputTokens: maxTokens, allowPaid,
      }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'The action failed.');
      setEditing(false); setMessage('Saved.'); router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : 'Connection failed.'); }
    finally { setPending(false); }
  }
  return <div className="space-y-7">
    <Card><CardHeader><CardTitle><h2>Project plan</h2></CardTitle></CardHeader><CardContent className="space-y-6">
      {project.status === 'approved' && <p role="status" className="rounded-lg border border-status-border bg-success p-4 text-sm text-primary">Version {latest?.version} approved on {formatTime(project.approved_at!)}. Ready for a development task below. Approval does not start coding or deployment.</p>}
      {active ? <div role="status" className="space-y-3 rounded-lg border p-4"><p>Planning is {active.status}. This page updates automatically.</p><p className="text-sm text-muted-foreground">{active.provider} · {active.model} · Attempt {active.attempts} / {active.max_attempts}{active.error ? ` · ${active.error}` : ''}</p><Button variant="outline" onClick={() => act('cancel')} disabled={pending}>Cancel planning</Button></div> : project.status !== 'approved' && <div className="space-y-4 rounded-lg border p-4">
        <div className="grid gap-4 md:grid-cols-[1fr_160px]">
          <div className="space-y-2"><Label htmlFor="planner-model">Planning model</Label><select id="planner-model" className={`${fieldClass} w-full`} value={modelIndex} onChange={e => { setModelIndex(Number(e.target.value)); setAllowPaid(false); }} disabled={pending || !models.length}>{models.map((m, i) => <option value={i} key={`${m.provider}/${m.model}`}>{m.label}</option>)}</select></div>
          <div className="space-y-2"><Label htmlFor="output-limit">Output token limit</Label><Input id="output-limit" type="number" min={256} max={outputLimit} value={maxTokens} onChange={e => setMaxTokens(Number(e.target.value))} disabled={pending} /></div>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">Up to {attemptLimit} attempts per request. Token usage is recorded when reported by the provider. OpenAI and compatible APIs become available after the owner configures keys and model names on the server.</p>
        {selected?.paid && <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={allowPaid} onChange={e => setAllowPaid(e.target.checked)} className="mt-1 accent-primary" />I allow this planning request and its retries to use the selected paid API.</label>}
        {project.feedback && <p className="text-sm whitespace-pre-wrap text-muted-foreground">Requested changes: {project.feedback}</p>}
        <Button onClick={() => act('generate')} disabled={pending || !selected || (selected.paid && !allowPaid) || editing}>{pending ? 'Submitting…' : latest ? 'Generate revised plan' : 'Generate project plan'}</Button>
      </div>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}<p role="status" className="text-sm text-primary">{message}</p>
      {latest && <>
        <div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><Label htmlFor="plan-version">Plan version</Label><select id="plan-version" className={fieldClass} value={viewed?.version} disabled={editing} onChange={e => setViewedVersion(Number(e.target.value))}>{project.plans.map(plan => <option key={plan.id} value={plan.version}>Version {plan.version} · {plan.source === 'ai' ? 'AI draft' : 'Owner edit'}</option>)}</select></div><Badge variant="outline">{viewed?.id === project.approved_plan_id ? 'Approved version' : 'Not approved'}</Badge></div>
        {viewed?.version !== latest.version && <p className="text-sm text-muted-foreground">Historical version. Review actions always apply to the latest version.</p>}
        <div className="grid gap-6">{planFields.map(([key, label]) => <section key={key} className="space-y-2"><h3 className="font-medium text-primary">{label}</h3>{editing ? <><Label htmlFor={`plan-${key}`} className="sr-only">{label}</Label><Textarea id={`plan-${key}`} value={content?.[key] || ''} onChange={e => setContent({ ...content!, [key]: e.target.value })} maxLength={8000} rows={5} disabled={pending} /></> : <p className="text-sm leading-7 whitespace-pre-wrap wrap-anywhere">{viewed?.content[key]}</p>}</section>)}</div>
        {!active && viewed?.id === latest.id && <div className="space-y-5 border-t pt-5">
          {editing ? <div className="flex flex-wrap gap-3"><Button onClick={() => act('save')} disabled={pending}>Save as new version</Button><Button variant="outline" disabled={pending} onClick={() => { setContent(latest.content); setEditing(false); }}>Discard edits</Button></div> : <div className="flex flex-wrap gap-3">{project.status === 'awaiting_review' && <Button onClick={() => act('approve')} disabled={pending}>Approve version {latest.version}</Button>}<Button variant="outline" onClick={() => setEditing(true)} disabled={pending}>Edit plan</Button></div>}
          {!editing && <div className="space-y-3"><Label htmlFor="review-feedback">Changes or answers to the planner’s questions</Label><Textarea id="review-feedback" value={feedback} maxLength={4000} rows={3} placeholder="Describe what should change, or answer the questions above." onChange={e => setFeedback(e.target.value)} disabled={pending} /><Button variant="outline" onClick={() => act('request_changes')} disabled={pending || !feedback.trim()}>Request changes{project.status === 'approved' ? ' and revoke approval' : ''}</Button></div>}
        </div>}
      </>}
      {!latest && !active && <p className="text-sm text-muted-foreground">Your brief is saved. Choose a model to create the first reviewable plan.</p>}
    </CardContent></Card>
    <Card><CardHeader><CardTitle><h2>Planning runs</h2></CardTitle></CardHeader><CardContent className="space-y-4">
      {!project.jobs.length && <p className="text-sm text-muted-foreground">No planning requests yet.</p>}
      {project.jobs.map(job => <article key={job.id} className="space-y-2 rounded-lg border p-4 text-sm"><div className="flex flex-wrap justify-between gap-2"><p className="font-medium wrap-anywhere">{job.provider} · {job.model}</p><Badge variant="outline">{job.status}</Badge></div><p className="text-xs text-muted-foreground">{formatTime(job.created_at)} · Output limit {job.max_output_tokens} · {job.attempts}/{job.max_attempts} attempts</p>{job.error && <p className="text-destructive">{job.error}. You can submit a new request after a terminal failure.</p>}{job.runs.map(run => <p key={run.id} className="text-xs leading-relaxed text-muted-foreground">Attempt {run.number}: {run.status} · Input {run.input_tokens ?? 'unknown'} / output {run.output_tokens ?? 'unknown'} tokens{run.duration_ms !== null ? ` · ${(run.duration_ms / 1000).toFixed(1)}s` : ''}</p>)}</article>)}
      <p className="text-xs text-muted-foreground">Unknown usage is not zero; failed or interrupted API requests can still be billed. No monetary estimate is inferred from token counts.</p>
    </CardContent></Card>
    <Card><CardHeader><CardTitle><h2>Activity</h2></CardTitle></CardHeader><CardContent><ol className="space-y-4">{project.events.map(event => <li key={event.id} className="border-l-2 pl-4 text-sm"><p>{eventLabels[event.kind] || event.kind}{typeof event.detail.version === 'number' ? ` · Version ${event.detail.version}` : ''}</p><time className="text-xs text-muted-foreground" dateTime={event.created_at}>{formatTime(event.created_at)}</time>{typeof event.detail.feedback === 'string' && <p className="mt-2 whitespace-pre-wrap wrap-anywhere text-muted-foreground">{event.detail.feedback}</p>}</li>)}</ol>{!project.events.length && <p className="text-sm text-muted-foreground">The brief is ready. Activity will appear here.</p>}</CardContent></Card>
  </div>;
}
