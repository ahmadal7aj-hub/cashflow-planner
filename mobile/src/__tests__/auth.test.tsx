import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { act, cleanup } from '@testing-library/react-native';
import { router } from 'expo-router';

import { emptyPlan } from '../domain/budgetModel';
import { setTestBackend } from '../state/testBackend';
import { setTestSeed } from '../state/testSeed';
import { routes } from '../testing/app';
import type { TestDb } from '../testing/db';
import { openAccountsApp, settle, startTestDb } from '../testing/accountsApp';
import { RESET_CODE, SIGNUP_CODE, TestBackend } from '../testing/fakeBackend';

let db: TestDb;
beforeAll(async () => {
  db = await startTestDb();
}, 90_000);
afterAll(async () => {
  await db.close();
});
beforeEach(async () => {
  await db.admin(
    'truncate public.group_events, public.shared_entries, public.group_members, public.groups, public.profiles, auth.users restart identity cascade',
  );
});
afterEach(async () => {
  await cleanup();
  jest.useRealTimers();
  setTestBackend(undefined);
  setTestSeed(undefined);
});

const type = (id: string, value: string) =>
  fireEvent.changeText(screen.getByTestId(`input-${id}`), value);

async function register(email: string, username: string, password = 'a-long-password') {
  await fireEvent.press(screen.getByTestId('auth-to-register'));
  await type('auth-username', username);
  await type('auth-email', email);
  await type('auth-password', password);
  await fireEvent.press(screen.getByTestId('auth-submit'));
}

describe('the app asks you to sign in when accounts are on', () => {
  it('shows the sign-in screen, not the app, while nobody is signed in', async () => {
    await openAccountsApp(db);
    await waitFor(() => expect(screen.getByTestId('auth-login')).toBeTruthy());
    expect(screen.queryByTestId('home-screen')).toBeNull();
  });

  it('runs on its own, without a sign-in, on a build with no accounts', async () => {
    jest.useFakeTimers({ now: new Date('2026-10-15T08:00:00') });
    setTestBackend(null);
    setTestSeed(emptyPlan());
    await renderRouter(routes, { initialUrl: '/dashboard' });
    expect(screen.getByTestId('dashboard-screen')).toBeTruthy();
    expect(screen.queryByTestId('auth-login')).toBeNull();
  });
});

