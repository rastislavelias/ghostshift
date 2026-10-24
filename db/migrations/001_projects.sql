CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  brief TEXT NOT NULL CHECK (char_length(brief) BETWEEN 1 AND 10000),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
