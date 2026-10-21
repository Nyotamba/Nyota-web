-- 018 — Openings: wanted skills, and interest saved before verification.
--  * skills: what the company wants to see (roles, sectors, languages from the lists, or free text).
--    A student "matches" a skill when it is in their roles, sectors, past sectors or languages.
--  * A student can say "I'm interested" at any time; the company only sees it once the profile is
--    verified and shared (is_visible), exactly like the candidate list. Safe to run again.

alter table openings add column if not exists skills text[] not null default '{}';
grant insert (skills) on openings to authenticated;
grant update (skills) on openings to authenticated;

create or replace function skill_match(cid uuid, wanted text[]) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from unnest(wanted) w
  where exists (
    select 1 from candidates c, unnest(c.functions || c.sectors || c.past_sectors || c.languages) h
    where c.id = cid and lower(h) = lower(w))
$$;
revoke execute on function skill_match(uuid, text[]) from public, anon, authenticated;

drop function if exists list_openings();
create function list_openings() returns table (
  id uuid, company_id uuid, company_name text, title text, contract text, function text, location text,
  description text, apply_url text, apply_by date, published boolean, created_at timestamptz, skills text[],
  interested int, is_interested boolean, is_mine boolean, my_match int
) language sql stable security definer set search_path = public as $$
  select o.id, o.company_id, co.name, o.title, o.contract, o.function, o.location, o.description, o.apply_url,
    o.apply_by, o.published, o.created_at, o.skills,
    case when is_opening_owner(o.id) then (
      select count(*)::int from opening_interests i where i.opening_id = o.id and is_visible(i.candidate_id)) end,
    exists (select 1 from opening_interests i where i.opening_id = o.id and i.candidate_id = my_candidate()),
    is_opening_owner(o.id),
    case when my_candidate() is not null then skill_match(my_candidate(), o.skills) end
  from openings o join companies co on co.id = o.company_id
  where is_opening_owner(o.id) or (my_role() = 'student' and o.published)
  order by o.created_at desc
$$;

create or replace function set_opening_interest(oid uuid, interested boolean) returns void
language plpgsql security definer set search_path = public as $$
declare cid uuid := my_candidate();
begin
  if cid is null then raise exception 'Only students can show interest'; end if;
  if not interested then
    delete from opening_interests where opening_id = oid and candidate_id = cid;
    return;
  end if;
  if not exists (select 1 from openings where id = oid and published) then raise exception 'This opening is closed'; end if;
  insert into opening_interests (opening_id, candidate_id) values (oid, cid) on conflict do nothing;
end $$;

drop function if exists opening_interested(uuid);
create function opening_interested(oid uuid) returns table (
  candidate_id uuid, name text, school text, programme text, graduation_year int, interested_at timestamptz, matched int
) language plpgsql stable security definer set search_path = public as $$
begin
  if not is_opening_owner(oid) then raise exception 'Only the company can see who is interested'; end if;
  return query
    select c.id, trim(c.first_name || ' ' || c.last_name), c.school, c.programme, c.graduation_year, i.created_at,
      skill_match(c.id, o.skills)
    from opening_interests i join candidates c on c.id = i.candidate_id join openings o on o.id = i.opening_id
    where i.opening_id = oid and is_visible(c.id)
    order by skill_match(c.id, o.skills) desc, i.created_at;
end $$;

revoke execute on function list_openings(), set_opening_interest(uuid, boolean), opening_interested(uuid) from public;
grant execute on function list_openings(), set_opening_interest(uuid, boolean), opening_interested(uuid) to authenticated;
