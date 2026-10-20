-- 009 — Optional gender (admin statistics only) and the anonymous talent pool for the dashboard.
-- Run once in Supabase → SQL Editor. Safe to run again.
--
-- Gender is optional ("Prefer not to say" allowed), stored apart from the profile so companies can never read it,
-- and only ever shown to admins as counts. Never add nationality, origin, ethnicity, religion or health.

create table if not exists candidate_private (
  candidate_id  uuid primary key references candidates (id) on delete cascade,
  gender        text check (gender in ('Woman', 'Man', 'Non-binary', 'Prefer not to say')),
  updated_at    timestamptz not null default now()
);
alter table candidate_private enable row level security;
revoke all on candidate_private from anon, authenticated;
grant select, insert, update on candidate_private to authenticated;

drop policy if exists "student manages own private data" on candidate_private;
create policy "student manages own private data" on candidate_private for all to authenticated
  using (candidate_id = my_candidate()) with check (candidate_id = my_candidate());
-- No policy for companies or admins: admins only see aggregates through admin_talent_pool().

-- One anonymous row per student (no name, no e-mail, no CV), for the dashboard charts and filters.
create or replace function admin_talent_pool() returns table (
  school text, programme text, graduation_year int, gender text, years_experience int,
  past_sectors text[], functions text[], sectors text[], countries text, worked_countries text, languages text[],
  position_type position_type, complete boolean, consented boolean, visible boolean, updated_at timestamptz
) language plpgsql stable security definer set search_path = public as $$
begin
  if my_role() is distinct from 'admin' then raise exception 'Only club admins can see the talent pool'; end if;
  return query
    select c.school, c.programme, c.graduation_year, coalesce(p.gender, 'Not answered'), c.years_experience,
      c.past_sectors, c.functions, c.sectors, c.countries, c.worked_countries, c.languages, c.position_type,
      (c.first_name <> '' and c.last_name <> '' and c.graduation_year is not null and cardinality(c.functions) > 0
        and cardinality(c.sectors) > 0 and cardinality(c.languages) > 0 and c.available_from is not null and c.cv_path is not null),
      exists (select 1 from consents k where k.candidate_id = c.id and k.withdrawn_at is null),
      is_visible(c.id),
      c.updated_at
    from candidates c left join candidate_private p on p.candidate_id = c.id
    where c.user_id is not null or c.first_name <> '';
end $$;

revoke execute on function admin_talent_pool() from public, anon;
grant execute on function admin_talent_pool() to authenticated;
