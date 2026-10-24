'use client';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { type ModelOption } from '@/lib/providers';
import { type Check } from '@/lib/development-contract';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
type Job = { id: string; plan_id: string; task: string; criteria: string; repository: string; base_commit: string | null; status: string; attempts: number; max_attempts: number; provider: string; model: string; summary: string | null; patch: string | null; checks: Check[] | null; feedback: string | null; error: string | null; runs: Array<{ number: number; status: string; input_tokens: number | null; output_tokens: number | null; error: string | null }> };
type Project = { id: string; revision: number; status: string; approved_plan_id: string | null; development_jobs: Job[]; plans: Array<{ id: string; content: { tasks?: string; acceptanceCriteria?: string } }> };
export function DevelopmentWorkflow({ project, models, repository }: { project: Project; models: ModelOption[]; repository: string | null }) {
  const router = useRouter(), [pending, startTransition] = useTransition();
  const latest = project.development_jobs[0];
  const active = latest && ['queued', 'running'].includes(latest.status);
  const revising = latest?.status === 'changes_requested' && latest.plan_id === project.approved_plan_id;
  const plan = project.plans.find(p => p.id === project.approved_plan_id);
  const [task, setTask] = useState(revising ? latest.task : '');
  const [criteria, setCriteria] = useState(revising ? latest.criteria : '');
  const [modelKey, setModelKey] = useState('0'), [allowPaid, setAllowPaid] = useState(false);
  const [feedback, setFeedback] = useState(''), [error, setError] = useState('');
  const selected = models[Number(modelKey)];
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => { if (document.visibilityState === 'visible') router.refresh(); }, 3000);
    return () => clearInterval(timer);
  }, [active, router]);
  function submit(action: string) {
    setError('');
    startTransition(async () => {
      try {
        const response = await fetch(`/api/projects/${project.id}/development`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
          action, revision: project.revision, planId: project.approved_plan_id, jobId: latest?.id,
          task, criteria, feedback, provider: selected?.provider, model: selected?.model, allowPaid,
          ...(action === 'start' && revising ? { parentJobId: latest.id } : {}),
        }) });
        const data = await response.json();
        if (!response.ok) { setError(data.error || 'Request failed.'); if (response.status === 409) router.refresh(); }
        else router.refresh();
      } catch { setError('Could not reach the server.'); }
    });
  }
  return <Card><CardHeader><CardTitle><h2>Development workspace</h2></CardTitle></CardHeader><CardContent className="space-y-6">
    <p className="text-sm text-muted-foreground">One approved task → developer → checks → bounded repair → your review. LangGraph coordinates the loop. Acceptance records your decision; applying the patch, merging and deployment are separate actions.</p>
    <p className="text-sm">Target: {repository ? <a className="text-primary underline" href={`https://github.com/${repository}`} target="_blank" rel="noreferrer">{repository}</a> : 'Not configured'}. This first version changes only <code>app/page.tsx</code> and <code>app/globals.css</code>. Dependencies and check commands are fixed.</p>
    {project.status !== 'approved' ? <p className="text-sm">Approve a plan to enable development.</p> : latest?.status === 'awaiting_review' && latest.plan_id === project.approved_plan_id ? <p className="text-sm">Review the latest result below before starting another task.</p> : !active && repository ? <div className="space-y-4">
      <details className="text-sm"><summary className="cursor-pointer text-primary">View approved tasks and criteria</summary><div className="mt-3 space-y-3 whitespace-pre-wrap wrap-anywhere"><p>{plan?.content.tasks}</p><p>{plan?.content.acceptanceCriteria}</p></div></details>
      {revising && <p className="text-sm whitespace-pre-wrap">Requested revision: {latest.feedback}</p>}
      <div className="space-y-2"><Label htmlFor="development-task">One task from the approved plan</Label><Textarea id="development-task" value={task} onChange={e => setTask(e.target.value)} maxLength={3000} disabled={pending || revising} placeholder="For example: build a responsive landing page with a hero and three feature cards." /></div>
      <div className="space-y-2"><Label htmlFor="development-criteria">Acceptance criteria for this task</Label><Textarea id="development-criteria" value={criteria} onChange={e => setCriteria(e.target.value)} maxLength={3000} disabled={pending || revising} placeholder="Describe the observable result you will review." /></div>
      <div className="space-y-2"><Label htmlFor="development-model">Development model</Label><select id="development-model" className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={modelKey} onChange={e => { setModelKey(e.target.value); setAllowPaid(false); }} disabled={pending}>{models.map((m, i) => <option value={i} key={`${m.provider}/${m.model}`}>{m.label}</option>)}</select></div>
      {selected?.paid && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={allowPaid} onChange={e => setAllowPaid(e.target.checked)} />I authorize API charges for this bounded job, including repairs.</label>}
      <Button onClick={() => submit('start')} disabled={pending || !selected || !task.trim() || !criteria.trim() || (selected.paid && !allowPaid)}>{revising ? 'Run requested revision' : 'Start development task'}</Button>
    </div> : null}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {project.development_jobs.map((job, index) => <section key={job.id} className="space-y-4 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-medium wrap-anywhere">{job.task}</h3><Badge variant="outline">{job.status.replaceAll('_', ' ')}</Badge></div>
      <p className="text-xs text-muted-foreground">{job.provider} · {job.model} · {job.attempts}/{job.max_attempts} attempts · up to 4,096 output tokens per attempt · 15-minute job limit</p>
      {job.base_commit && <p className="text-xs wrap-anywhere">Base commit: <a className="text-primary underline" href={`https://github.com/${job.repository}/commit/${job.base_commit}`} target="_blank" rel="noreferrer">{job.base_commit}</a></p>}
      <p className="text-sm whitespace-pre-wrap wrap-anywhere">{job.summary || (job.status === 'cancelled' ? 'Development was cancelled.' : job.status === 'failed' ? 'The job did not produce a reviewable result.' : 'Waiting for the developer.')}</p>
      {job.error && <p className="text-sm text-destructive">Reason: {job.error.replaceAll('_', ' ')}</p>}
      {job.checks?.map(check => <details key={check.name} className="rounded border p-3 text-sm"><summary className="cursor-pointer">{check.passed ? '✓' : '✗'} {check.name} · {(check.durationMs / 1000).toFixed(1)}s</summary><pre className="mt-3 max-h-64 overflow-auto text-xs whitespace-pre-wrap wrap-anywhere">{check.output || 'No output.'}</pre></details>)}
      {job.runs.length > 0 && <details className="text-sm"><summary className="cursor-pointer">Attempt history and usage</summary><ul className="mt-2 space-y-2">{job.runs.map(run => <li key={run.number}>Attempt {run.number}: {run.status}; tokens {run.input_tokens ?? 'unknown'} in / {run.output_tokens ?? 'unknown'} out{run.error ? ` · ${run.error}` : ''}</li>)}</ul></details>}
      {job.patch && <details className="text-sm"><summary className="cursor-pointer">Review diff</summary><a className="my-3 inline-block text-primary underline" href={`/api/projects/${project.id}/patch?job=${job.id}`}>Download patch</a><pre className="max-h-96 overflow-auto rounded bg-muted p-3 text-xs whitespace-pre-wrap wrap-anywhere">{job.patch}</pre></details>}
      {index === 0 && active && <Button variant="outline" disabled={pending} onClick={() => submit('cancel')}>Cancel development</Button>}
      {index === 0 && job.status === 'awaiting_review' && job.plan_id === project.approved_plan_id && project.status === 'approved' && <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Automated checks verify types, rendering and production compilation. Review the diff against your criteria before accepting; no visual or security audit is implied.</p>
        <Label htmlFor="development-feedback">Revision feedback</Label><Textarea id="development-feedback" value={feedback} onChange={e => setFeedback(e.target.value)} maxLength={4000} disabled={pending} />
        <div className="flex flex-wrap gap-3"><Button disabled={pending} onClick={() => submit('accept')}>Accept result</Button><Button variant="outline" disabled={pending || !feedback.trim()} onClick={() => submit('request_changes')}>Request changes</Button></div>
      </div>}
      {job.status === 'awaiting_review' && job.plan_id !== project.approved_plan_id && <p className="text-sm text-muted-foreground">This result belongs to an earlier plan and cannot be accepted under the current approval.</p>}
      {job.feedback && <p className="text-sm whitespace-pre-wrap wrap-anywhere">Review feedback: {job.feedback}</p>}
    </section>)}
  </CardContent></Card>;
}
