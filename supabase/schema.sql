-- Clash Esports bookings: the database behind the site's booking form and the staff panel (admin/).
-- Run this whole file once in Supabase: Project → SQL Editor → New query → paste → Run.
-- It is safe to run again: it creates what is missing and replaces the functions.
--
-- Who can do what
--   visitors (anon)   read the rooms, ask which rooms are taken (times only, no names), and send a booking request
--   staff (signed in) shift:   see and work the bookings, the rooms board
--                     manager: the same, plus put rooms in or out of service
--                     owner:   the same, plus decide who is staff and with what role
-- Nobody can write to the tables directly from a browser except through the rules below.

create extension if not exists pgcrypto;
create extension if not exists btree_gist;

-- ---------------------------------------------------------------- rooms: every bookable room, one row each
create table if not exists public.rooms (
  id          text primary key,                 -- 'zayed-ps-normal-1'
  branch      text not null,                    -- 'zayed'
  kind        text not null,                    -- 'ps' (PlayStation); 'pc' later
  type        text not null,                    -- 'normal' | 'vip' | 'pool' | 'cinema'
  number      int  not null,
  name        text not null,                    -- 'Normal 1'
  side        text check (side in ('red', 'blue')),
  in_service  boolean not null default true,
  note        text,
  sort        int  not null default 0
);

insert into public.rooms (id, branch, kind, type, number, name, side, sort) values
  ('zayed-ps-normal-1', 'zayed', 'ps', 'normal', 1, 'Normal 1', 'blue', 11),
  ('zayed-ps-normal-2', 'zayed', 'ps', 'normal', 2, 'Normal 2', 'blue', 12),
  ('zayed-ps-normal-3', 'zayed', 'ps', 'normal', 3, 'Normal 3', 'blue', 13),
  ('zayed-ps-normal-4', 'zayed', 'ps', 'normal', 4, 'Normal 4', 'blue', 14),
  ('zayed-ps-normal-5', 'zayed', 'ps', 'normal', 5, 'Normal 5', 'blue', 15),
  ('zayed-ps-normal-6', 'zayed', 'ps', 'normal', 6, 'Normal 6', 'blue', 16),
  ('zayed-ps-normal-7', 'zayed', 'ps', 'normal', 7, 'Normal 7', 'blue', 17),
  ('zayed-ps-normal-8', 'zayed', 'ps', 'normal', 8, 'Normal 8', 'blue', 18),
  ('zayed-ps-vip-1',    'zayed', 'ps', 'vip',    1, 'VIP 1',    'red',  21),
  ('zayed-ps-vip-2',    'zayed', 'ps', 'vip',    2, 'VIP 2',    'red',  22),
  ('zayed-ps-pool-1',   'zayed', 'ps', 'pool',   1, 'Pool',     'blue', 31),
  ('zayed-ps-cinema-1', 'zayed', 'ps', 'cinema', 1, 'Cinema',   'red',  41)
on conflict (id) do nothing;

