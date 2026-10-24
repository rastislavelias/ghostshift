import { defineConfig } from 'prisma/config';
import { databaseUrl } from './scripts/database-url.mjs';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: databaseUrl() },
});
