-- 020 — Interested students: which of the wanted skills each one has, not only how many. Safe to run again.

create or replace function matched_skills(cid uuid, wanted text[]) returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(w order by ord), '{}') from unnest(wanted) with ordinality as t(w, ord)
  where exists (
    select 1 from candidates c, unnest(c.functions || c.sectors || c.past_sectors || c.languages) h
    where c.id = cid and lower(h) = lower(w))
$$;
revoke execute on function matched_skills(uuid, text[]) from public, anon, authenticated;

drop function if exists opening_interested(uuid);
create function opening_interested(oid uuid) returns table (
  candidate_id uuid, name text, school text, programme text, graduation_year int, interested_at timestamptz,
  matched int, matched_skills text[]
) language plpgsql stable security definer set search_path = public as $$
begin
  if not is_opening_owner(oid) then raise exception 'Only the company can see who is interested'; end if;
  return query
    select c.id, trim(c.first_name || ' ' || c.last_name), c.school, c.programme, c.graduation_year, i.created_at,
      skill_match(c.id, o.skills), matched_skills(c.id, o.skills)
    from opening_interests i join candidates c on c.id = i.candidate_id join openings o on o.id = i.opening_id
    where i.opening_id = oid and is_visible(c.id)
    order by skill_match(c.id, o.skills) desc, i.created_at;
end $$;
revoke execute on function opening_interested(uuid) from public;
grant execute on function opening_interested(uuid) to authenticated;