describe('registration and email verification', () => {
  it('registers with a unique username and email, confirms the emailed code, and lands in the app', async () => {
    const { backend } = await openAccountsApp(db);
    await waitFor(() => expect(screen.getByTestId('auth-login')).toBeTruthy());
    await register('Sara@Example.com', 'Sara_A');
    await waitFor(() => expect(screen.getByTestId('auth-verify')).toBeTruthy());
    expect(backend.sentCodes).toEqual([{ email: 'sara@example.com', kind: 'signup' }]);
    expect(screen.getByText(/sara@example.com/)).toBeTruthy();

    await type('auth-code', SIGNUP_CODE);
    await fireEvent.press(screen.getByTestId('auth-submit'));
    await waitFor(() => expect(screen.getByTestId('home-screen')).toBeTruthy());

    // A real profile now exists in the database, with a lower-case username.
    const rows = await db.admin<{ username: string }>('select username from public.profiles');
    expect(rows).toEqual([{ username: 'sara_a' }]);
  });

  it('refuses a username that is already taken and an email that is already registered', async () => {
    const backend = new TestBackend(db);
    await backend.createAccount('taken@example.com', 'taken_name');
    await openAccountsApp(db, '/dashboard', { backend });
    await waitFor(() => expect(screen.getByTestId('auth-login')).toBeTruthy());

    await register('new@example.com', 'Taken_Name');
    await waitFor(() => expect(screen.getByTestId('error-auth-username')).toBeTruthy());
    expect(screen.getByTestId('error-auth-username').props.children).toBe(
      'That username is taken. Try another.',
    );

    await type('auth-username', 'fresh_name');
    await type('auth-email', 'taken@example.com');
    await fireEvent.press(screen.getByTestId('auth-submit'));
    await waitFor(() => expect(screen.getByTestId('error-auth-email')).toBeTruthy());
  });

  it('checks the form before asking the server: username, email and a 10-character password', async () => {
    await openAccountsApp(db);
    await waitFor(() => expect(screen.getByTestId('auth-login')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('auth-to-register'));
    await type('auth-username', 'ab');
    await type('auth-email', 'not-an-email');
    await type('auth-password', 'short');
    await fireEvent.press(screen.getByTestId('auth-submit'));
    expect(screen.getByTestId('error-auth-username').props.children).toBe(
      'A username has 3 to 20 characters.',
    );
    expect(screen.getByTestId('error-auth-email').props.children).toBe(
      'That does not look like an email address.',
    );
    expect(screen.getByTestId('error-auth-password').props.children).toBe(
      'Use at least 10 characters.',
    );
  });

  it('rejects a wrong code, lets you ask for a new one, and accepts the right one', async () => {
    const { backend } = await openAccountsApp(db);
    await waitFor(() => expect(screen.getByTestId('auth-login')).toBeTruthy());
    await register('sara@example.com', 'sara_a');
    await waitFor(() => expect(screen.getByTestId('auth-verify')).toBeTruthy());

    await type('auth-code', '000000');
    await fireEvent.press(screen.getByTestId('auth-submit'));
    await waitFor(() => expect(screen.getByTestId('auth-form-error')).toBeTruthy());
    expect(screen.queryByTestId('home-screen')).toBeNull();

    await fireEvent.press(screen.getByTestId('auth-resend'));
    await waitFor(() => expect(screen.getByTestId('auth-notice')).toBeTruthy());
    expect(backend.sentCodes.filter((c) => c.kind === 'signup')).toHaveLength(2);

    await type('auth-code', SIGNUP_CODE);
    await fireEvent.press(screen.getByTestId('auth-submit'));
    await waitFor(() => expect(screen.getByTestId('home-screen')).toBeTruthy());
  });
});

describe('login with email and password', () => {
  it('signs in with the right email and password, ignoring letter case in the email', async () => {
    const backend = new TestBackend(db);
    await backend.createAccount('sara@example.com', 'sara_a', 'correct-horse-battery');
    await openAccountsApp(db, '/dashboard', { backend });
    await waitFor(() => expect(screen.getByTestId('auth-login')).toBeTruthy());
    await type('auth-email', ' Sara@Example.com ');
    await type('auth-password', 'correct-horse-battery');
    await fireEvent.press(screen.getByTestId('auth-submit'));
    await waitFor(() => expect(screen.getByTestId('home-screen')).toBeTruthy());
  });

  it('says the same thing for a wrong password and an unknown email, and stays signed out', async () => {
    const backend = new TestBackend(db);
    await backend.createAccount('sara@example.com', 'sara_a', 'correct-horse-battery');
    await openAccountsApp(db, '/dashboard', { backend });
    await waitFor(() => expect(screen.getByTestId('auth-login')).toBeTruthy());

    await type('auth-email', 'sara@example.com');
    await type('auth-password', 'wrong-password-1');
    await fireEvent.press(screen.getByTestId('auth-submit'));
    await waitFor(() => expect(screen.getByTestId('auth-form-error')).toBeTruthy());
    const wrongPassword = screen.getByTestId('auth-form-error').props.children;

    await type('auth-email', 'nobody@example.com');
    await fireEvent.press(screen.getByTestId('auth-submit'));
    await waitFor(() =>
      expect(screen.getByTestId('auth-form-error').props.children).toBe(wrongPassword),
    );
    expect(screen.queryByTestId('home-screen')).toBeNull();
  });

  it('sends someone who has not confirmed their email to the code screen', async () => {
    const backend = new TestBackend(db);
    backend.accounts.set('sara@example.com', {
      password: 'correct-horse-battery',
      username: 'sara_a',
      verified: false,
      userId: null,
    });
    await openAccountsApp(db, '/dashboard', { backend });
    await waitFor(() => expect(screen.getByTestId('auth-login')).toBeTruthy());
    await type('auth-email', 'sara@example.com');
    await type('auth-password', 'correct-horse-battery');
    await fireEvent.press(screen.getByTestId('auth-submit'));
    await waitFor(() => expect(screen.getByTestId('auth-verify')).toBeTruthy());
  });

  it('keeps you signed in when the app reopens with a saved session', async () => {
    const backend = new TestBackend(db);
    await backend.createAccount('sara@example.com', 'sara_a');
    await backend.signInAs('sara@example.com');
    await openAccountsApp(db, '/dashboard', { backend });
    await waitFor(() => expect(screen.getByTestId('dashboard-screen')).toBeTruthy());
    expect(screen.queryByTestId('auth-login')).toBeNull();
  });
});

describe('logout', () => {
  it('asks first, then signs out and shows the sign-in screen again', async () => {
    const backend = new TestBackend(db);
    await backend.createAccount('sara@example.com', 'sara_a');
    await backend.signInAs('sara@example.com');
    await openAccountsApp(db, '/account', { backend });
    await settle(db); // the profile is read from the database first
    await waitFor(() => expect(screen.getByTestId('account-card')).toBeTruthy());
    expect(screen.getByTestId('profile-username')).toHaveTextContent('sara_a');
    expect(screen.getByTestId('profile-email')).toHaveTextContent('sara@example.com');

    await fireEvent.press(screen.getByTestId('signout'));
    expect(screen.getByTestId('signout-ask')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('signout-cancel'));
    expect(screen.queryByTestId('signout-ask')).toBeNull();

    await fireEvent.press(screen.getByTestId('signout'));
    await fireEvent.press(screen.getByTestId('signout-confirm'));
    await waitFor(() => expect(screen.getByTestId('auth-login')).toBeTruthy());
    expect(backend.userId).toBeNull();
  });
});

describe('password reset', () => {
  it('sends a code, accepts the right one with a new password, and the new password works', async () => {
    const backend = new TestBackend(db);
    await backend.createAccount('sara@example.com', 'sara_a', 'old-password-123');
    await openAccountsApp(db, '/dashboard', { backend });
    await waitFor(() => expect(screen.getByTestId('auth-login')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('auth-forgot'));
    await type('auth-email', 'sara@example.com');
    await fireEvent.press(screen.getByTestId('auth-submit'));
    await waitFor(() => expect(screen.getByTestId('auth-reset')).toBeTruthy());
    expect(backend.sentCodes).toContainEqual({ email: 'sara@example.com', kind: 'reset' });

    await type('auth-code', '111111');
    await type('auth-password', 'brand-new-password');
    await fireEvent.press(screen.getByTestId('auth-submit'));
    await waitFor(() => expect(screen.getByTestId('auth-form-error')).toBeTruthy()); // wrong code

    await type('auth-code', RESET_CODE);
    await fireEvent.press(screen.getByTestId('auth-submit'));
    await waitFor(() => expect(screen.getByTestId('dashboard-screen')).toBeTruthy());
    expect(backend.accounts.get('sara@example.com')!.password).toBe('brand-new-password');
  });

  it('reveals nothing about whether an email has an account', async () => {
    const { backend } = await openAccountsApp(db);
    await waitFor(() => expect(screen.getByTestId('auth-login')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('auth-forgot'));
    await type('auth-email', 'nobody@example.com');
    await fireEvent.press(screen.getByTestId('auth-submit'));
    await waitFor(() => expect(screen.getByTestId('auth-reset')).toBeTruthy()); // same next screen
    expect(backend.sentCodes).toEqual([]); // but nothing was sent
  });
});

describe('my profile', () => {
  it('opens from the user icon at the top right and shows the username and email to share', async () => {
    const backend = new TestBackend(db);
    await backend.createAccount('sara@example.com', 'sara_a');
    await backend.signInAs('sara@example.com');
    await openAccountsApp(db, '/dashboard', { backend });
    await waitFor(() => expect(screen.getByTestId('profile-button')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('profile-button'));
    await waitFor(() => expect(screen.getByTestId('profile-username')).toBeTruthy());
    expect(screen.getByTestId('profile-username')).toHaveTextContent('sara_a');
    expect(screen.getByTestId('profile-email')).toHaveTextContent('sara@example.com');
    expect(screen.getByTestId('profile-share-username')).toBeTruthy();
  });
});

describe('name and phone', () => {
  it('are optional at sign-up, shown on the profile, and can be edited or cleared', async () => {
    await openAccountsApp(db);
    await waitFor(() => expect(screen.getByTestId('auth-login')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('auth-to-register'));
    await type('auth-username', 'sara_a');
    await type('auth-email', 'sara@example.com');
    await type('auth-fullname', 'Sara Ahmed');
    await type('auth-phone', '+971 50 123 4567');
    await type('auth-password', 'a-long-password');
    await fireEvent.press(screen.getByTestId('auth-submit'));
    await waitFor(() => expect(screen.getByTestId('auth-verify')).toBeTruthy());
    await type('auth-code', SIGNUP_CODE);
    await fireEvent.press(screen.getByTestId('auth-submit'));
    await waitFor(() => expect(screen.getByTestId('home-screen')).toBeTruthy());
    await settle(db); // the app first returns to the welcome page after signing in
    await act(async () => router.push('/account'));
    await waitFor(() => expect(screen.getByTestId('profile-name')).toBeTruthy());
    expect(screen.getByTestId('profile-name')).toHaveTextContent('Sara Ahmed');
    expect(screen.getByTestId('profile-phone')).toHaveTextContent('+971 50 123 4567');

    // A bad phone number is refused and nothing changes.
    await fireEvent.press(screen.getByTestId('profile-edit'));
    await type('profile-edit-phone', 'call me');
    await fireEvent.press(screen.getByTestId('profile-save'));
    expect(screen.getByTestId('error-profile-edit-phone')).toBeTruthy();

    await type('profile-edit-phone', '');
    await type('profile-edit-name', 'Sara A.');
    await fireEvent.press(screen.getByTestId('profile-save'));
    await settle(db);
    await waitFor(() => expect(screen.getByTestId('profile-saved')).toBeTruthy());
    expect(screen.getByTestId('profile-name')).toHaveTextContent('Sara A.');
    expect(screen.getByTestId('profile-phone')).toHaveTextContent('Not set');
    const rows = await db.admin<{ full_name: string; phone: string | null }>(
      'select full_name, phone from public.profiles',
    );
    expect(rows).toEqual([{ full_name: 'Sara A.', phone: null }]);
  });

  it('can be left out entirely', async () => {
    await openAccountsApp(db);
    await waitFor(() => expect(screen.getByTestId('auth-login')).toBeTruthy());
    await register('lee@example.com', 'lee_l');
    await waitFor(() => expect(screen.getByTestId('auth-verify')).toBeTruthy());
    await type('auth-code', SIGNUP_CODE);
    await fireEvent.press(screen.getByTestId('auth-submit'));
    await waitFor(() => expect(screen.getByTestId('home-screen')).toBeTruthy());
    await settle(db);
    await act(async () => router.push('/account'));
    await waitFor(() => expect(screen.getByTestId('profile-name')).toBeTruthy());
    expect(screen.getByTestId('profile-name')).toHaveTextContent('Not set');
  });
});
