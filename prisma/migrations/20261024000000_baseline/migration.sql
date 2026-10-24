-- Preserve the legacy history table and original CHECK constraints.
CREATE TABLE schema_migrations (
  name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  brief TEXT NOT NULL CHECK (char_length(brief) BETWEEN 1 AND 10000),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
