# Brief → plan → owner approval

Create a project brief, open its workspace, choose a model, and request a plan. A separate
worker processes the persisted request. The page polls while work is queued/running and
shows eight review sections: summary, MVP scope, exclusions, architecture, tasks, acceptance
criteria, risks/assumptions, and questions. Plans are proposals, not executed software.

Review the latest version, edit it (creating an immutable new version), approve it, or
request changes. Feedback and answers to questions are stored; the next generation uses
them and a bounded excerpt of the previous plan. A revised plan always needs fresh approval.
Approval references an exact plan ID and timestamp. Editing or requesting changes revokes
approval. No coding, email, repository access, or deployment starts when a plan is approved.

The homepage links to each workspace. Activity, historical plan versions (latest 30), and
planning runs (latest 20) remain available. The activity view shows the latest 100 events;
older records remain in PostgreSQL. The app is still a single-owner tool accessed through
loopback or SSH; it does not implement authentication or multiple user identities.

## Model selection

Each request stores its provider, model, output limit, input snapshot, and attempt limit.
The owner selects from server-configured models; requests cannot supply arbitrary endpoints
or model names. Keys are environment variables and never returned by the model catalog or
project API. The UI requires an explicit paid-call checkbox for each external request.

- **Ollama:** a dedicated Ghostshift container and `ollama-data` volume, without a host port.
  The one-shot `model-init` task downloads `OLLAMA_MODEL` (default `qwen3:4b`) on first use.
  Subsequent starts reuse it. This is separate from other applications' Ollama instances.
  Local-only mode disables Ollama cloud access. No model download is an AI inference charge.
- **OpenAI:** configure `OPENAI_API_KEY` and comma-separated `OPENAI_MODELS`. The adapter uses
  Responses with JSON Schema output, no tools, and `store: false`. Use models supporting
  Responses structured output and the configured token limit.
- **Compatible API:** configure `COMPATIBLE_API_KEY`, `COMPATIBLE_MODELS`, and an HTTPS
  `COMPATIBLE_BASE_URL` ending in the provider's API prefix (usually `/v1`). The adapter uses
  Chat Completions JSON-object mode and validates the response. Provider implementations
  differ; not every API or model supports these features.

Restart/recreate console and worker after changing configuration:
`docker compose up --build -d --wait`. For another local model, pull it explicitly with
`docker compose exec ollama ollama pull MODEL`, then include it in `OLLAMA_MODELS`.
Nothing downloads every available model automatically.

## GPU and first startup

The default Compose file is portable CPU mode. On a Linux NVIDIA host with NVIDIA Container
Toolkit, set `COMPOSE_FILE=compose.yaml:compose.gpu.yaml` in `.env`, then run the same single
startup command. This grants only Ghostshift's Ollama a GPU reservation; app services do
not receive GPU or Docker socket access. GPU hardware/VRAM is shared with other processes,
although containers and model storage are separate. Docker on macOS runs this container
on CPU; native Metal acceleration is not provided by this Compose setup.

Model weights persist across container recreation. Back up project data separately from
model weights (weights can be downloaded again). Never run `docker compose down -v` against
a workspace you want to keep: it removes both database and model volumes.

## Queue, concurrency, and limits

PostgreSQL is the queue; no Redis service is needed for this milestone. At most one job is
queued/running per project. Project row locks, revision checks, and job leases serialize
human actions and worker completion. Stale browser approvals are rejected with HTTP 409.
Workers claim different projects with `SKIP LOCKED`; concurrency defaults to one per worker.

A running job renews its 60-second lease every 10 seconds. Interrupted leases are recovered
without allowing an old worker to publish a late result. Cancellation immediately marks
the job cancelled, and the worker aborts the provider call on its next heartbeat. Results
from cancelled jobs are discarded. Remote providers may still finish or bill such requests.
Retries are bounded (default 2 total attempts, configurable 1–3) with a delay; auth/configuration
errors and truncated responses are terminal. Each call has a timeout (default 240 seconds).

The output limit defaults to 2,048 tokens and can be set up to 8,192. Input text is bounded;
no full repository is attached. Token counts and durations are stored when reported. Unknown
usage is displayed as unknown; failed/interrupted calls can still cost money. This is a
per-request output/attempt limit, not a monetary budget or quality guarantee. The worker
never automatically falls back to a paid provider.

## Tests

Unit checks validate plan shape and provider allowlists. `compose.test.yaml` replaces only
inference with a synthetic server so CI makes no model downloads or paid calls. Run the
usual disposable stack with `-f compose.yaml -f compose.test.yaml`, then set
`GHOSTSHIFT_TEST_FIXTURE=1` for `npm run test:workflow`. It tests concurrency, edits, stale
approval, revisions, cancellation, bounded retries, errors, and usage reporting. With
`TEST_COMPOSE_PROJECT=ghostshift-ci` or `ghostshift-workflow-test`, it also checks worker
interruption recovery in that disposable project. Never use the test override for deployment.

The OpenAI/compatible adapters require real-provider validation with your configured model
before relying on them for a project. Automated adapter checks use mocked transport and do
not prove account access, billing, or model quality.

Sources: [Ollama Chat API](https://docs.ollama.com/api/chat),
[OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses).
