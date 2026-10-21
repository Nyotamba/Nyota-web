-- 016 — Automatic attendance: no click at the end. The Nyota room stays open in a tab while the call runs in another;
-- it beats every minute and the time between beats is counted (a phone that froze the tab while in the video app
-- is counted when it comes back). Closing the room stops the count. Present = counted at least half of the session.
-- Safe to run again.

create or replace function _count_presence(sid uuid, cid uuid, leaving boolean) returns void
language plpgsql security definer set search_path = public as $$
declare
  s sessions;
  win_start timestamptz;
  win_end timestamptz;
  t timestamptz;
begin
  select * into s from sessions where id = sid;
  if not found then return; end if;
  win_start := s.starts_at - interval '15 minutes';
  win_end := s.starts_at + make_interval(mins => s.duration_min) + interval '30 minutes';
  t := least(now(), win_end);
  if now() < win_start then return; end if;
  update session_registrations r set
    joined_at = coalesce(r.joined_at, t),
    seconds_present = r.seconds_present + case
      when r.last_seen_at is null or (r.left_at is not null and r.left_at >= r.last_seen_at) then 0
      else greatest(0, extract(epoch from t - greatest(r.last_seen_at, win_start)))::int end,
    last_seen_at = t,
    left_at = case when leaving then t end
  where r.session_id = sid and r.candidate_id = cid;
  update session_registrations r set attended_at = t
  where r.session_id = sid and r.candidate_id = cid and r.attended_at is null
    and r.seconds_present >= greatest(60, s.duration_min * 30);
end $$;
revoke execute on function _count_presence(uuid, uuid, boolean) from public, anon, authenticated;

create or replace function session_heartbeat(sid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare cid uuid := my_candidate();
begin
  if cid is not null then perform _count_presence(sid, cid, false); end if;
end $$;

create or replace function leave_session(sid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare cid uuid := my_candidate();
begin
  if cid is not null then perform _count_presence(sid, cid, true); end if;
end $$;

revoke execute on function session_heartbeat(uuid), leave_session(uuid) from public;
grant execute on function session_heartbeat(uuid), leave_session(uuid) to authenticated;
