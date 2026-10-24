BEGIN;
-- CreateTable
CREATE TABLE "development_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "task" TEXT NOT NULL,
    "criteria" TEXT NOT NULL,
    "repository" TEXT NOT NULL,
    "base_commit" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 2,
    "max_output_tokens" INTEGER NOT NULL DEFAULT 4096,
    "lease_owner" UUID,
    "lease_until" TIMESTAMPTZ(6),
    "error" TEXT,
    "summary" TEXT,
    "files" JSONB,
    "patch" TEXT,
    "checks" JSONB,
    "feedback" TEXT,
    "parent_job_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(6),

    CONSTRAINT "development_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "development_attempts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "job_id" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "duration_ms" INTEGER,
    "error" TEXT,
    "checks" JSONB,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(6),

    CONSTRAINT "development_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "development_jobs_status_created_at_idx" ON "development_jobs"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "development_attempts_job_id_number_key" ON "development_attempts"("job_id", "number");

-- AddForeignKey
ALTER TABLE "development_jobs" ADD CONSTRAINT "development_jobs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "development_jobs" ADD CONSTRAINT "development_jobs_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "project_plans"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "development_attempts" ADD CONSTRAINT "development_attempts_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "development_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE development_jobs ADD CONSTRAINT development_status_check CHECK (status IN ('queued','running','awaiting_review','accepted','changes_requested','failed','cancelled'));
ALTER TABLE development_jobs ADD CONSTRAINT development_budget_check CHECK (attempts >= 0 AND attempts <= max_attempts AND max_attempts BETWEEN 1 AND 3 AND max_output_tokens BETWEEN 256 AND 8192);
CREATE UNIQUE INDEX development_one_active ON development_jobs(project_id) WHERE status IN ('queued','running');
COMMIT;
