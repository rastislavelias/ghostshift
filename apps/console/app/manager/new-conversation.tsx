'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
export function NewConversation() {
  const router = useRouter(); const [title,setTitle] = useState(''); const [pending,setPending] = useState(false); const [error,setError] = useState('');
  return <form className="space-y-4" onSubmit={async e => {
    e.preventDefault(); setPending(true); setError('');
    try { const r = await fetch('/api/manager', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({title}) }); const data=await r.json(); if (!r.ok) throw new Error(data.error); router.push(`/manager/${data.conversation.id}`); }
    catch(e) { setError(e instanceof Error ? e.message : 'Could not create discussion.'); setPending(false); }
  }}><Label htmlFor="discussion-title">Working title</Label><Input id="discussion-title" maxLength={100} required value={title} onChange={e=>setTitle(e.target.value)} disabled={pending}/><Button disabled={pending || !title.trim()}>{pending ? 'Creating…' : 'Start discussion'}</Button>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</form>;
}
