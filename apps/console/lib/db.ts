import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type Project } from '../generated/prisma/client';

const globalDatabase = globalThis as unknown as { ghostshiftPrisma?: PrismaClient };

export const database = globalDatabase.ghostshiftPrisma ?? new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
  }),
});

globalDatabase.ghostshiftPrisma = database;

export type { Project };

export async function listProjects(): Promise<Project[]> {
  return database.project.findMany({ orderBy: { created_at: 'desc' }, take: 50 });
}
