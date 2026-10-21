-- 015 — Attendance through the waiting room only (no code): a student is counted present when they come back
-- to the Nyota room after staying at least half of the session. Time = return minus arrival. Safe to run again.

create or replace function leave_session(sid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  cid uuid := my_candidate();
  s sessions;
begin
  if cid is null then return; end if;
  select * into s from sessions where id = sid;
  if not found then return; end if;
  update session_registrations set
    seconds_present = greatest(seconds_present, coalesce(extract(epoch from now() - joined_at), 0)::int),
    last_seen_at = now(),
    left_at = now(),
    -- Present: came in through the room and came back after at least half of the session.
    attended_at = case
      when attended_at is null and joined_at is not null
           and now() - joined_at >= make_interval(mins => greatest(1, s.duration_min / 2)) then now()
      else attended_at end
  where session_id = sid and candidate_id = cid;
end $$;

revoke execute on function leave_session(uuid) from public;
grant execute on function leave_session(uuid) to authenticated;
