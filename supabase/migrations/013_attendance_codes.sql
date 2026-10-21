-- 013 — Attendance codes: proof that a registered student actually attended a session (free, any video tool).
-- The organiser shows a 4-digit code during the session; registered students enter it on Nyota.
-- The code only works from 15 min before the start to 30 min after the end, with 5 attempts per student.
-- Safe to run again.

alter table sessions add column if not exists attendance_code text;
update sessions set attendance_code = lpad((floor(random() * 10000))::int::text, 4, '0') where attendance_code is null;
alter table sessions alter column attendance_code set default lpad((floor(random() * 10000))::int::text, 4, '0');

alter table session_registrations add column if not exists attended_at timestamptz;
alter table session_registrations add column if not exists checkin_attempts int not null default 0;

-- The code is never readable from the table (same as the video link).
revoke select (attendance_code) on sessions from authenticated;

-- Organiser (company of the session, or an admin) reads the code.
create or replace function session_attendance_code(sid uuid) returns text
language sql stable security definer set search_path = public as $$
  select s.attendance_code from sessions s where s.id = sid and is_session_organiser(sid)
$$;

-- A registered student checks in with the code shown during the session.
-- Returns 'present', or 'wrong:<attempts left>' (no exception, so the attempt counter is kept).
drop function if exists check_in_session(uuid, text);
create function check_in_session(sid uuid, code text) returns text
language plpgsql security definer set search_path = public as $$
declare
  cid uuid := my_candidate();
  s sessions;
  r session_registrations;
begin
  if cid is null then raise exception 'Only students can check in'; end if;
  select * into s from sessions where id = sid;
  if not found then raise exception 'This session no longer exists'; end if;
  select * into r from session_registrations where session_id = sid and candidate_id = cid for update;
  if not found then raise exception 'Register for this session first'; end if;
  if r.attended_at is not null then return 'present'; end if;
  if now() < s.starts_at - interval '15 minutes'
     or now() > s.starts_at + make_interval(mins => s.duration_min) + interval '30 minutes' then
    raise exception 'Check-in is only open during the session';
  end if;
  if r.checkin_attempts >= 5 then raise exception 'Too many wrong codes. Ask the organiser to mark you present.'; end if;
  if trim(code) = s.attendance_code then
    update session_registrations set attended_at = now() where session_id = sid and candidate_id = cid;
    return 'present';
  end if;
  update session_registrations set checkin_attempts = checkin_attempts + 1 where session_id = sid and candidate_id = cid;
  return 'wrong:' || (4 - r.checkin_attempts);
end $$;

-- Organisers can mark someone present by hand (e.g. too many wrong codes, connection issue).
create or replace function mark_attended(sid uuid, cid uuid, present boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_session_organiser(sid) then raise exception 'Only the organiser can change attendance'; end if;
  update session_registrations set attended_at = case when present then coalesce(attended_at, now()) end
  where session_id = sid and candidate_id = cid;
end $$;

-- Programme and registrant lists now include attendance.
drop function if exists list_sessions();
create function list_sessions() returns table (
  id uuid, company_id uuid, company_name text, title text, kind session_kind, description text,
  starts_at timestamptz, duration_min int, capacity int, registered int, attended int,
  is_registered boolean, has_attended boolean, is_organiser boolean
) language sql stable security definer set search_path = public as $$
  select s.id, s.company_id, co.name, s.title, s.kind, s.description, s.starts_at, s.duration_min, s.capacity,
    (select count(*)::int from session_registrations r where r.session_id = s.id),
    (select count(*)::int from session_registrations r where r.session_id = s.id and r.attended_at is not null),
    exists (select 1 from session_registrations r where r.session_id = s.id and r.candidate_id = my_candidate()),
    exists (select 1 from session_registrations r where r.session_id = s.id and r.candidate_id = my_candidate() and r.attended_at is not null),
    is_session_organiser(s.id)
  from sessions s left join companies co on co.id = s.company_id
  where s.starts_at + make_interval(mins => s.duration_min) > now() - interval '30 days'
  order by s.starts_at
$$;

drop function if exists session_registrants(uuid);
create function session_registrants(sid uuid) returns table (
  candidate_id uuid, name text, school text, programme text, graduation_year int, linkedin_url text,
  visible boolean, registered_at timestamptz, joined_at timestamptz, attended_at timestamptz
) language plpgsql stable security definer set search_path = public as $$
begin
  if not is_session_organiser(sid) then raise exception 'Only the organiser can see who registered'; end if;
  return query
    select r.candidate_id, trim(c.first_name || ' ' || c.last_name), c.school, c.programme, c.graduation_year,
      nullif(c.linkedin_url, ''), is_visible(c.id), r.created_at, r.joined_at, r.attended_at
    from session_registrations r join candidates c on c.id = r.candidate_id
    where r.session_id = sid order by r.created_at;
end $$;

revoke execute on function session_attendance_code(uuid), check_in_session(uuid, text), mark_attended(uuid, uuid, boolean),
  list_sessions(), session_registrants(uuid) from public;
grant execute on function list_sessions() to anon, authenticated;
grant execute on function session_attendance_code(uuid), check_in_session(uuid, text), mark_attended(uuid, uuid, boolean),
  session_registrants(uuid) to authenticated;
