import Link from 'next/link';
import { database } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NewConversation } from './new-conversation';
export const dynamic = 'force-dynamic';
export default async function Manager() {
  const conversations = await database.managerConversation.findMany({ orderBy: { created_at: 'desc' }, take: 100 });
  return <main className="mx-auto max-w-6xl space-y-6 p-5 md:p-8">
    <header className="space-y-2"><h1 className="text-3xl font-semibold">Project manager</h1><p className="text-sm text-muted-foreground">Explore an idea, keep project decisions, and review a brief before creating a project. You direct every handoff.</p></header>
    <div className="grid items-start gap-6 md:grid-cols-2"><Card><CardHeader><CardTitle>Start a discussion</CardTitle></CardHeader><CardContent><NewConversation /></CardContent></Card>
    <Card><CardHeader><CardTitle>Your discussions</CardTitle></CardHeader><CardContent><ul className="divide-y">{conversations.map(c => <li className="py-4 first:pt-0" key={c.id}><Link className="font-medium text-primary underline-offset-4 hover:underline" href={`/manager/${c.id}`}>{c.title}</Link><p className="mt-1 text-xs text-muted-foreground">{c.project_id ? 'Brief approved · project created' : 'Discovery'} · {c.created_at.toISOString().slice(0,10)}</p></li>)}</ul>{!conversations.length && <p className="text-sm text-muted-foreground">Give your idea a working title to begin.</p>}</CardContent></Card></div>
  </main>;
}
