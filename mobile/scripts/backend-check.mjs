// Checks that a Supabase project is set up for this app, using only the public (anon) key from mobile/.env.local.
// It never signs in and never writes anything. Run:  npm run backend:check
//
// How it tells whether a migration was run: it asks the database to run a function with no sign-in. A function that
// exists answers "permission denied" (or "not authenticated"); one that does not exist answers "could not find".
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Each migration, with one function it creates that signed-out visitors are not allowed to run. */
export const MIGRATIONS = [
  { file: '20261003000000_accounts_and_shared_savings', fn: 'create_group', args: { p_name: 'x' } },
  {
    file: '20261004000000_profile_name_phone',
    fn: 'update_my_contact',
    args: { p_full_name: '', p_phone: '' },
  },
  { file: '20261005000000_delete_my_account', fn: 'delete_my_account', args: {} },
  { file: '20261006000000_pending_email_invites', fn: 'email_hash', args: { p_email: 'x@y.zz' } },
];

/** Tables that must exist with Row Level Security on: a signed-out visitor must get nothing back. */
export const TABLES = ['profiles', 'groups', 'group_members', 'shared_entries', 'group_events'];

function describe(status, body) {
  const text = typeof body === 'string' ? body : JSON.stringify(body ?? {});
  if (status === 404 || /PGRST202|Could not find the function/i.test(text)) return 'missing';
  if (
    /permission denied|42501|not authenticated|28000|JWT|row-level security/i.test(text) ||
    status === 401 ||
    status === 403
  )
    return 'present';
  return 'unknown';
}

export async function checkBackend({ url, anonKey }, fetchImpl = fetch) {
  const results = [];
  const base = url.replace(/\/+$/, '');
  const headers = {
    apikey: anonKey,
    authorization: `Bearer ${anonKey}`,
    'content-type': 'application/json',
  };

  async function call(pathAndQuery, init) {
    try {
      const res = await fetchImpl(`${base}${pathAndQuery}`, { headers, ...init });
      const text = await res.text();
      let body = text;
      try {
        body = JSON.parse(text);
      } catch {
        // keep the text
      }
      return { status: res.status, body };
    } catch (e) {
      return { status: 0, body: String(e && e.message ? e.message : e) };
    }
  }

  const reach = await call('/auth/v1/settings', { method: 'GET' });
  results.push({
    name: 'Can reach the project and the key is accepted',
    ok: reach.status === 200,
    hint:
      reach.status === 0
        ? 'Cannot connect. Check the URL and your internet.'
        : 'Check EXPO_PUBLIC_SUPABASE_URL and the anon key.',
  });
  if (reach.status === 200) {
    const s = reach.body;
    results.push({
      name: 'Email sign-up is on',
      ok: s && s.external && s.external.email === true,
      hint: 'In Authentication, Providers, switch Email on.',
    });
    results.push({
      name: 'Email confirmation is required (a code is emailed before sign-in works)',
      ok: s && s.mailer_autoconfirm === false,
      hint: 'In Authentication, Providers, Email, switch "Confirm email" on.',
    });
  }

  const free = await call('/rest/v1/rpc/username_available', {
    method: 'POST',
    body: JSON.stringify({ p_username: 'zz_check_user' }),
  });
  results.push({
    name: 'Usernames can be checked before sign-up (the first migration was run)',
    ok: free.status === 200,
    hint: 'Run supabase/migrations/20261003000000_accounts_and_shared_savings.sql in the SQL Editor.',
  });

  for (const m of MIGRATIONS) {
    const r = await call(`/rest/v1/rpc/${m.fn}`, { method: 'POST', body: JSON.stringify(m.args) });
    const state = describe(r.status, r.body);
    results.push({
      name: `Migration ${m.file} is applied`,
      ok: state === 'present',
      hint:
        state === 'missing'
          ? `Not found. Run supabase/migrations/${m.file}.sql in the SQL Editor (migrations must be run in file-name order).`
          : state === 'unknown'
            ? 'Could not tell. Open the SQL Editor and check that the file ran without errors.'
            : 'ok',
    });
  }

  for (const t of TABLES) {
    const r = await call(`/rest/v1/${t}?select=*&limit=1`, { method: 'GET' });
    const leaked = r.status === 200 && Array.isArray(r.body) && r.body.length > 0;
    const exists = r.status !== 404 && !(r.body && r.body.code === '42P01');
    results.push({
      name: `Table ${t} exists and shows nothing to a signed-out visitor`,
      ok: exists && !leaked,
      hint: leaked
        ? 'DATA IS READABLE WITHOUT SIGNING IN. Row Level Security is off. Stop and tell Claude.'
        : 'Run the first migration.',
    });
  }
  return results;
}

export function readEnvFile(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

/** The service-role key must never be in the app. Anything named like one in the app settings is a mistake. */
export function dangerousKeys(env) {
  return Object.keys(env).filter(
    (k) =>
      /SERVICE/i.test(k) ||
      (/KEY/i.test(k) && /^EXPO_PUBLIC_/.test(k) && /service_role/i.test(env[k] ?? '')),
  );
}

async function main() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const env = { ...readEnvFile(path.resolve(here, '..', '.env.local')), ...process.env };
  const url = env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    console.log(
      'Missing settings. Put EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in mobile/.env.local (see docs/BACKEND-SETUP.md).',
    );
    process.exitCode = 2;
    return;
  }
  const bad = dangerousKeys(readEnvFile(path.resolve(here, '..', '.env.local')));
  if (bad.length > 0) {
    console.log(
      `DANGER: ${bad.join(', ')} looks like a service-role key. It must never be in the app. Remove it and rotate the key.`,
    );
    process.exitCode = 3;
    return;
  }
  const results = await checkBackend({ url, anonKey });
  let failed = 0;
  for (const r of results) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.ok ? '' : `\n      -> ${r.hint}`}`);
    if (!r.ok) failed++;
  }
  console.log(
    failed === 0
      ? '\nAll checks passed. The backend is ready for the two-phone test.'
      : `\n${failed} check(s) failed. Fix them in order and run this again.`,
  );
  process.exitCode = failed === 0 ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.log(`Unexpected problem: ${e && e.message ? e.message : e}`);
    process.exitCode = 4;
  });
}
