-- 014 — Session room: students join through a Nyota page that stays open during the session and records
-- when they arrive, a heartbeat every minute, and when they leave. Gives time spent per student, for free.
-- (Free Zoom / Meet / Teams cannot send people back to a website, so the Nyota tab is the "gate".)
-- Safe to run again.

alter table session_registrations add column if not exists last_seen_at timestamptz;
alter table session_registrations add column if not exists left_at timestamptz;
alter table session_registrations add column if not exists seconds_present int not null default 0;

-- Called by the open session room every ~60 s. Counts at most 90 s per beat, only inside the join window.
create or replace function session_heartbeat(sid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  cid uuid := my_candidate();
  s sessions;
begin
  if cid is null then return; end if;
  select * into s from sessions where id = sid;
  if not found or now() < s.starts_at - interval '15 minutes'
     or now() > s.starts_at + make_interval(mins => s.duration_min) + interval '30 minutes' then
    return;
  end if;
  update session_registrations set
    joined_at = coalesce(joined_at, now()),
    seconds_present = seconds_present + case
      when last_seen_at is null or left_at > last_seen_at then 0
      else least(90, greatest(0, extract(epoch from now() - last_seen_at)))::int end,
    last_seen_at = now(),
    left_at = null
  where session_id = sid and candidate_id = cid;
end $$;

-- "I'm leaving" (or closing the room).
create or replace function leave_session(sid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare cid uuid := my_candidate();
begin
  if cid is null then return; end if;
  update session_registrations set
    seconds_present = seconds_present + case
      when last_seen_at is null or left_at > last_seen_at then 0
      else least(90, greatest(0, extract(epoch from now() - last_seen_at)))::int end,
    last_seen_at = now(),
    left_at = now()
  where session_id = sid and candidate_id = cid;
end $$;

drop function if exists session_registrants(uuid);
create function session_registrants(sid uuid) returns table (
  candidate_id uuid, name text, school text, programme text, graduation_year int, linkedin_url text,
  visible boolean, registered_at timestamptz, joined_at timestamptz, attended_at timestamptz,
  left_at timestamptz, last_seen_at timestamptz, seconds_present int
) language plpgsql stable security definer set search_path = public as $$
begin
  if not is_session_organiser(sid) then raise exception 'Only the organiser can see who registered'; end if;
  return query
    select r.candidate_id, trim(c.first_name || ' ' || c.last_name), c.school, c.programme, c.graduation_year,
      nullif(c.linkedin_url, ''), is_visible(c.id), r.created_at, r.joined_at, r.attended_at,
      r.left_at, r.last_seen_at, r.seconds_present
    from session_registrations r join candidates c on c.id = r.candidate_id
    where r.session_id = sid order by r.created_at;
end $$;

revoke execute on function session_heartbeat(uuid), leave_session(uuid), session_registrants(uuid) from public;
grant execute on function session_heartbeat(uuid), leave_session(uuid), session_registrants(uuid) to authenticated;
