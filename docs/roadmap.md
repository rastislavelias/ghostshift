# Next milestone: one reviewable development task

The foundation is complete when a fresh clone starts with one Compose command, a project
brief can be saved, health reflects database availability, and drafts survive a restart.

The next milestone is deliberately small:

- A human approves a bounded task from a project brief.
- A persisted job records input, state, attempts, cancellation, and result.
- One provider adapter runs one coding task in an isolated workspace with a budget limit.
- A reviewer checks the result against acceptance criteria and actual test output.
- The owner receives a diff and evidence before any merge or deployment.

Planned roles are coordinator, developer, and reviewer. They are not implemented yet.
Provider selection (Codex, Claude, local models) is deferred until job boundaries and
permissions are defined. Client email, marketing, accounting, Figma automation, autonomous
production deploys, and Kubernetes are outside this milestone.
