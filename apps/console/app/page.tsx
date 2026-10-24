import { listProjects, type Project } from '../lib/db';
import { ProjectForm } from './project-form';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let projects: Project[] = [];
  let connected = true;
  try { projects = await listProjects(); } catch { connected = false; }

  return <main>
    <header className="topbar">
      <a href="/" className="brand"><span className="brand-mark" aria-hidden="true">g.</span>ghostshift<span className="brand-label">CONTROL</span></a>
      <span className="version">Foundation / v0.1</span>
    </header>
    <section className="hero">
      <p className="eyebrow">ONE HUMAN. A TEAM OF AI AGENTS.</p>
      <h1>The next shift<br />starts with an idea<span>.</span></h1>
      <p className="intro">A workspace for turning your ideas into software.<br />Start with a project brief. Build the team as you go.</p>
      <div className="system-status"><span className={connected ? 'dot' : 'dot offline'} />{connected ? 'Workspace ready' : 'Database unavailable'}<span className="status-divider">/</span>Agent execution not connected</div>
    </section>
    <div className="workspace">
      <section className="panel new-project" aria-labelledby="new-project-title">
        <div className="section-heading"><span className="section-number">01</span><h2 id="new-project-title">Start a project</h2></div>
        <ProjectForm />
      </section>
      <section className="panel projects" aria-labelledby="projects-title">
        <div className="section-heading"><span className="section-number">02</span><h2 id="projects-title">Your projects</h2><span className="count">{projects.length}</span></div>
        {!connected ? <div className="empty"><h3>Waiting for the database</h3><p>Check the service logs and reload once the database is ready.</p></div> : projects.length === 0 ? <div className="empty"><span className="empty-symbol" aria-hidden="true">↗</span><h3>A blank canvas. Your call.</h3><p>Your first project starts with a clear brief.<br />Create one to begin.</p></div> : <ul className="project-list">{projects.map(project => <li key={project.id}><div className="project-title"><h3>{project.name}</h3><span className="badge">Draft</span></div><p className="brief">{project.brief}</p><time dateTime={project.created_at.toISOString()}>{project.created_at.toISOString().slice(0, 10)}</time></li>)}</ul>}
      </section>
    </div>
    <footer><span>From intent to something real.</span><span>Local foundation · Human directed</span></footer>
  </main>;
}
