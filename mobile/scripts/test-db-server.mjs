// A throwaway Postgres (PGlite, runs in memory) served over the Postgres wire protocol for tests.
// Usage: node scripts/test-db-server.mjs   -> prints "PORT <n>" when ready.
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

const db = await PGlite.create();
const server = new PGLiteSocketServer({ db, port: 0, host: '127.0.0.1' });
await server.start();
const address = server.getServerConn?.() ?? '';
console.log('READY', address);
process.on('SIGTERM', async () => {
  await server.stop();
  await db.close();
  process.exit(0);
});
