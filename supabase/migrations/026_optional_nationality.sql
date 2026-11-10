-- 026 — Optional nationality (club decision, November 2026). Never the passport or immigration status.
-- Like gender: optional, stored apart from the profile in candidate_private (companies can never read it),
-- never used in company search, and only shown to admins as anonymous counts. Safe to run again.

alter table candidate_private add column if not exists nationalities text check (char_length(nationalities) <= 200);

drop function if exists admin_talent_pool();
create function admin_talent_pool() returns table (
  school text, programme text, graduation_year int, gender text, years_experience int,
  past_sectors text[], functions text[], sectors text[], countries text, worked_countries text, languages text[],
  position_type position_type, complete boolean, consented boolean, visible boolean, updated_at timestamptz,
  nationalities text
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
      c.updated_at,
      coalesce(p.nationalities, '')
    from candidates c left join candidate_private p on p.candidate_id = c.id
    where c.user_id is not null or c.first_name <> '';
end $$;

revoke execute on function admin_talent_pool() from public, anon;
grant execute on function admin_talent_pool() to authenticated;
