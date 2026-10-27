CREATE TABLE manager_conversations (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
 revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0), memory TEXT NOT NULL DEFAULT '' CHECK (char_length(memory) <= 4000),
 summary TEXT NOT NULL DEFAULT '' CHECK (char_length(summary) <= 4000), project_id UUID UNIQUE REFERENCES projects(id) ON DELETE NO ACTION ON UPDATE CASCADE,
 created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE TABLE manager_messages (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), conversation_id UUID NOT NULL REFERENCES manager_conversations(id) ON DELETE CASCADE ON UPDATE CASCADE,
 role TEXT NOT NULL CHECK (role IN ('user','assistant')), content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 6000),
 provider TEXT, model TEXT, created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE INDEX manager_messages_conversation_id_created_at_idx ON manager_messages(conversation_id,created_at);
CREATE TABLE manager_briefs (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), conversation_id UUID NOT NULL REFERENCES manager_conversations(id) ON DELETE CASCADE ON UPDATE CASCADE,
 version INTEGER NOT NULL CHECK (version > 0), content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 10000),
 source TEXT NOT NULL CHECK (source IN ('ai','human')), approved_at TIMESTAMPTZ(6), created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
 UNIQUE(conversation_id,version)
);
CREATE TABLE manager_jobs (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), conversation_id UUID NOT NULL REFERENCES manager_conversations(id) ON DELETE CASCADE ON UPDATE CASCADE,
 kind TEXT NOT NULL CHECK (kind IN ('chat','brief')), provider TEXT NOT NULL CHECK (provider IN ('ollama','openai')),
 model TEXT NOT NULL, input JSONB NOT NULL, status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','succeeded','failed','cancelled')),
 attempts INTEGER NOT NULL DEFAULT 0, max_attempts INTEGER NOT NULL DEFAULT 2 CHECK (max_attempts BETWEEN 1 AND 3),
 max_output_tokens INTEGER NOT NULL DEFAULT 2048 CHECK (max_output_tokens BETWEEN 256 AND 8192),
 available_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(), lease_owner UUID, lease_until TIMESTAMPTZ(6),
 input_tokens INTEGER, output_tokens INTEGER, error TEXT, created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(), finished_at TIMESTAMPTZ(6),
 CHECK (attempts BETWEEN 0 AND max_attempts)
);
CREATE INDEX manager_jobs_status_available_at_idx ON manager_jobs(status,available_at);
CREATE UNIQUE INDEX manager_jobs_one_active ON manager_jobs(conversation_id) WHERE status IN ('queued','running');
