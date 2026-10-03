# Backend setup (accounts and shared savings)

Accounts and shared savings need a backend. The app uses **Supabase** (ADR 0002 and ADR 0006). Until these steps are
done the app still works exactly as before, on its own, with accounts switched off (the Account screen says so).

**What only you can do:** create the Supabase project and its keys. Nothing here uses a secret key; the two values the
app needs are public by design.

> **Want to try it first, without Supabase?** `docs/TEST-WITH-TWO-ACCOUNTS.md` runs a local test server on your
> computer so you can test two accounts and shared savings on your phones today.

## 1. Create the project (about 5 minutes)

1. Go to <https://supabase.com>, sign in, and choose **New project**. Pick a name, a strong database password (keep it
   in your password manager; the app never needs it) and the region **closest to the UAE** (for example Frankfurt or
   Mumbai). The free plan is enough to test.
2. Wait until the project is ready.

## 2. Create the tables and rules

1. In the project, open **SQL Editor**, choose **New query**.
2. Open `supabase/migrations/20261003000000_accounts_and_shared_savings.sql` from this repository, copy **all** of it,
   paste it in, and press **Run**. It should finish with "Success".
3. This creates the profiles, groups, members, shared entries and history tables, turns on **Row Level Security** on
   every one, and creates the functions the app calls. It does not touch anything else.
4. Do the same with the second file, `supabase/migrations/20261004000000_profile_name_phone.sql` (optional name and phone
   on the profile). Always run the migrations in file-name order.

## 3. Authentication settings

In **Authentication** in the Supabase dashboard:

| Setting                                    | Value                            | Why                                            |
| ------------------------------------------ | -------------------------------- | ---------------------------------------------- |
| Providers, Email                           | **On**                           | Registration and login with email and password |
| Confirm email                              | **On**                           | Email verification is required before sign-in  |
| Minimum password length                    | **10**                           | Matches the app's rule                         |
| Secure password change / re-authentication | On                               | Safer password changes                         |
| Rate limits                                | Keep the defaults, or lower them | Limits guessing and email abuse                |

**Email templates.** The app asks people to type the code from the email, so the emails must contain the code. In
**Authentication, Email templates** edit these two, and make sure each body contains `{{ .Token }}`:

- **Confirm signup**: for example "Your confirmation code is {{ .Token }}".
- **Reset password**: for example "Your password reset code is {{ .Token }}".

**Email delivery.** Supabase's built-in sender is limited to a few emails an hour and is for testing. Before real
users, add your own SMTP provider in **Authentication, SMTP settings**.

## 4. Connect the app

1. In **Project Settings, API**, copy the **Project URL** and the **anon public** key. (Never use the `service_role`
   key anywhere in the app.)
2. In `mobile/`, create a file named `.env.local` (it is git-ignored) with:

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
   ```

3. Start the app with a clean cache: `npm.cmd start -- --clear`. Open it in Expo Go. You should now see the **Sign in**
   screen instead of the welcome page.

## 5. Check it with two phones (about 10 minutes)

1. **Phone A:** Create account (username, email, password), type the code from the email. Then
   Settings, **Account and groups**, **Start a group**, name it, and invite the second person by username or email.
2. **Phone B:** Create an account with the other email, confirm the code. Settings, **Account and groups**: accept the
   invitation.
3. **Phone A:** Savings planning, **Add money**, AED 5,000, choose the group under **Share this saving**, save. Add another
   AED 2,000 and leave it on **Keep private**. A **Shared** section appears on the **Dashboards** tab.
4. **Phone B:** a **Shared** section appears on the **Dashboards** tab. Add AED 3,000 shared.
5. **Both phones** show AED 8,000 under **Total savings** (AED 5,000 from A and AED 3,000 from B). Phone A's personal
   total is AED 7,000 and Phone B never sees the private AED 2,000.
6. Change the dates (Last month, Custom date range) and the **Period / Total savings** toggle on both phones.

Open the **Table editor** in Supabase and confirm that only the two shared entries are there (AED 5,000 and AED 3,000).
The private AED 2,000 must not appear anywhere.

## Things to know

- **The database enforces privacy** (Row Level Security and checked functions), not just the screens.
- **Your own records stay on your phone.** Only savings you choose to share are sent. Each account has its own saved
  plan on a phone; the first account to sign in takes over what was already on the phone (a copy, with a backup).
- **Not built yet:** deleting an account, signing in on a second phone and seeing the same personal records (only shared
  savings are shared between phones), invitations to people without an account, and two-factor sign-in.
- **Before real users:** UAE PDPL review and a privacy notice, your own SMTP sender, a decision on encrypting the
  saved data on the phone, and a rate-limit and abuse review.
- **To switch it off again:** remove the two values from `.env.local` and restart. The app goes back to local-only. The
  data in Supabase is untouched. See `docs/ROLLBACK.md` for removing the backend completely.
