// LOCAL TEST SERVER for trying accounts and shared savings on real phones without a Supabase project.
//
// It runs the REAL database migrations (supabase/migrations) in an embedded PostgreSQL (PGlite) on your computer, with
// the same Row Level Security and functions, and a tiny sign-in service in front of it. Phones on the same Wi-Fi connect
// to it. It is for TESTING ONLY: the sign-in code is always 123456 (also printed here), there are no real emails, and
// the data lives in mobile/.dev-data on this computer. Never expose it to the internet.
//
// Run:  node scripts/dev-server.mjs        (or: npm run dev:server)
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PGlite } from '@electric-sql/pglite';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..', '..');
const PORT = Number(process.env.PORT ?? 8787);
const DATA_DIR = process.env.DEV_DATA_DIR ?? path.join(repo, 'mobile', '.dev-data', 'pg');
const IN_MEMORY = process.env.DEV_IN_MEMORY === '1';
const CODE = '123456';

// ---------------------------------------------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------------------------------------------
if (!IN_MEMORY) fs.mkdirSync(DATA_DIR, { recursive: true });
const db = await PGlite.create({
  ...(IN_MEMORY ? {} : { dataDir: DATA_DIR }),
  // Keep calendar dates as plain YYYY-MM-DD text, like the real API.
  parsers: { 1082: (v) => v },
});

const exists = await db.query("select to_regclass('public.profiles') as t");
if (!exists.rows[0].t) {
  await db.exec(fs.readFileSync(path.join(repo, 'supabase', 'test', 'auth_shim.sql'), 'utf8'));
  const dir = path.join(repo, 'supabase', 'migrations');
  for (const f of fs
    .readdirSync(dir)
    .filter((x) => x.endsWith('.sql'))
    .sort()) {
    await db.exec(fs.readFileSync(path.join(dir, f), 'utf8'));
  }
  console.log('[dev-server] created the database from supabase/migrations');
}
await db.exec(`
  create schema if not exists dev;
  create table if not exists dev.accounts (
    user_id uuid primary key, email text unique not null, password_hash text not null
  );
  create table if not exists dev.tokens (token text primary key, user_id uuid not null);
`);

let chain = Promise.resolve();
const run = (fn) => {
  const p = chain.then(fn);
  chain = p.catch(() => undefined);
  return p;
};

// The database functions the app may call, and what each returns (read from the app's own contract file).
const contract = fs.readFileSync(path.join(here, '..', 'src', 'backend', 'contract.ts'), 'utf8');
const block = contract.slice(contract.indexOf('RPC_SHAPES = {'), contract.indexOf('} as const'));
const SHAPES = Object.fromEntries(
  [...block.matchAll(/(\w+):\s*'(rows|scalar|void)'/g)].map((m) => [m[1], m[2]]),
);

async function callRpc(userId, name, args) {
  const shape = SHAPES[name];
  if (!shape) throw Object.assign(new Error(`unknown function ${name}`), { status: 404 });
  const keys = Object.keys(args);
  for (const k of keys) if (!/^p_[a-z_]+$/.test(k)) throw new Error('bad argument name');
  return run(async () => {
    await db.exec('begin');
    try {
      await db.exec(userId ? 'set local role authenticated' : 'set local role anon');
      await db.query("select set_config('request.jwt.claims', $1, true)", [
        userId ? JSON.stringify({ sub: userId, role: 'authenticated' }) : '',
      ]);
      const call = keys.map((k, i) => `${k} => $${i + 1}`).join(', ');
      const r = await db.query(
        `select * from public.${name}(${call})`,
        keys.map((k) => args[k]),
      );
      await db.exec('commit');
      if (shape === 'rows') return r.rows;
      if (shape === 'void') return null;
      const first = r.rows[0];
      return first ? Object.values(first)[0] : null;
    } catch (e) {
      await db.exec('rollback').catch(() => undefined);
      throw e;
    }
  });
}

const admin = (sql, params) =>
  run(async () => {
    await db.exec('reset role');
    return (await db.query(sql, params)).rows;
  });

// ---------------------------------------------------------------------------------------------------------------
// Sign-in service (testing only)
// ---------------------------------------------------------------------------------------------------------------
const pending = new Map(); // email -> { password, username }
const resetAllowed = new Set();
let version = 0;

const hash = (password, salt = crypto.randomBytes(16).toString('hex')) =>
  new Promise((resolve, reject) =>
    crypto.scrypt(password, salt, 32, (err, key) =>
      err ? reject(err) : resolve(`${salt}:${key.toString('hex')}`),
    ),
  );
const verifyHash = async (password, stored) => {
  const [salt] = stored.split(':');
  const again = await hash(password, salt);
  return crypto.timingSafeEqual(Buffer.from(again), Buffer.from(stored));
};

async function issueToken(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  await admin('insert into dev.tokens (token, user_id) values ($1, $2)', [token, userId]);
  return token;
}

async function userFor(req) {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization ?? '');
  if (!m) return null;
  const rows = await admin(
    'select a.user_id, a.email from dev.tokens t join dev.accounts a on a.user_id = t.user_id where t.token = $1',
    [m[1]],
  );
  return rows[0] ? { id: rows[0].user_id, email: rows[0].email } : null;
}

const fail = (status, code, message = code) => Object.assign(new Error(message), { status, code });

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normEmail = (e) =>
  String(e ?? '')
    .trim()
    .toLowerCase();

