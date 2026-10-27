# Project manager discovery

Ghostshift is a human-directed studio. Manager adds discovery before project planning;
it does not create an autonomous team or authorize coding, publication or deployment.

## Owner workflow

1. Open **Manager**, give the discussion a working title and describe the idea.
2. Select a configured Ollama or OpenAI model. Model selection can change between requests;
   the transcript and memory belong to Ghostshift, not a provider's conversation service.
3. Keep important facts and decisions in **Confirmed project memory**. Only owner actions
   change this field. Save memory edits before requesting a response.
4. Ask questions, then choose **Prepare project brief**. The worker creates an AI draft.
5. Review the brief, optionally save an immutable human-edited version, then explicitly
   **Approve brief and create project**. This copies the saved latest version into a new
   draft project exactly once. Open that project to request a plan and review it separately.

A paid request requires explicit consent for that request and its bounded retries, including
sending its context to the provider. There is no automatic paid fallback. OpenAI API access is
separate from interactive subscriptions; configure a key under Configuration. Saving a key,
creating a discussion, editing memory and approving a brief make no model requests.

## Persistence and context

Prisma migrations add conversations, messages, immutable brief versions and persisted jobs
in PostgreSQL. Their data survives container replacement through the existing database volume.
Back up the database and credential-key volume together for server recovery. The server stores
the full transcript; the first UI displays the latest 100 messages and 30 brief versions.

Each request snapshots the title, owner memory (4,000 characters), unconfirmed AI summary
(4,000 characters) and whole recent messages up to a 10,000-character context budget. Brief generation also
includes the previous saved brief so owner edits inform revisions. The complete serialized
request must fit the shared 32,000-character provider input limit. Older
messages remain stored but are not all sent on every inference request. Summaries are lossy
and may be wrong; keep critical decisions in owner memory. Project contexts are isolated by
conversation ID. The UI labels AI summaries as unconfirmed, and model output never updates
confirmed memory or grants approval. There is no cross-project memory or vector database.

The existing planner worker also processes manager jobs. A small LangGraph response graph
uses the existing bounded structured-output adapters. The persisted database job, immutable
input snapshot, lease and atomic output publication provide durability; this release does
not use a LangGraph checkpointer or claim token-level inference resumption. A worker crash
can repeat inference (and charges for a paid request), within the attempt cap. Only one active
job per conversation is allowed by both a row lock and a partial unique index. Cancellation
and revision/lease fencing prevent stale workers from publishing. Requests have the existing
planner timeout, output limit and retry cap. Failed/interrupted attempt usage is unknown;
reported token counts belong to the successful attempt only.

## Boundaries

This milestone supports text discussion and a versioned project brief, with handoff into
existing planning. Pasted notes can inform discussion; links and repositories are **not fetched
or inspected**, attachments and full product audits are not implemented. Grok, dedicated source
retrieval, structured fact provenance, voice input and additional document types are follow-up
milestones. The assistant is instructed to identify missing evidence and unknown requirements.

Approving a brief freezes its handoff: later chat and memory changes do not change the linked
project. Documentation or planning revisions continue in that project's human review workflow.
Existing access remains through loopback/WireGuard without application login. Do not publish
the console until authentication and an exposure plan exist.

## Verification

Run normal unit/build/type checks, then `npm run test:manager` only with
`GHOSTSHIFT_TEST_FIXTURE=1` against a disposable `compose.test.yaml` stack. To exercise worker
recovery set `TEST_COMPOSE_PROJECT=ghostshift-workflow-test` (or CI's `ghostshift-ci`).
This test temporarily stores a synthetic OpenAI key to check refusal of unapproved paid work;
it never authorizes or calls OpenAI. It covers memory, context isolation, concurrency, brief
version review, stale approval, one-time handoff, cancellation, retries and malformed output.
Restart the disposable stack and verify the saved conversation, memory, brief and linked project
IDs are unchanged. Run the existing workflow and legacy-upgrade checks as well.
