# Try accounts and shared savings on your own phones (no Supabase needed)

This runs a **local test server on your computer**. It uses the real database rules (the same files that will go to
Supabase) in an embedded database, so you can register two accounts, connect them, share savings and see the Shared
Savings dashboard. It is **for testing only**: the confirmation code for every email is always **123456**, no real
emails are sent, and the data stays on your computer in `mobile\.dev-data`.

You need: your computer and your phone(s) on the **same Wi-Fi**, and Expo Go on the phone.

## 1. Start the test server (PowerShell window 1)

```
cd C:\Users\ahmad\Projects\Budgeting\cashflow-planner\mobile
npm.cmd run dev:server
```

Wait for "LOCAL TEST SERVER running". It prints one or more lines like:

```
put this line in mobile/.env.local:  EXPO_PUBLIC_DEV_SERVER_URL=http://192.168.1.128:8787
```

If it prints several, use the one that starts with `192.168.` (your Wi-Fi). If Windows asks about the firewall, choose
**Allow** for **private networks**. Leave this window open.

## 2. Tell the app where it is

1. In File Explorer open `C:\Users\ahmad\Projects\Budgeting\cashflow-planner\mobile`.
2. Create a text file named exactly `.env.local` (in Notepad choose Save as, type the name in quotes, `".env.local"`).
3. Put that one line in it, with your own address:

   ```
   EXPO_PUBLIC_DEV_SERVER_URL=http://192.168.1.128:8787
   ```

## 3. Start the app (PowerShell window 2)

```
cd C:\Users\ahmad\Projects\Budgeting\cashflow-planner\mobile
npm.cmd start -- --clear
```

Scan the QR code with Expo Go. You should see **Sign in** instead of the welcome page. (To check the phone can reach the
server, open `http://YOUR-IP:8787/health` in the phone's browser: it should show `{"ok":true}`.)

## 4. Two accounts

You can use **two phones**, or **one phone** and switch accounts (Settings, **Account and groups**, **Sign out**).

**Account A**
1. **Create an account**: a unique username (for example `sara_a`), an email (any address, for example `a@test.com`) and a
   password of at least 10 characters. Type the code **123456**.
2. Tap **Get started** and answer the savings questions (0 is fine).
3. Settings, **Account and groups**, **Groups and shared savings**, **Start a group** (for example "Home"). On the group
   screen type the other person's **username** under **Invite someone** and send.

**Account B** (the other phone, or after signing out on this one)
1. **Create an account** with a different username and email, code **123456**, **Get started**, savings questions.
2. Settings, **Account and groups**, **Groups and shared savings**: you see the invitation. Nothing is shared until you
   **Accept**.

## 5. Share savings (the example)

1. **Account A**: Savings planning, **Add money**, AED 5,000. Under **Share this saving** pick **Home**. Save.
   Add AED 2,000 again and leave it on **Keep private**. A **Shared Savings** tab appears.
   Your personal total is AED 7,000; Shared Savings shows only AED 5,000.
2. **Account B**: a **Shared Savings** tab appears (it can take a few seconds, or tap **Refresh**). Add AED 3,000 with
   **Home** selected.
3. Both accounts now show **AED 8,000** under **Total savings**: AED 5,000 from A, AED 3,000 from B. B never sees A's
   private AED 2,000 or A's personal total.
4. Try the date buttons, **Period savings / Total savings**, **Make private**, editing, and **Leave this group**.

## If something does not work

| Problem | What to do |
|---|---|
| The app still opens on the welcome page | `.env.local` is missing or wrong. Check the name and the line, then restart with `npm.cmd start -- --clear` |
| "Cannot reach the test server" | Same Wi-Fi? Server window still open? Right IP? Allow Node in Windows Firewall (private networks) |
| The phone browser cannot open `http://YOUR-IP:8787/health` | A firewall or a different network (guest Wi-Fi) is blocking it |
| You want a clean start | Stop the server (Ctrl+C), delete the folder `mobile\.dev-data`, start it again |
| You are done testing | Delete `.env.local` and restart the app: it goes back to local-only |

The real thing (Supabase, real emails) is set up with `docs/BACKEND-SETUP.md` when you are ready.
