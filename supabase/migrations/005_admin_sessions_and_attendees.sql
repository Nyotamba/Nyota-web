-- 005 — Only club admins create sessions; companies see the full list of who registered
-- (students are told at registration), and who clicked "Join".
-- Run once in Supabase → SQL Editor. Safe to run again.

-- Companies can no longer create, edit or delete sessions (they still read them).
drop policy if exists "company manages own sessions" on sessions;

-- When a registered student clicks "Join".
alter table session_registrations add column if not exists joined_at timestamptz;

create or replace function mark_session_joined(sid uuid) returns void
language sql security definer set search_path = public as $$
  update session_registrations set joined_at = coalesce(joined_at, now())
  where session_id = sid and candidate_id = my_candidate()
$$;

-- Organisers (the company the session is for, and admins) see every registrant.
drop function if exists session_registrants(uuid);
create function session_registrants(sid uuid) returns table (
  candidate_id uuid, name text, school text, programme text, graduation_year int, linkedin_url text,
  visible boolean, registered_at timestamptz, joined_at timestamptz
) language plpgsql stable security definer set search_path = public as $$
begin
  if not is_session_organiser(sid) then raise exception 'Only the organiser can see who registered'; end if;
  return query
    select r.candidate_id, trim(c.first_name || ' ' || c.last_name), c.school, c.programme, c.graduation_year,
      nullif(c.linkedin_url, ''), is_visible(c.id), r.created_at, r.joined_at
    from session_registrations r join candidates c on c.id = r.candidate_id
    where r.session_id = sid order by r.created_at;
end $$;

revoke execute on function mark_session_joined(uuid), session_registrants(uuid) from public;
grant execute on function mark_session_joined(uuid), session_registrants(uuid) to authenticated;
