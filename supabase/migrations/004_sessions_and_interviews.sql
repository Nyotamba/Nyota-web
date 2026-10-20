-- 004 — Virtual sessions (group events) and 1:1 interview slots.
-- Run once in Supabase → SQL Editor. Safe to run again.
--
-- Rules
--  * The session programme is public (titles, times, organiser, seats left), even without signing in.
--  * The video link (Zoom / Teams / Meet) is never readable from the table: session_link() returns it only to
--    the organiser, admins, or registered students from 15 minutes before the start until 30 minutes after the end.
--  * Companies see who registered for THEIR sessions, by name only when the student shared a verified profile.
--  * Interview slots: a company opens slots; only students that company requested an interview with can see
--    and book them, one slot per company.

do $$ begin
  create type session_kind as enum ('Presentation', 'Panel', 'Workshop', 'Networking');
exception when duplicate_object then null; end $$;

create table if not exists sessions (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid references companies (id) on delete cascade,   -- null = organised by the club
  title         text not null check (char_length(title) between 3 and 120),
  kind          session_kind not null default 'Presentation',
  description   text not null default '' check (char_length(description) <= 1000),
  starts_at     timestamptz not null,
  duration_min  int not null default 45 check (duration_min between 10 and 480),
  capacity      int check (capacity is null or capacity > 0),
  meeting_url   text not null default '',
  created_by    uuid references profiles (id) default auth.uid(),
  created_at    timestamptz not null default now()
);