const routes = {
  async 'POST /auth/signup'(body) {
    const email = normEmail(body.email);
    const username = String(body.username ?? '')
      .trim()
      .toLowerCase();
    if (!EMAIL.test(email)) throw fail(400, 'unknown', 'invalid email');
    if (String(body.password ?? '').length < 10) throw fail(400, 'weak_password');
    if ((await admin('select 1 from dev.accounts where email = $1', [email])).length > 0)
      throw fail(409, 'email_taken');
    if ((await callRpc(null, 'username_available', { p_username: username })) !== true)
      throw fail(409, 'username_taken');
    pending.set(email, { password: String(body.password), username });
    console.log(`[dev-server] confirmation code for ${email}: ${CODE}`);
    return { status: 'verification-sent' };
  },
  async 'POST /auth/verify'(body) {
    const email = normEmail(body.email);
    const entry = pending.get(email);
    if (!entry || String(body.code).trim() !== CODE) throw fail(400, 'invalid_code');
    let rows;
    try {
      rows = await admin(
        'insert into auth.users (email, raw_user_meta_data) values ($1, $2::jsonb) returning id',
        [email, JSON.stringify({ username: entry.username })],
      );
    } catch {
      throw fail(409, 'username_taken');
    }
    const id = rows[0].id;
    await admin('insert into dev.accounts (user_id, email, password_hash) values ($1, $2, $3)', [
      id,
      email,
      await hash(entry.password),
    ]);
    pending.delete(email);
    return { token: await issueToken(id), user: { id, email } };
  },
  async 'POST /auth/resend'(body) {
    const email = normEmail(body.email);
    if (pending.has(email)) console.log(`[dev-server] confirmation code for ${email}: ${CODE}`);
    return {};
  },
  async 'POST /auth/login'(body) {
    const email = normEmail(body.email);
    const rows = await admin('select user_id, password_hash from dev.accounts where email = $1', [
      email,
    ]);
    if (rows.length === 0) {
      if (pending.has(email) && pending.get(email).password === String(body.password))
        throw fail(403, 'email_not_verified');
      throw fail(401, 'invalid_credentials');
    }
    if (!(await verifyHash(String(body.password ?? ''), rows[0].password_hash)))
      throw fail(401, 'invalid_credentials');
    return { token: await issueToken(rows[0].user_id), user: { id: rows[0].user_id, email } };
  },
  async 'POST /auth/reset-request'(body) {
    const email = normEmail(body.email);
    if ((await admin('select 1 from dev.accounts where email = $1', [email])).length > 0) {
      resetAllowed.add(email);
      console.log(`[dev-server] password reset code for ${email}: ${CODE}`);
    }
    return {}; // the same answer whether or not the email has an account
  },
  async 'POST /auth/reset'(body) {
    const email = normEmail(body.email);
    if (!resetAllowed.has(email) || String(body.code).trim() !== CODE)
      throw fail(400, 'invalid_code');
    if (String(body.password ?? '').length < 10) throw fail(400, 'weak_password');
    const rows = await admin('select user_id from dev.accounts where email = $1', [email]);
    await admin('update dev.accounts set password_hash = $1 where email = $2', [
      await hash(String(body.password)),
      email,
    ]);
    resetAllowed.delete(email);
    return { token: await issueToken(rows[0].user_id), user: { id: rows[0].user_id, email } };
  },
  async 'GET /auth/me'(_body, req) {
    const user = await userFor(req);
    if (!user) throw fail(401, 'invalid_credentials');
    return { user };
  },
  async 'POST /auth/logout'(_body, req) {
    const m = /^Bearer (.+)$/.exec(req.headers.authorization ?? '');
    if (m) await admin('delete from dev.tokens where token = $1', [m[1]]);
    return {};
  },
  async 'GET /changes'() {
    return { version };
  },
  async 'GET /health'() {
    return { ok: true };
  },
};

const READ_ONLY = /^(list_|my_|group_savings_summary|username_available)/;

async function handle(req, res) {
  const url = new URL(req.url ?? '/', 'http://x');
  const json = (status, value) => {
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(value, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)));
  };
  try {
    let body = {};
    if (req.method === 'POST') {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const text = Buffer.concat(chunks).toString('utf8');
      body = text ? JSON.parse(text) : {};
    }
    const rpc = /^\/rpc\/([a-z_]+)$/.exec(url.pathname);
    if (req.method === 'POST' && rpc) {
      const user = await userFor(req);
      const name = rpc[1];
      if (!user && name !== 'username_available')
        throw fail(401, 'invalid_credentials', 'not authenticated');
      const data = await callRpc(user?.id ?? null, name, body.args ?? {});
      if (!READ_ONLY.test(name)) version++;
      return json(200, { data });
    }
    const handler = routes[`${req.method} ${url.pathname}`];
    if (!handler) return json(404, { error: { code: 'unknown', message: 'not found' } });
    return json(200, await handler(body, req));
  } catch (e) {
    const status = e.status ?? 400;
    return json(status, { error: { code: e.code ?? 'unknown', message: e.message } });
  }
}

const server = http.createServer((req, res) => void handle(req, res));
server.listen(PORT, '0.0.0.0', () => {
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : PORT;
  const ips = Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);
  console.log(`READY ${port}`);
  console.log(
    '\n[dev-server] LOCAL TEST SERVER running (testing only; the code for every email is 123456).',
  );
  for (const ip of ips)
    console.log(
      `[dev-server] put this line in mobile/.env.local:  EXPO_PUBLIC_DEV_SERVER_URL=http://${ip}:${port}`,
    );
  console.log('[dev-server] press Ctrl+C to stop.\n');
});

process.on('SIGTERM', async () => {
  server.close();
  await db.close();
  process.exit(0);
});
