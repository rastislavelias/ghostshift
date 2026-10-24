// Encode credentials so existing Compose passwords also work with Prisma CLI.
export function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const url = new URL('postgresql://localhost:5432/ghostshift');
  url.hostname = process.env.PGHOST || 'localhost';
  url.port = process.env.PGPORT || '5432';
  url.username = process.env.PGUSER || 'ghostshift';
  url.password = process.env.PGPASSWORD || '';
  url.pathname = `/${process.env.PGDATABASE || 'ghostshift'}`;
  return url.toString();
}
