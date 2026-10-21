-- 025 — Nyota Premium: the advanced company insights (benchmark, matching profiles not opened yet, talent pool)
-- are only served to companies the club marks as premium. Admins always see them. Safe to run again.

alter table companies add column if not exists premium boolean not null default false;

create or replace function is_premium(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(my_role() = 'admin', false) or coalesce((select premium from companies where id = cid), false)
$$;

-- Same functions as before, now refused to non-premium companies.
create or replace function company_seen_candidates() returns setof uuid
language sql stable security definer set search_path = public as $$
  select e.candidate_id from activity_events e
  where e.kind = 'profile_view' and e.company_id = my_company() and my_role() = 'company' and is_premium(my_company())
  union
  select v.candidate_id from cv_views v
  where v.company_id = my_company() and my_role() = 'company' and is_premium(my_company())
$$;

create or replace function company_talent_pool() returns table (
  school text, programme text, graduation_year int, years_experience int, past_sectors text[], functions text[],
  sectors text[], countries text, worked_countries text, languages text[], position_type position_type
) language plpgsql stable security definer set search_path = public as $$
begin
  if my_role() not in ('company', 'admin') then raise exception 'Only companies can see this'; end if;
  if my_role() = 'company' and not is_premium(my_company()) then raise exception 'premium'; end if;
  return query
    select c.school, c.programme, c.graduation_year, c.years_experience, c.past_sectors, c.functions, c.sectors,
      c.countries, c.worked_countries, c.languages, c.position_type
    from candidates c where is_visible(c.id);
end $$;

-- company_benchmark: add the premium check in front of the 024 version.
do $$
declare src text;
begin
  select pg_get_functiondef('company_benchmark(uuid)'::regprocedure) into src;
  if position('is_premium(cid)' in src) = 0 then
    src := replace(src, 'select sector into my_sector from companies where id = cid;',
      'if not is_premium(cid) then raise exception ''premium''; end if;' || chr(10) || '  select sector into my_sector from companies where id = cid;');
    execute src;
  end if;
end $$;

revoke execute on function is_premium(uuid) from public, anon;
grant execute on function is_premium(uuid) to authenticated;
