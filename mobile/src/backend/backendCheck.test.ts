/** @jest-environment node */
import { spawn, type ChildProcess } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';

/** A pretend Supabase project: which migrations are applied, and whether the tables leak. */
function fakeProject(opts: { applied: string[]; leak?: boolean; autoconfirm?: boolean }) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://x');
    const send = (status: number, body: unknown) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    if (url.pathname === '/auth/v1/settings')
      return send(200, {
        external: { email: true },
        mailer_autoconfirm: opts.autoconfirm === true,
      });
    const rpc = /^\/rest\/v1\/rpc\/(\w+)$/.exec(url.pathname);
    if (rpc) {
      if (rpc[1] === 'username_available')
        return opts.applied.includes('create_group')
          ? send(200, true)
          : send(404, { code: 'PGRST202' });
      return opts.applied.includes(rpc[1]!)
        ? send(401, { code: '42501', message: `permission denied for function ${rpc[1]}` })
        : send(404, { code: 'PGRST202', message: 'Could not find the function' });
    }
    if (url.pathname.startsWith('/rest/v1/'))
      return opts.leak
        ? send(200, [{ id: 'x' }])
        : send(401, { code: '42501', message: 'permission denied for table' });
    send(404, {});
  });
  return new Promise<{ url: string; close: () => void }>((resolve) =>
    server.listen(0, '127.0.0.1', () =>
      resolve({
        url: `http://127.0.0.1:${(server.address() as { port: number }).port}`,
        close: () => server.close(),
      }),
    ),
  );
}

function run(env: Record<string, string>): Promise<{ code: number; out: string }> {
  return new Promise((resolve) => {
    const child: ChildProcess = spawn(
      process.execPath,
      [path.resolve(__dirname, '../../scripts/backend-check.mjs')],
      {
        env: { PATH: process.env['PATH'] ?? '', NODE_ENV: 'test', ...env },
        cwd: path.resolve(__dirname, '../..'),
      },
    );
    let out = '';
    child.stdout!.on('data', (d: Buffer) => (out += d.toString()));
    child.stderr!.on('data', (d: Buffer) => (out += d.toString()));
    child.on('exit', (code) => resolve({ code: code ?? -1, out }));
  });
}

const ALL = ['create_group', 'update_my_contact', 'delete_my_account', 'email_hash'];

describe('the backend check', () => {
  it('passes when every migration is applied and nothing leaks', async () => {
    const p = await fakeProject({ applied: ALL });
    const r = await run({ EXPO_PUBLIC_SUPABASE_URL: p.url, EXPO_PUBLIC_SUPABASE_ANON_KEY: 'anon' });
    p.close();
    expect(r.out).toContain('All checks passed');
    expect(r.out).not.toContain('FAIL');
    expect(r.code).toBe(0);
  });

  it('names the migration that was not run, and says what to do', async () => {
    const p = await fakeProject({ applied: ALL.slice(0, 3) });
    const r = await run({ EXPO_PUBLIC_SUPABASE_URL: p.url, EXPO_PUBLIC_SUPABASE_ANON_KEY: 'anon' });
    p.close();
    expect(r.code).toBe(1);
    expect(r.out).toContain('FAIL  Migration 20261006000000_pending_email_invites is applied');
    expect(r.out).toContain('PASS  Migration 20261005000000_delete_my_account is applied');
    expect(r.out).toMatch(/Run supabase\/migrations\/20261006000000_pending_email_invites\.sql/);
  });

  it('flags data that a signed-out visitor can read, and email confirmation being off', async () => {
    const p = await fakeProject({ applied: ALL, leak: true, autoconfirm: true });
    const r = await run({ EXPO_PUBLIC_SUPABASE_URL: p.url, EXPO_PUBLIC_SUPABASE_ANON_KEY: 'anon' });
    p.close();
    expect(r.code).toBe(1);
    expect(r.out).toContain('DATA IS READABLE WITHOUT SIGNING IN');
    expect(r.out).toContain('FAIL  Email confirmation is required');
  });

  it('explains what is missing when the settings are not there, and cannot reach a dead address', async () => {
    const none = await run({});
    expect(none.code).toBe(2);
    expect(none.out).toContain('EXPO_PUBLIC_SUPABASE_URL');
    const dead = await run({
      EXPO_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:1',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: 'anon',
    });
    expect(dead.code).toBe(1);
    expect(dead.out).toContain('FAIL  Can reach the project');
  });
});
