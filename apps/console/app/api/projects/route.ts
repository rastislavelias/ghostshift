import { database, listProjects } from '../../../lib/db';
import { parseProject } from '../../../lib/project-input';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return Response.json({ projects: await listProjects() });
  } catch {
    return Response.json({ error: 'Database unavailable. Try again shortly.' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (origin) {
    try {
      if (new URL(origin).host !== host) throw new Error('Origin mismatch');
    } catch {
      return Response.json({ error: 'Cross-origin requests are not allowed.' }, { status: 403 });
    }
  }
  if (!request.headers.get('content-type')?.startsWith('application/json')) {
    return Response.json({ error: 'Send application/json.' }, { status: 415 });
  }
  let project;
  try {
    project = parseProject(await request.json());
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Invalid project.' }, { status: 400 });
  }
  try {
    const result = await database.query(
      'INSERT INTO projects (name, brief) VALUES ($1, $2) RETURNING id, name, brief, status, created_at',
      [project.name, project.brief]
    );
    return Response.json({ project: result.rows[0] }, { status: 201 });
  } catch {
    return Response.json({ error: 'Project could not be saved. Try again shortly.' }, { status: 503 });
  }
}
