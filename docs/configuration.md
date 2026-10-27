# Workspace configuration

Open **Configuration** in the sidebar to save, replace or remove the OpenAI API key.
The page returns only configuration status and an update timestamp. It never returns the
saved key, its suffix, or its ciphertext. The input is a password field, cleared after a
successful change; it is not stored in browser storage. Saving does not contact OpenAI,
validate account access or start billable work. Existing per-job paid API consent remains.

Keys are encrypted with AES-256-GCM in `provider_credentials`. A random 32-byte master key
is created atomically with mode 0600 in the private `credential-key` Docker volume. The
console mounts this volume read/write, planning/development workers read-only, and the
execution sandbox has no access. Each new model request resolves the current credential;
changing/removing it does not cancel a request already sent. Cancel active jobs separately.

The initial OpenAI model allowlist defaults to `gpt-5-mini`, which supports Responses and
Structured Outputs according to the [official model documentation](https://developers.openai.com/api/docs/models/gpt-5-mini).
`OPENAI_MODELS` still overrides the server allowlist. Local Ollama remains the initial model
selection; saving a key does not switch a project to a paid model automatically. Model/account
availability and actual inference with a real key have not been verified by these tests.

Existing `OPENAI_API_KEY` environment configuration takes precedence. In that case the UI
shows that the key is server-managed and disallows replacing/removing it here. Remove that
environment variable and recreate the affected services to use UI-managed credentials.
Other providers remain configured through environment variables in this milestone.

## Deployment and recovery

The ordinary startup command creates the volume and runs the new Prisma migration:

```sh
docker compose up --build -d --wait
```

The dashboard root `/` is intentionally empty apart from its heading. Projects live at
`/projects`, their existing detail routes remain `/projects/:id`, and configuration lives
at `/configuration`. Desktop navigation collapses to icons; the mobile menu is a shadcn/ui
Sheet with focus management and Escape dismissal. Access continues through loopback/SSH
or the existing private WireGuard proxy. No application login was added.

**Back up the master key separately from the database dump.** A database backup contains
ciphertext, not the decryption key. Keep the key backup private, outside Git and outside
public build artifacts. Restoring only the database will not recover saved credentials.
Restore the matching key volume before using the credentials, or replace the stored key
through Configuration. Other project data remains usable without an OpenAI key.

For a private server-side backup, run from the Compose project directory:

```sh
umask 077
mkdir -p backups
docker compose exec -T console cat /var/lib/ghostshift/secrets/credentials.key > backups/credentials.key
```

Run this after saving the first UI-managed key; the file is created on demand. Preserve mode
0600 and UID/GID 1001 when restoring the key to the volume. `docker compose down` preserves
both the database and master-key volumes; `down -v` deletes them. Never use the latter on
an existing workspace you intend to keep.

For non-Docker local development, set `CREDENTIAL_KEY_PATH` to a private file outside the
checkout. Do not place a credential or master key inside the repository.
