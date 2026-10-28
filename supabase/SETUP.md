# Connecting the bookings to Supabase

Until these steps are done, the site and the staff panel run in **demo mode**: the booking form on the
PlayStation room pages only shows on a preview link (`zayed-ps-room.html?room=vip&demo`), and the panel
(`admin/#demo`) keeps its bookings in the browser that opened it. Real customers keep booking on WhatsApp.

## 1. Make the project (5 minutes)

1. Go to <https://supabase.com>, sign up, and press **New project**.
   - Name: `clash`
   - Database password: make one and keep it somewhere safe (you will not need it day to day).
   - Region: the closest one offered (Frankfurt, `eu-central-1`, is a good choice from Egypt).
2. Wait for the project to finish setting up (about a minute).

## 2. Create the tables

1. In the project, open **SQL Editor** → **New query**.
2. Paste the whole of `supabase/schema.sql` and press **Run**. It should end with "Success. No rows returned".

## 3. Sign-in settings

1. **Authentication** → **Sign In / Providers**: make sure **Email** is on.
   - If you want staff to get in without confirming their email first, turn **Confirm email** off.
     If you keep it on, they confirm from their inbox once, then sign in.
2. **Authentication** → **URL Configuration** → **Site URL**:
   `https://simaryalx.github.io/Clash-Web/admin/`

## 4. Send the two keys

**Project Settings** → **API** (or **Data API**). Copy:

- **Project URL** (looks like `https://abcdxyz.supabase.co`)
- **anon public** key (a long text starting with `eyJ...`)

Both are meant to be public: the database rules in `schema.sql` decide what anyone may do with them.
Put them in `js/config.js` (or send them over and they will be put in). **Never** share the
`service_role` key.

## 5. Make yourself the owner

1. Open `https://simaryalx.github.io/Clash-Web/admin/` and choose **Create an account** with your email.
2. Back in Supabase, **SQL Editor** → **New query**, run (with your email):

   ```sql
   select public.make_owner('you@example.com');
   ```

3. Sign in on the panel. You now see everything, including **Team**.

## 6. Add the team

Send each person the panel link. They create an account; they appear under **Team → Waiting for
approval**; you pick their role (Shift, Manager or Owner) and press **Approve**.

| Role | Bookings and board | Rooms in or out of service | Team |
| --- | --- | --- | --- |
| Shift | yes | see only | no |
| Manager | yes | yes | see only |
| Owner | yes | yes | yes |

## What the database guarantees

- Visitors can only send a request (checked again on the server: name, Egyptian mobile, an hour in the
  next 31 days, at most 3 waiting requests per mobile) and see which rooms are taken (times only, no
  names or numbers).
- Two confirmed bookings can never hold the same room at the same time.
- Every change to a booking is logged with who made it and when (the History in each booking).
