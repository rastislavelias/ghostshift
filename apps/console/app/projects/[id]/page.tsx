import Link from 'next/link';
import { notFound } from 'next/navigation';
import { projectDetail } from '@/lib/workflow';
import { isUuid, statusLabels } from '@/lib/planning-contract';
import { modelCatalog, outputLimit, attemptLimit } from '@/lib/providers';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProjectWorkflow } from './workflow';
export const dynamic = 'force-dynamic';
export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const project = await projectDetail(id);
  if (!project) notFound();
  return <main className="mx-auto max-w-6xl space-y-7 px-5 py-8 md:px-12">
    <Link href="/" className="rounded text-sm text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring">← All projects</Link>
    <header className="flex flex-wrap items-start justify-between gap-4 border-b pb-6">
      <div><p className="mb-2 font-mono text-xs text-muted-foreground">PROJECT WORKSPACE</p><h1 className="text-3xl font-medium wrap-anywhere">{project.name}</h1></div>
      <Badge variant="outline" className="text-primary">{statusLabels[project.status] || project.status}</Badge>
    </header>
    <Card><CardHeader><CardTitle><h2>Original brief</h2></CardTitle></CardHeader>
      <CardContent><p className="text-sm leading-relaxed whitespace-pre-wrap wrap-anywhere">{project.brief}</p></CardContent></Card>
    <ProjectWorkflow key={project.revision} project={JSON.parse(JSON.stringify(project))} models={modelCatalog()} outputLimit={outputLimit()} attemptLimit={attemptLimit()} />
  </main>;
}
