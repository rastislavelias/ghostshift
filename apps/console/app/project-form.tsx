'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function ProjectForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    setPending(true);
    setError('');
    setSaved(false);
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: fields.get('name'), brief: fields.get('brief') }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Project could not be saved.');
      form.reset();
      setSaved(true);
      router.push(`/projects/${result.project.id}`);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Connection failed. Please try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} aria-busy={pending} className="space-y-5">
      <div className="space-y-2.5">
        <Label htmlFor="project-name" className="text-xs font-normal text-foreground/85">Project name</Label>
        <Input
          id="project-name"
          name="name"
          required
          maxLength={100}
          placeholder="Your first project"
          disabled={pending}
          aria-describedby={error ? 'project-error' : undefined}
          className="h-12 rounded-lg bg-surface px-3.5 py-3 text-[13px] leading-relaxed shadow-none placeholder:text-muted-foreground/80 dark:bg-surface md:text-[13px]"
        />
      </div>
      <div className="space-y-2.5">
        <Label htmlFor="project-brief" className="text-xs font-normal text-foreground/85">What do you want to build?</Label>
        <Textarea
          id="project-brief"
          name="brief"
          required
          maxLength={10000}
          rows={5}
          placeholder="Describe the problem, who it is for, and what a useful first version should do."
          disabled={pending}
          aria-describedby={error ? 'project-help project-error' : 'project-help'}
          className="field-sizing-fixed min-h-36 resize-y rounded-lg bg-surface px-3.5 py-3 text-[13px] leading-relaxed shadow-none placeholder:text-muted-foreground/80 dark:bg-surface md:text-[13px]"
        />
      </div>
      {error && <p id="project-error" className="text-[13px] text-destructive" role="alert">{error}</p>}
      <p className="text-xs leading-relaxed text-primary" role="status">{saved ? 'Project saved. Your brief is ready for the next step.' : ''}</p>
      <div className="space-y-3">
        <Button type="submit" disabled={pending} className="h-12 w-full cursor-pointer justify-between rounded-lg px-4 text-[13px] font-bold hover:bg-primary-hover disabled:cursor-wait">
          {pending ? 'Saving…' : 'Create project'}
          <span className="text-lg font-normal" aria-hidden="true">↗</span>
        </Button>
        <p id="project-help" className="text-[11px] leading-relaxed text-muted-foreground">Saves a draft. No AI requests or paid actions are started.</p>
      </div>
    </form>
  );
}