-- ---------------------------------------------------------------- staff: who may open the panel
create table if not exists public.staff (
  user_id     uuid primary key references auth.users on delete cascade,
  email       text not null,
  name        text not null,
  role        text not null default 'shift'   check (role in ('owner', 'manager', 'shift')),
  status      text not null default 'pending' check (status in ('pending', 'active', 'disabled')),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------- bookings
create table if not exists public.bookings (
  id              uuid primary key default gen_random_uuid(),
  ref             bigint generated always as identity (start with 1001) unique,
  branch          text not null default 'zayed',
  kind            text not null default 'ps',
  room_type       text not null,
  requested_room  text references public.rooms (id),     -- null: any free room of the type
  room_id         text references public.rooms (id),     -- the room staff gave it
  starts_at       timestamptz not null,
  minutes         int check (minutes between 30 and 1440), -- set by staff when they confirm
  customer_name   text not null,
  customer_phone  text not null,
  customer_note   text,
  source          text not null default 'web' check (source in ('web', 'staff')),
  status          text not null default 'pending'
                  check (status in ('pending', 'confirmed', 'cancelled', 'done', 'no_show')),
  staff_note      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  updated_by      uuid references auth.users,
  -- a confirmed booking needs a room and a length, and two confirmed bookings never share a room at the same time
  constraint confirmed_is_complete check (status <> 'confirmed' or (room_id is not null and minutes is not null)),
  constraint no_double_booking exclude using gist (
    room_id with =,
    tstzrange(starts_at, starts_at + make_interval(mins => coalesce(minutes, 0))) with &&
  ) where (status = 'confirmed')
);
create index if not exists bookings_starts_at on public.bookings (starts_at);
create index if not exists bookings_status on public.bookings (status);

-- ---------------------------------------------------------------- what happened to each booking, and who did it
create table if not exists public.booking_events (
  id          bigint generated always as identity primary key,
  booking_id  uuid not null references public.bookings on delete cascade,
  at          timestamptz not null default now(),
  by_user     uuid references auth.users,
  by_name     text,
  action      text not null,       -- 'requested' | 'added' | 'confirmed' | 'cancelled' | 'done' | 'no_show' | 'reopened' | 'edited'
  detail      jsonb
);
create index if not exists booking_events_booking on public.booking_events (booking_id, at);

-- ---------------------------------------------------------------- helpers
-- the signed-in person's role, or null when they are not active staff
create or replace function public.staff_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.staff where user_id = auth.uid() and status = 'active'
$$;

-- every change to a booking is stamped and logged
create or replace function public.bookings_stamp() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  who_name text := (select name from public.staff where user_id = auth.uid());
  what text;
begin
  if tg_op = 'INSERT' then
    insert into public.booking_events (booking_id, by_user, by_name, action, detail)
    values (new.id, auth.uid(), who_name, case when new.source = 'staff' then 'added' else 'requested' end,
            jsonb_build_object('room', coalesce(new.requested_room, new.room_id), 'starts_at', new.starts_at));
    return new;
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  what := case
    when new.status <> old.status and new.status = 'pending' then 'reopened'
    when new.status <> old.status then new.status
    else 'edited' end;
  insert into public.booking_events (booking_id, by_user, by_name, action, detail)
  values (new.id, auth.uid(), who_name, what, jsonb_build_object(
    'room', new.room_id, 'starts_at', new.starts_at, 'minutes', new.minutes,
    'was', jsonb_build_object('room', old.room_id, 'starts_at', old.starts_at, 'minutes', old.minutes, 'status', old.status)));
  return new;
end $$;

drop trigger if exists bookings_stamp_insert on public.bookings;
create trigger bookings_stamp_insert after insert on public.bookings for each row execute function public.bookings_stamp();
drop trigger if exists bookings_stamp_update on public.bookings;
create trigger bookings_stamp_update before update on public.bookings for each row execute function public.bookings_stamp();

-- ---------------------------------------------------------------- what visitors may call
-- which rooms are taken between two moments: times and rooms only, never names or phones.
-- A confirmed booking holds its room for its length; a request for a named room holds it for two hours until staff decide.
create or replace function public.room_busy(p_from timestamptz, p_to timestamptz)
returns table (room_id text, starts_at timestamptz, ends_at timestamptz, status text)
language sql stable security definer set search_path = public as $$
  select b.room_id, b.starts_at, b.starts_at + make_interval(mins => b.minutes), b.status
    from public.bookings b
   where b.status = 'confirmed' and b.starts_at < p_to and b.starts_at + make_interval(mins => b.minutes) > p_from
  union all
  select b.requested_room, b.starts_at, b.starts_at + interval '2 hours', b.status
    from public.bookings b
   where b.status = 'pending' and b.requested_room is not null and b.starts_at < p_to and b.starts_at + interval '2 hours' > p_from
$$;

-- a visitor's booking request. Checks everything the form checks, again, here.
create or replace function public.request_booking(
  p_room_type text, p_room text, p_starts_at timestamptz, p_name text, p_phone text, p_note text default null)
returns table (ref bigint)
language plpgsql security definer set search_path = public as $$
declare
  phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  name  text := btrim(coalesce(p_name, ''));
  local_start timestamp := p_starts_at at time zone 'Africa/Cairo';
  new_ref bigint;
begin
  if phone like '20%' and length(phone) = 12 then phone := '0' || substr(phone, 3); end if;
  if phone !~ '^01[0125][0-9]{8}$' then raise exception 'bad_phone'; end if;
  if length(name) < 2 or length(name) > 60 then raise exception 'bad_name'; end if;
  if not exists (select 1 from public.rooms where branch = 'zayed' and kind = 'ps' and type = p_room_type and in_service) then
    raise exception 'bad_room';
  end if;
  if p_room is not null and not exists (
    select 1 from public.rooms where id = p_room and type = p_room_type and in_service) then
    raise exception 'bad_room';
  end if;
  if p_starts_at < now() + interval '20 minutes' or p_starts_at > now() + interval '31 days'
     or extract(minute from local_start) <> 0 then
    raise exception 'bad_time';
  end if;
  if (select count(*) from public.bookings
       where customer_phone = phone and status in ('pending', 'confirmed') and starts_at > now()) >= 3 then
    raise exception 'too_many';
  end if;
  if p_room is not null and exists (
    select 1 from public.room_busy(p_starts_at, p_starts_at + interval '1 hour') r where r.room_id = p_room) then
    raise exception 'room_busy';
  end if;
  insert into public.bookings (room_type, requested_room, starts_at, customer_name, customer_phone, customer_note, source)
  values (p_room_type, p_room, p_starts_at, name, phone, nullif(left(btrim(coalesce(p_note, '')), 300), ''), 'web')
  returning bookings.ref into new_ref;
  return query select new_ref;
end $$;

-- someone signed up on the panel asks to become staff; the owner approves them in the panel
create or replace function public.request_staff_access(p_name text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  insert into public.staff (user_id, email, name)
  select auth.uid(), u.email, left(btrim(p_name), 60) from auth.users u where u.id = auth.uid()
  on conflict (user_id) do nothing;
end $$;

-- the first owner, run by hand in the SQL editor after signing up on the panel:
--   select public.make_owner('you@example.com');
create or replace function public.make_owner(p_email text) returns text
language plpgsql security definer set search_path = public as $$
declare uid uuid := (select id from auth.users where lower(email) = lower(p_email));
begin
  if uid is null then return 'No account with that email yet: sign up on the panel first.'; end if;
  insert into public.staff (user_id, email, name, role, status) values (uid, p_email, split_part(p_email, '@', 1), 'owner', 'active')
  on conflict (user_id) do update set role = 'owner', status = 'active';
  return 'Done: ' || p_email || ' is the owner.';
end $$;

revoke all on function public.make_owner(text) from public, anon, authenticated;
grant execute on function public.room_busy(timestamptz, timestamptz) to anon, authenticated;
grant execute on function public.request_booking(text, text, timestamptz, text, text, text) to anon, authenticated;
grant execute on function public.request_staff_access(text) to authenticated;
grant execute on function public.staff_role() to authenticated;

-- ---------------------------------------------------------------- row level security
alter table public.rooms enable row level security;
alter table public.staff enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_events enable row level security;

drop policy if exists rooms_read on public.rooms;
create policy rooms_read on public.rooms for select using (true);
drop policy if exists rooms_manage on public.rooms;
create policy rooms_manage on public.rooms for update using (public.staff_role() in ('owner', 'manager'));

drop policy if exists staff_read on public.staff;
create policy staff_read on public.staff for select using (user_id = auth.uid() or public.staff_role() is not null);
drop policy if exists staff_manage on public.staff;
create policy staff_manage on public.staff for update using (public.staff_role() = 'owner');
drop policy if exists staff_remove on public.staff;
create policy staff_remove on public.staff for delete using (public.staff_role() = 'owner' and user_id <> auth.uid());

drop policy if exists bookings_read on public.bookings;
create policy bookings_read on public.bookings for select using (public.staff_role() is not null);
drop policy if exists bookings_add on public.bookings;
create policy bookings_add on public.bookings for insert with check (public.staff_role() is not null and source = 'staff');
drop policy if exists bookings_work on public.bookings;
create policy bookings_work on public.bookings for update using (public.staff_role() is not null);

drop policy if exists events_read on public.booking_events;
create policy events_read on public.booking_events for select using (public.staff_role() is not null);

-- ---------------------------------------------------------------- live updates in the panel
do $$ begin
  alter publication supabase_realtime add table public.bookings;
exception when duplicate_object then null; when undefined_object then null; end $$;
