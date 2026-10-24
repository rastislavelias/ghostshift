# One reviewable development task

After approving a project plan, open **Development workspace** on its project page. Copy one
small frontend task and its acceptance criteria from the approved plan, select a configured
model, and start the job. Planning approval alone never starts development.

The developer uses the same provider choices as planning. Local Ollama is the default; paid
providers require explicit per-job consent. No Codex or Claude Code subscription is required.

## Result and review

LangGraph runs **developer → fixed checks → repair**, with two attempts by default (server
setting `DEVELOPER_MAX_ATTEMPTS`, range 1–3). Each attempt permits at most 4,096 output tokens.
The whole live job is bounded to 15 minutes, an inference request to five minutes and an
executor request to three minutes. Interruptions consume a reserved attempt; they do not
silently reset the budget. Unknown usage after interruption is shown as unknown.

A successful job returns an explanation, exact repository/base commit, unified patch,
TypeScript result, page-render test result, production build result and attempt/token history.
These checks do not prove that a design meets every acceptance criterion or that generated
code is secure. Read the diff and compare it with your criteria. **Accept result** records
that review only. **Request changes** records feedback; **Run requested revision** explicitly
starts a new bounded job against the same base commit. It carries forward the prior code and
feedback, and retains all previous attempts in history.

There is no automatic commit, push, PR, merge or deployment. Download the patch and apply it
to the recorded base commit in a separate reviewed workflow. A result produced for an old
plan cannot be accepted after approval is revoked or changed. Cancellation and lease fencing
prevent a late worker from publishing a successful result.

## Configure a public playground

Set `DEVELOPER_REPOSITORY=your-account/ghostshift-playground` in the private `.env`, then run:

```sh
docker compose up --build -d --wait
```

The public target must contain the exact files in `examples/playground`. Only `app/page.tsx`
and `app/globals.css` may differ. Copy that template into a new repository for your own target;
GitHub credentials are not needed to read a public repository. A missing target disables the
start action, while planning continues to work. The original demo lives at
[rastislavelias/ghostshift-playground](https://github.com/rastislavelias/ghostshift-playground).

This intentionally narrow milestone supports a small Next.js frontend task. New dependencies,
API routes, databases, arbitrary repositories and arbitrary shell commands are not supported.
The template lockfile is installed at image build time, never by generated code at runtime.
If dependencies/configuration change, update the trusted template and executor image together.

## Execution boundary

- A separate developer worker has provider/DB access. It reads Git objects without checking out
  or executing repository code and invokes a fixed internal executor API.
- The executor has no DB, provider key, GitHub credential, Docker socket, GPU or host source
  mounts. Its only network is an internal Compose network shared with the developer worker.
- A trusted Python supervisor uses a separate root UID to enforce process/network limits.
  It holds only the executor control token. Generated code runs as UID 1001 with zero Linux
  capabilities, a minimal environment, no new privileges, a read-only root/dependency filesystem
  and bounded temporary storage. UID-specific firewall rules deny new outbound connections,
  including loopback; IPv6 is disabled. Failure to configure the firewall blocks startup.
- The supervisor needs NET_ADMIN, SETUID, SETGID, CHOWN, KILL and DAC_OVERRIDE in its own
  container. It has no SYS_ADMIN and is not privileged. This requires rootful Linux Docker
  or a compatible Docker Desktop Linux VM; restricted/rootless Docker setups may reject it.
- Fixed checks run sequentially with a three-minute combined deadline, 3 GiB RAM, two CPUs,
  128 container processes and additional child resource limits. Source changes during checks
  are rejected; test logs are bounded. All sandbox-UID processes are killed and both temporary filesystems are cleared between requests.
- Authentication protects the unpublished control API. The public starter token is a local
  development default; set a random `EXECUTOR_TOKEN` in a private deployment `.env`.

Containers share the Docker host kernel. This is a bounded single-owner experiment, not a
hardened service for hostile users or arbitrary customer workloads. Stronger VM/microVM
isolation and independent security review are prerequisites for expanding that trust boundary.
Do not place client secrets in briefs or source files sent to a model.

## State and recovery

PostgreSQL is authoritative for jobs, leases, attempts, patches and human review. LangGraph
coordinates the live bounded loop; it does not use a cloud service or LangSmith. Workers renew
60-second leases. Recovery marks unfinished attempts interrupted and resumes only within the
remaining persisted budget. A lost lease or cancelled/revoked approval blocks publication.
An interruption after checks may require another attempt rather than pretending it completed.

Run `npm run test:development` and `npm run test:sandbox` only with the disposable synthetic
provider stack (`compose.test.yaml`, `GHOSTSHIFT_TEST_FIXTURE=1`). They use real isolated Next.js
checks and no paid/model inference. See `docs/validation.md` for actually executed checks.
