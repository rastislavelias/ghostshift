'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

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
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Connection failed. Please try again.');
    } finally {
      setPending(false);
    }
  }

  return <form onSubmit={submit}>
    <label htmlFor="project-name">Project name</label>
    <input id="project-name" name="name" required maxLength={100} placeholder="Your first project" disabled={pending} />
    <label htmlFor="project-brief">What do you want to build?</label>
    <textarea id="project-brief" name="brief" required maxLength={10000} rows={5} placeholder="Describe the problem, who it is for, and what a useful first version should do." disabled={pending} />
    {error && <p className="error" role="alert">{error}</p>}
    <p className="form-message" role="status">{saved ? 'Project saved. Your brief is ready for the next step.' : ''}</p>
    <button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Create project'} <span aria-hidden="true">↗</span></button>
    <p className="caption">Saves a draft. No AI requests or paid actions are started.</p>
  </form>;
}