create table if not exists session_registrations (
  session_id    uuid not null references sessions (id) on delete cascade,
  candidate_id  uuid not null references candidates (id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (session_id, candidate_id)
);

create table if not exists interview_slots (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies (id) on delete cascade,
  starts_at     timestamptz not null,
  duration_min  int not null default 30 check (duration_min between 10 and 180),
  meeting_url   text not null default '',
  candidate_id  uuid references candidates (id) on delete set null,
  booked_at     timestamptz,
  created_at    timestamptz not null default now()
);
create unique index if not exists one_booking_per_company on interview_slots (company_id, candidate_id) where candidate_id is not null;
create unique index if not exists one_slot_per_time on interview_slots (company_id, starts_at);

alter table sessions enable row level security;
alter table session_registrations enable row level security;
alter table interview_slots enable row level security;

-- Privileges: the meeting link column is never selectable; registrations only through functions below.
revoke all on sessions, session_registrations, interview_slots from anon, authenticated;
grant select (id, company_id, title, kind, description, starts_at, duration_min, capacity, created_at) on sessions to authenticated;
grant insert (company_id, title, kind, description, starts_at, duration_min, capacity, meeting_url) on sessions to authenticated;
grant update (company_id, title, kind, description, starts_at, duration_min, capacity, meeting_url) on sessions to authenticated;
grant delete on sessions to authenticated;
grant select, delete on interview_slots to authenticated;
grant insert (company_id, starts_at, duration_min, meeting_url) on interview_slots to authenticated;
grant update (starts_at, duration_min, meeting_url) on interview_slots to authenticated;

drop policy if exists "signed-in users read sessions" on sessions;
create policy "signed-in users read sessions" on sessions for select to authenticated using (true);
drop policy if exists "admin manages sessions" on sessions;
create policy "admin manages sessions" on sessions for all to authenticated
  using (my_role() = 'admin') with check (my_role() = 'admin');
drop policy if exists "company manages own sessions" on sessions;
create policy "company manages own sessions" on sessions for all to authenticated
  using (my_role() = 'company' and company_id = my_company())
  with check (my_role() = 'company' and company_id = my_company());

drop policy if exists "company manages own slots" on interview_slots;
create policy "company manages own slots" on interview_slots for all to authenticated
  using (my_role() = 'company' and company_id = my_company())
  with check (my_role() = 'company' and company_id = my_company());
drop policy if exists "admin reads slots" on interview_slots;
create policy "admin reads slots" on interview_slots for select to authenticated using (my_role() = 'admin');

-- Sessions ---------------------------------------------------------------------

create or replace function is_session_organiser(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(my_role() = 'admin', false)
      or exists (select 1 from sessions s where s.id = sid and my_role() = 'company' and s.company_id = my_company())
$$;

-- Public programme: upcoming and recent sessions (last 30 days), with seats and the caller's status.
create or replace function list_sessions() returns table (
  id uuid, company_id uuid, company_name text, title text, kind session_kind, description text,
  starts_at timestamptz, duration_min int, capacity int, registered int, is_registered boolean, is_organiser boolean
) language sql stable security definer set search_path = public as $$
  select s.id, s.company_id, co.name, s.title, s.kind, s.description, s.starts_at, s.duration_min, s.capacity,
    (select count(*)::int from session_registrations r where r.session_id = s.id),
    exists (select 1 from session_registrations r where r.session_id = s.id and r.candidate_id = my_candidate()),
    is_session_organiser(s.id)
  from sessions s left join companies co on co.id = s.company_id
  where s.starts_at + make_interval(mins => s.duration_min) > now() - interval '30 days'
  order by s.starts_at
$$;

create or replace function session_link(sid uuid) returns text
language sql stable security definer set search_path = public as $$
  select nullif(s.meeting_url, '') from sessions s
  where s.id = sid and (
    is_session_organiser(sid)
    or (exists (select 1 from session_registrations r where r.session_id = sid and r.candidate_id = my_candidate())
        and now() between s.starts_at - interval '15 minutes'
                      and s.starts_at + make_interval(mins => s.duration_min) + interval '30 minutes'))
$$;

create or replace function register_session(sid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare cid uuid := my_candidate(); s sessions;
begin
  if cid is null then raise exception 'Only students can register for sessions'; end if;
  select * into s from sessions where id = sid for update;
  if not found then raise exception 'This session no longer exists'; end if;
  if s.starts_at + make_interval(mins => s.duration_min) < now() then raise exception 'This session is over'; end if;
  if s.capacity is not null and (select count(*) from session_registrations where session_id = sid) >= s.capacity then
    raise exception 'This session is full';
  end if;
  insert into session_registrations (session_id, candidate_id) values (sid, cid) on conflict do nothing;
end $$;

create or replace function unregister_session(sid uuid) returns void
language sql security definer set search_path = public as $$
  delete from session_registrations where session_id = sid and candidate_id = my_candidate()
$$;

create or replace function session_registrants(sid uuid) returns table (candidate_id uuid, name text, school text, visible boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_session_organiser(sid) then raise exception 'Only the organiser can see who registered'; end if;
  return query
    select r.candidate_id,
      case when my_role() = 'admin' or is_visible(c.id) then trim(c.first_name || ' ' || c.last_name) end,
      case when my_role() = 'admin' or is_visible(c.id) then c.school end,
      is_visible(c.id)
    from session_registrations r join candidates c on c.id = r.candidate_id
    where r.session_id = sid order by r.created_at;
end $$;

-- Interviews ---------------------------------------------------------------------

-- A student's interview requests, with their booked slot and the free slots they can pick.
create or replace function student_interviews() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'companyId', r.company_id,
    'companyName', co.name,
    'requestedAt', r.created_at,
    'booked', (select jsonb_build_object('slotId', b.id, 'startsAt', b.starts_at, 'durationMin', b.duration_min, 'meetingUrl', b.meeting_url)
               from interview_slots b where b.company_id = r.company_id and b.candidate_id = r.candidate_id),
    'freeSlots', coalesce((select jsonb_agg(jsonb_build_object('id', f.id, 'startsAt', f.starts_at, 'durationMin', f.duration_min) order by f.starts_at)
               from interview_slots f where f.company_id = r.company_id and f.candidate_id is null and f.starts_at > now()), '[]'::jsonb)
  ) order by r.created_at desc), '[]'::jsonb)
  from interview_requests r join companies co on co.id = r.company_id
  where r.candidate_id = my_candidate()
$$;

create or replace function book_slot(slot uuid) returns void
language plpgsql security definer set search_path = public as $$
declare cid uuid := my_candidate(); s interview_slots;
begin
  if cid is null then raise exception 'Only students can book interview slots'; end if;
  select * into s from interview_slots where id = slot for update;
  if not found then raise exception 'This slot no longer exists'; end if;
  if not exists (select 1 from interview_requests where company_id = s.company_id and candidate_id = cid) then
    raise exception 'This company has not requested an interview with you';
  end if;
  if s.candidate_id is not null then raise exception 'This slot was just taken. Pick another one.'; end if;
  if s.starts_at <= now() then raise exception 'This slot has passed'; end if;
  -- One slot per company: moving to another slot frees the previous one.
  update interview_slots set candidate_id = null, booked_at = null where company_id = s.company_id and candidate_id = cid;
  update interview_slots set candidate_id = cid, booked_at = now() where id = slot;
end $$;

create or replace function cancel_slot_booking(slot uuid) returns void
language sql security definer set search_path = public as $$
  update interview_slots set candidate_id = null, booked_at = null
  where id = slot and candidate_id = my_candidate() and starts_at > now()
$$;

revoke execute on function is_session_organiser(uuid), list_sessions(), session_link(uuid), register_session(uuid),
  unregister_session(uuid), session_registrants(uuid), student_interviews(), book_slot(uuid), cancel_slot_booking(uuid) from public;
grant execute on function list_sessions() to anon, authenticated;
grant execute on function is_session_organiser(uuid), session_link(uuid), register_session(uuid), unregister_session(uuid),
  session_registrants(uuid), student_interviews(), book_slot(uuid), cancel_slot_booking(uuid) to authenticated;
