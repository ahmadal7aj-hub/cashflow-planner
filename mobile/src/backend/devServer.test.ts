/** @jest-environment node */
import { spawn, type ChildProcess } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import { createDevBackend, type FetchLike } from './devBackend';
import { readDevServerUrl } from './config';
import { createSharingApi } from './sharingApi';
import type { Backend } from './types';

/**
 * Starts the real local test server (an in-memory database with the real migrations) and talks to it the way the
 * phones do: over HTTP, through the app's own connector.
 */
let child: ChildProcess;
let url: string;

beforeAll(async () => {
  child = spawn(process.execPath, [path.resolve(__dirname, '../../scripts/dev-server.mjs')], {
    env: { ...process.env, PORT: '0', DEV_IN_MEMORY: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  url = await new Promise<string>((resolve, reject) => {
    let out = '';
    const timer = setTimeout(() => reject(new Error(`test server did not start: ${out}`)), 60_000);
    child.stdout!.on('data', (d: Buffer) => {
      out += d.toString();
      const m = /READY (\d+)/.exec(out);
      if (m) {
        clearTimeout(timer);
        resolve(`http://127.0.0.1:${m[1]}`);
      }
    });
    child.stderr!.on('data', (d: Buffer) => {
      out += d.toString();
    });
    child.on('exit', (c) => reject(new Error(`test server exited (${c}): ${out}`)));
  });
}, 90_000);

afterAll(() => {
  child.kill('SIGTERM');
});

/** A phone with nothing signed in: plain and secure storage both empty. */
async function clearPhoneStorage() {
  await AsyncStorage.clear();
  (SecureStore as unknown as { __store: Map<string, string> }).__store.clear();
}

/** The test environment replaces fetch, so use plain Node HTTP for the requests. */
const nodeFetch: FetchLike = (target, init) =>
  new Promise((resolve, reject) => {
    const req = http.request(target, { method: init.method, headers: init.headers }, (res) => {
      let text = '';
      res.on('data', (d: Buffer) => (text += d.toString()));
      res.on('end', () =>
        resolve({
          ok: (res.statusCode ?? 500) < 400,
          status: res.statusCode ?? 500,
          json: async () => (text ? JSON.parse(text) : {}),
        }),
      );
    });
    req.on('error', reject);
    if (init.body) req.write(init.body);
    req.end();
  });

function phone(): Backend {
  // Each "phone" has its own sign-in token.
  return createDevBackend(url, nodeFetch);
}

async function register(b: Backend, email: string, username: string, password = 'a-long-password') {
  expect(await b.auth.usernameAvailable(username)).toBe(true);
  expect(await b.auth.signUp(email, password, username)).toBe('verification-sent');
  return b.auth.verifySignUp(email, '123456');
}

describe('the local test server', () => {
  it('reads its address from the settings', () => {
    expect(readDevServerUrl({})).toBeNull();
    expect(readDevServerUrl({ EXPO_PUBLIC_DEV_SERVER_URL: ' http://192.168.1.5:8787/ ' })).toBe(
      'http://192.168.1.5:8787',
    );
    expect(readDevServerUrl({ EXPO_PUBLIC_DEV_SERVER_URL: 'nonsense' })).toBeNull();
  });

  it('registers two people, checks usernames and emails, signs them in and out, and resets a password', async () => {
    await clearPhoneStorage();
    const a = phone();
    const alice = await register(a, 'alice@example.com', 'alice');
    expect((await a.auth.currentUser())?.id).toBe(alice.id);

    // A second registration cannot take the same username or email.
    const b = phone();
    expect(await b.auth.usernameAvailable('ALICE')).toBe(false);
    await expect(
      b.auth.signUp('alice@example.com', 'another-long-pw', 'zed_zed'),
    ).rejects.toMatchObject({
      code: 'email_taken',
    });
    await expect(b.auth.signUp('new@example.com', 'short', 'zed_zed')).rejects.toMatchObject({
      code: 'weak_password',
    });

    // Wrong code, wrong password, unknown email.
    await b.auth.signUp('bob@example.com', 'bobby-password-1', 'bobby');
    await expect(b.auth.verifySignUp('bob@example.com', '000000')).rejects.toMatchObject({
      code: 'invalid_code',
    });
    await expect(b.auth.signIn('bob@example.com', 'bobby-password-1')).rejects.toMatchObject({
      code: 'email_not_verified',
    });
    await b.auth.verifySignUp('bob@example.com', '123456');
    await b.auth.signOut();
    expect(await b.auth.currentUser()).toBeNull();
    await expect(b.auth.signIn('bob@example.com', 'wrong-password')).rejects.toMatchObject({
      code: 'invalid_credentials',
    });
    await expect(b.auth.signIn('nobody@example.com', 'whatever-123')).rejects.toMatchObject({
      code: 'invalid_credentials',
    });
    expect((await b.auth.signIn('bob@example.com', 'bobby-password-1')).email).toBe(
      'bob@example.com',
    );

    // Password reset: asking never reveals anything; the code is needed.
    await b.auth.requestPasswordReset('nobody@example.com');
    await b.auth.requestPasswordReset('bob@example.com');
    await expect(
      b.auth.resetPassword('bob@example.com', '999999', 'brand-new-password'),
    ).rejects.toMatchObject({
      code: 'invalid_code',
    });
    await b.auth.resetPassword('bob@example.com', '123456', 'brand-new-password');
    await b.auth.signOut();
    await b.auth.signIn('bob@example.com', 'brand-new-password');
  });

  it('keeps the optional name and phone from sign-up and lets the owner change them', async () => {
    await clearPhoneStorage();
    const a = phone();
    expect(
      await a.auth.signUp('eve@example.com', 'a-long-password', 'eve_e', {
        fullName: 'Eve E',
        phone: '+971501234567',
      }),
    ).toBe('verification-sent');
    await a.auth.verifySignUp('eve@example.com', '123456');
    const first = await a.rpc.rpc<{ full_name: string; phone: string }[]>('my_profile');
    expect(first[0]).toMatchObject({ full_name: 'Eve E', phone: '+971501234567' });
    await a.rpc.rpc('update_my_contact', { p_full_name: '', p_phone: '' });
    const cleared = await a.rpc.rpc<{ full_name: string | null }[]>('my_profile');
    expect(cleared[0]!.full_name).toBeNull();
  });

  it('deletes an account for good: the sign-in, the shared savings and the username', async () => {
    await clearPhoneStorage();
    const a = phone();
    const b = phone();
    await register(a, 'fay@example.com', 'fay_f');
    await register(b, 'gus@example.com', 'gus_g');
    const api = { a: createSharingApi(a.rpc), b: createSharingApi(b.rpc) };
    const group = await api.a.createGroup('Home');
    await api.a.invite(group, 'gus_g');
    await api.b.respond(group, true);
    const day = new Date().toISOString().slice(0, 10);
    await api.a.share({
      groupId: group,
      localId: 'dA:1',
      kind: 'deposit',
      amount: 1000,
      date: day,
      note: '',
    });
    await api.b.share({
      groupId: group,
      localId: 'dB:1',
      kind: 'deposit',
      amount: 500,
      date: day,
      note: '',
    });

    await a.auth.deleteAccount();
    expect(await a.auth.currentUser()).toBeNull();
    await expect(a.auth.signIn('fay@example.com', 'a-long-password')).rejects.toMatchObject({
      code: 'invalid_credentials',
    });
    expect(await b.auth.usernameAvailable('fay_f')).toBe(true);
    const t = await api.b.totals(group, day, day);
    expect(t.combined.totalNet).toBe(500);
    // The same email can register again.
    expect(await a.auth.signUp('fay@example.com', 'a-long-password', 'fay_f')).toBe(
      'verification-sent',
    );
  });

  it('shares savings between two phones through the real database rules', async () => {
    await clearPhoneStorage();
    const a = phone();
    const b = phone();
    const c = phone();
    await register(a, 'ann@example.com', 'ann_a');
    await register(b, 'ben@example.com', 'ben_b');
    await register(c, 'cat@example.com', 'cat_c');
    const api = {
      a: createSharingApi(a.rpc),
      b: createSharingApi(b.rpc),
      c: createSharingApi(c.rpc),
    };

    const group = await api.a.createGroup('Home');
    await api.a.invite(group, 'ben_b');
    expect(await api.b.myGroups()).toEqual([]); // pending: nothing visible
    expect((await api.b.myInvitations())[0]).toMatchObject({
      groupName: 'Home',
      invitedBy: 'ann_a',
    });
    await api.b.respond(group, true);

    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const day = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    await api.a.share({
      groupId: group,
      localId: 'dA:1',
      kind: 'deposit',
      amount: 500000,
      date: day,
      note: '',
    });
    await api.b.share({
      groupId: group,
      localId: 'dB:1',
      kind: 'deposit',
      amount: 300000,
      date: day,
      note: '',
    });

    for (const x of [api.a, api.b]) {
      const t = await x.totals(group, day, day);
      expect(t.combined).toMatchObject({ periodNet: 800000, totalNet: 800000, hasRecords: true });
      expect(t.members.map((m) => `${m.username}:${m.totalNet}`).sort()).toEqual([
        'ann_a:500000',
        'ben_b:300000',
      ]);
    }
    // A registered person who is not in the group reads nothing and cannot call in.
    expect(await api.c.myGroups()).toEqual([]);
    await expect(api.c.entries(group)).rejects.toThrow(/not a member/);
    // Calls without signing in are refused.
    await clearPhoneStorage(); // a phone with nobody signed in
    const stranger = phone();
    await expect(createSharingApi(stranger.rpc).myGroups()).rejects.toThrow();
  });

  it('tells the phones when something in a group changed', async () => {
    await clearPhoneStorage();
    const a = phone();
    await register(a, 'dan@example.com', 'dan_d');
    let changes = 0;
    const off = a.onGroupChange(() => {
      changes++;
    });
    await new Promise((r) => setTimeout(r, 3500)); // first poll records the starting version
    await createSharingApi(a.rpc).createGroup('Trip');
    await new Promise((r) => setTimeout(r, 3500));
    off();
    expect(changes).toBeGreaterThanOrEqual(1);
  }, 30_000);
});
