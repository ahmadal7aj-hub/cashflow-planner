import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { Client, types as pgTypes } from 'pg';

import { RPC_SHAPES, type RpcClient, type RpcName } from '../backend/contract';

/**
 * A real Postgres for tests (PGlite served over a local socket) with the real migrations applied and a small
 * stand-in for Supabase's auth schema. Queries run as the `authenticated` or `anon` role with a JWT subject set, so
 * Row Level Security and function checks behave as they do on Supabase.
 */
const AUTH_SHIM = `
  create schema auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text unique,
    raw_user_meta_data jsonb not null default '{}'::jsonb
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(
      coalesce(
        nullif(current_setting('request.jwt.claim.sub', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
      ), '')::uuid
  $$;
  create role anon nologin;
  create role authenticated nologin;
  grant usage on schema public to anon, authenticated;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
`;

export interface UserSession extends RpcClient {
  readonly id: string | null;
  /** Run SQL as this user (Row Level Security applies). */
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
}

export interface TestDb {
  /** Run SQL as the database owner (bypasses Row Level Security). */
  admin<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  /** Create an auth user (this fires the profile trigger) and return a session acting as them. */
  signUp(email: string, username: string): Promise<UserSession>;
  /** A session acting as the signed-in user with this id, or as an anonymous visitor when null. */
  as(userId: string | null): UserSession;
  close(): Promise<void>;
}

function lastMigrations(): string[] {
  const dir = path.resolve(__dirname, '../../../supabase/migrations');
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => fs.readFileSync(path.join(dir, f), 'utf8'));
}

export async function startTestDb(): Promise<TestDb> {
  const script = path.resolve(__dirname, '../../scripts/test-db-server.mjs');
  const child: ChildProcess = spawn(process.execPath, [script], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const address = await new Promise<string>((resolve, reject) => {
    let out = '';
    const timer = setTimeout(
      () => reject(new Error(`test database did not start: ${out}`)),
      60_000,
    );
    child.stdout!.on('data', (d: Buffer) => {
      out += d.toString();
      const m = /READY (\S+):(\d+)/.exec(out);
      if (m) {
        clearTimeout(timer);
        resolve(`${m[1]}:${m[2]}`);
      }
    });
    child.stderr!.on('data', (d: Buffer) => {
      out += d.toString();
    });
    child.on('exit', (code) => reject(new Error(`test database exited early (${code}): ${out}`)));
  });
  const [host, port] = address.split(':');
  const client = new Client({
    host,
    port: Number(port),
    user: 'postgres',
    database: 'postgres',
    // Keep calendar dates as plain YYYY-MM-DD text, exactly as the real API returns them.
    types: {
      getTypeParser: ((oid: number, format?: 'text' | 'binary') =>
        oid === 1082
          ? (v: string) => v
          : pgTypes.getTypeParser(oid, format as 'text')) as typeof pgTypes.getTypeParser,
    },
  });
  await client.connect();

  // PGlite serves one connection, so statements run strictly one after another.
  let queue: Promise<unknown> = Promise.resolve();
  const serial = <T>(fn: () => Promise<T>): Promise<T> => {
    const next = queue.then(fn, fn);
    queue = next.catch(() => undefined);
    return next;
  };

  // PGlite's socket mishandles errors raised inside the extended query protocol (used when values are sent
  // separately), so values are inlined as escaped literals and the simple protocol is used throughout.
  const literal = (v: unknown): string =>
    v === null || v === undefined ? 'null' : client.escapeLiteral(String(v));
  const bind = (sql: string, params: unknown[] = []): string =>
    sql.replace(/\$(\d+)/g, (_m, n: string) => literal(params[Number(n) - 1]));

  const admin = <T>(sql: string, params?: unknown[]): Promise<T[]> =>
    serial(async () => {
      // Always run as the database owner, whatever the previous request was doing.
      await client.query('rollback').catch(() => undefined);
      await client.query('reset role');
      const r = await client.query(bind(sql, params));
      return (Array.isArray(r) ? r[r.length - 1]! : r).rows as T[];
    });

  await client.query(AUTH_SHIM);
  for (const sql of lastMigrations()) await client.query(sql);
  await client.query('select 1');

  const as = (userId: string | null): UserSession => {
    const query = <T>(sql: string, params?: unknown[]): Promise<T[]> =>
      serial(async () => {
        await client.query('begin');
        try {
          await client.query(userId ? 'set local role authenticated' : 'set local role anon');
          await client.query(
            bind("select set_config('request.jwt.claims', $1, true)", [
              userId ? JSON.stringify({ sub: userId, role: 'authenticated' }) : '',
            ]),
          );
          const r = await client.query(bind(sql, params));
          await client.query('commit');
          return r.rows as T[];
        } catch (e) {
          await client.query('rollback');
          throw e;
        }
      });
    return {
      id: userId,
      query,
      async rpc<T = unknown>(name: RpcName, args: Record<string, unknown> = {}): Promise<T> {
        const keys = Object.keys(args);
        const call = keys.map((k, i) => `${k} => $${i + 1}`).join(', ');
        const rows = await query(
          `select * from public.${name}(${call})`,
          keys.map((k) => args[k]),
        );
        const shape = RPC_SHAPES[name];
        if (shape === 'rows') return rows as T;
        if (shape === 'void') return null as T;
        const first = rows[0] as Record<string, unknown> | undefined;
        return (first ? Object.values(first)[0] : null) as T;
      },
    };
  };

  return {
    admin,
    as,
    async signUp(email: string, username: string) {
      const rows = await admin<{ id: string }>(
        'insert into auth.users (email, raw_user_meta_data) values ($1, $2::jsonb) returning id',
        [email, JSON.stringify({ username })],
      );
      return as(rows[0]!.id);
    },
    async close() {
      await client.end().catch(() => undefined);
      child.kill('SIGTERM');
    },
  };
}
