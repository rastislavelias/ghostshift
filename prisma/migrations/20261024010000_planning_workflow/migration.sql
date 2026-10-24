BEGIN;
-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "approved_at" TIMESTAMPTZ(6),
ADD COLUMN     "approved_plan_id" UUID,
ADD COLUMN     "feedback" TEXT,
ADD COLUMN     "revision" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "project_plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "content" JSONB NOT NULL,
    "source" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planning_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 2,
    "max_output_tokens" INTEGER NOT NULL,
    "available_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lease_until" TIMESTAMPTZ(6),
    "lease_owner" UUID,
    "error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(6),

    CONSTRAINT "planning_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planning_attempts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "job_id" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "duration_ms" INTEGER,
    "error" TEXT,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(6),

    CONSTRAINT "planning_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "detail" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "project_plans_project_id_version_key" ON "project_plans"("project_id", "version");

-- CreateIndex
CREATE INDEX "planning_jobs_status_available_at_idx" ON "planning_jobs"("status", "available_at");

-- CreateIndex
CREATE UNIQUE INDEX "planning_attempts_job_id_number_key" ON "planning_attempts"("job_id", "number");

-- CreateIndex
CREATE INDEX "project_events_project_id_created_at_idx" ON "project_events"("project_id", "created_at");

-- AddForeignKey
ALTER TABLE "project_plans" ADD CONSTRAINT "project_plans_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planning_jobs" ADD CONSTRAINT "planning_jobs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planning_attempts" ADD CONSTRAINT "planning_attempts_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "planning_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_events" ADD CONSTRAINT "project_events_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Prisma schema does not express these workflow invariants.
ALTER TABLE projects DROP CONSTRAINT projects_status_check;
ALTER TABLE projects ADD CONSTRAINT projects_status_check CHECK (status IN ('draft','planning','awaiting_review','changes_requested','approved'));
ALTER TABLE projects ADD CONSTRAINT projects_revision_check CHECK (revision >= 0);
ALTER TABLE projects ADD CONSTRAINT projects_approval_check CHECK ((status = 'approved') = (approved_plan_id IS NOT NULL AND approved_at IS NOT NULL));
ALTER TABLE projects ADD CONSTRAINT projects_approved_plan_fkey FOREIGN KEY (approved_plan_id) REFERENCES project_plans(id);
ALTER TABLE project_plans ADD CONSTRAINT project_plans_version_check CHECK (version > 0);
ALTER TABLE project_plans ADD CONSTRAINT project_plans_source_check CHECK (source IN ('ai','human'));
ALTER TABLE planning_jobs ADD CONSTRAINT planning_jobs_status_check CHECK (status IN ('queued','running','succeeded','failed','cancelled'));
ALTER TABLE planning_jobs ADD CONSTRAINT planning_jobs_budget_check CHECK (max_attempts BETWEEN 1 AND 3 AND attempts BETWEEN 0 AND max_attempts AND max_output_tokens BETWEEN 256 AND 8192);
CREATE UNIQUE INDEX planning_jobs_one_active ON planning_jobs(project_id) WHERE status IN ('queued','running');
ALTER TABLE planning_attempts ADD CONSTRAINT planning_attempts_status_check CHECK (status IN ('running','succeeded','failed','cancelled','interrupted'));
ALTER TABLE planning_attempts ADD CONSTRAINT planning_attempts_usage_check CHECK ((input_tokens IS NULL OR input_tokens >= 0) AND (output_tokens IS NULL OR output_tokens >= 0));

COMMIT;
