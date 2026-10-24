import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { listProjects, type Project } from '@/lib/db';
import { cn } from '@/lib/utils';
import { ProjectForm } from './project-form';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let projects: Project[] = [];
  let connected = true;
  try { projects = await listProjects(); } catch { connected = false; }

  return (
    <main className="mx-auto max-w-7xl px-5 md:px-12">
      <header className="flex min-h-20 items-center justify-between border-b md:min-h-25">
        <a href="/" className="flex items-center gap-3 rounded-lg text-[21px] font-bold tracking-[-1px] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background md:text-[25px]">
          <span className="grid size-9 place-items-center rounded-[10px] bg-primary pb-1.5 text-[30px] text-background" aria-hidden="true">g.</span>
          ghostshift
          <span className="ml-1.5 hidden border-l pl-3.5 font-mono text-[10px] font-normal tracking-[2px] text-muted-foreground md:inline">CONTROL</span>
        </a>
        <span className="font-mono text-[11px] text-muted-foreground">Foundation / v0.1</span>
      </header>

      <section className="pb-12 pt-10 md:pt-16">
        <p className="mb-6 font-mono text-[10px] tracking-[2.5px] text-primary">ONE HUMAN. A TEAM OF AI AGENTS.</p>
        <h1 className="text-[clamp(38px,5.5vw,68px)] leading-[1.06] font-medium tracking-[-1.5px] md:tracking-[-3px]">
          The next shift<br />starts with an idea<span className="text-primary">.</span>
        </h1>
        <p className="mt-6 text-[15px] leading-[1.7] text-muted-foreground">
          A workspace for turning your ideas into software.<br />Start with a project brief. Build the team as you go.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-2.5 font-mono text-[11px] text-muted-foreground">
          <span className={cn('size-1.5 rounded-full', connected ? 'bg-primary' : 'bg-destructive')} aria-hidden="true" />
          {connected ? 'Workspace ready' : 'Database unavailable'}
          <span className="mx-1 text-muted-foreground/50" aria-hidden="true">/</span>
          Agent execution not connected
        </div>
      </section>

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
                      <h3 className="text-base font-medium wrap-anywhere">{project.name}</h3>
                      <Badge variant="outline" className="shrink-0 rounded-sm border-status-border px-2 py-1 font-mono text-[10px] font-normal text-primary">Draft</Badge>
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

      <footer className="mt-12.5 flex flex-col justify-between gap-2.5 border-t py-6 font-mono text-[10px] text-muted-foreground md:flex-row md:gap-5">
        <span>From intent to something real.</span>
        <span>Local foundation · Human directed</span>
      </footer>
    </main>
  );
}
