BEGIN;
-- CreateTable
CREATE TABLE "provider_credentials" (
    "provider" TEXT NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_credentials_pkey" PRIMARY KEY ("provider")
);


ALTER TABLE provider_credentials ADD CONSTRAINT provider_credentials_provider_check CHECK (provider = 'openai');
COMMIT;
