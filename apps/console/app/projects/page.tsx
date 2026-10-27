import Link from 'next/link';
import { statusLabels } from '@/lib/planning-contract';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { listProjects, type Project } from '@/lib/db';
import { ProjectForm } from '../project-form';

export const dynamic = 'force-dynamic';

export default async function Projects() {
  let projects: Project[] = [];
  let connected = true;
  try { projects = await listProjects(); } catch { connected = false; }

  return (
    <main className="mx-auto w-full max-w-7xl p-5 md:p-8">
      <header className="mb-8 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Projects</h1>
        <p className="text-sm text-muted-foreground">Create a brief, review the plan, and move one task at a time into development.</p>
      </header>

      <div className="grid items-start gap-6 md:grid-cols-[1fr_1.1fr]">
        <Card className="min-w-0 gap-0 rounded-2xl py-0 shadow-none" role="region" aria-labelledby="new-project-title">
          <CardHeader className="mb-6.5 flex items-center gap-3 px-5.5 pt-5.5 md:px-7 md:pt-7">
            <span className="font-mono text-[11px] text-muted-foreground">01</span>
            <CardTitle className="text-[17px] font-medium tracking-[-0.3px]">
              <h2 id="new-project-title">Start a project</h2>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5.5 pb-5.5 md:px-7 md:pb-7">
            <ProjectForm />
          </CardContent>
        </Card>

        <Card className="min-w-0 gap-0 rounded-2xl py-0 shadow-none" role="region" aria-labelledby="projects-title">
          <CardHeader className="mb-6.5 flex items-center gap-3 px-5.5 pt-5.5 md:px-7 md:pt-7">
            <span className="font-mono text-[11px] text-muted-foreground">02</span>
            <CardTitle className="text-[17px] font-medium tracking-[-0.3px]">
              <h2 id="projects-title">Your projects</h2>
            </CardTitle>
            <Badge variant="secondary" className="ml-auto rounded-md bg-success px-2 py-1 font-mono text-[11px] text-success-foreground">{projects.length}</Badge>
          </CardHeader>
          <CardContent className="px-5.5 pb-5.5 md:px-7 md:pb-7">
            {!connected ? (
              <div className="flex min-h-50 flex-col items-center justify-center text-center md:min-h-84">
                <h3 className="text-base font-medium">Waiting for the database</h3>
                <p className="mt-3 text-[13px] leading-[1.8] text-muted-foreground">Check the service logs and reload once the database is ready.</p>
              </div>
            ) : projects.length === 0 ? (
              <div className="flex min-h-50 flex-col items-center justify-center text-center md:min-h-84">
                <span className="mb-4.5 text-3xl text-primary" aria-hidden="true">↗</span>
                <h3 className="text-base font-medium">A blank canvas. Your call.</h3>
                <p className="mt-3 text-[13px] leading-[1.8] text-muted-foreground">Your first project starts with a clear brief.<br />Create one to begin.</p>
              </div>
            ) : (
              <ul className="max-h-130 divide-y overflow-auto">
                {projects.map(project => (
                  <li key={project.id} className="py-4.5 first:pt-0">
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="text-base font-medium wrap-anywhere"><Link href={`/projects/${project.id}`} className="rounded hover:text-primary focus-visible:ring-2 focus-visible:ring-ring">{project.name} ↗</Link></h3>
                      <Badge variant="outline" className="shrink-0 rounded-sm border-status-border px-2 py-1 font-mono text-[10px] font-normal text-primary">{statusLabels[project.status] || project.status}</Badge>
                    </div>
                    <p className="my-3 max-h-40 overflow-auto text-[13px] leading-[1.7] whitespace-pre-wrap text-muted-foreground wrap-anywhere">{project.brief}</p>
                    <time className="font-mono text-[10px] text-muted-foreground" dateTime={project.created_at.toISOString()}>{project.created_at.toISOString().slice(0, 10)}</time>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>


    </main>
  );
}
