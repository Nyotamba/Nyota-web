-- 021 — Company profile (roles and countries they hire for, size, their own logo) and the company dashboard.
--  * Companies upload their own logo (only under logos/company/<their id>-…).
--  * company_talent_pool(): anonymous rows of the profiles companies can see (verified + shared), no gender.
--  * company_dashboard(): the company's own figures. Safe to run again.

alter table companies add column if not exists hiring_for text[] not null default '{}';
alter table companies add column if not exists hiring_countries text not null default '' check (char_length(hiring_countries) <= 300);
alter table companies add column if not exists size text not null default '' check (char_length(size) <= 40);

drop function if exists save_company_page(uuid, text, text, text, text);
create or replace function save_company_page(cid uuid, p_about text, p_website text, p_sector text, p_locations text,
  p_hiring_for text[] default '{}', p_hiring_countries text default '', p_size text default '') returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (coalesce(my_role() = 'admin', false) or (my_role() = 'company' and my_company() = cid)) then
    raise exception 'Only this company or the club can edit its page';
  end if;
  update companies set about = trim(p_about), website = trim(p_website), sector = trim(p_sector), locations = trim(p_locations),
    hiring_for = coalesce(p_hiring_for, '{}'), hiring_countries = trim(coalesce(p_hiring_countries, '')), size = trim(coalesce(p_size, ''))
  where id = cid;
end $$;

-- Logos: a company may upload its own file.
drop policy if exists "company uploads own logo" on storage.objects;
create policy "company uploads own logo" on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and public.my_role() = 'company' and name like 'company/' || public.my_company()::text || '-%');
drop policy if exists "company replaces own logo" on storage.objects;
create policy "company replaces own logo" on storage.objects for update to authenticated
  using (bucket_id = 'logos' and public.my_role() = 'company' and name like 'company/' || public.my_company()::text || '-%');

create or replace function set_company_logo(cid uuid, url text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (coalesce(my_role() = 'admin', false) or (my_role() = 'company' and my_company() = cid)) then
    raise exception 'Only this company or the club can change its logo';
  end if;
  if url !~ ('/storage/v1/object/public/logos/company/' || cid::text || '-') then raise exception 'Upload the logo through Nyota'; end if;
  update companies set logo_url = url where id = cid;
end $$;

drop function if exists list_fair_companies();
create function list_fair_companies() returns table (
  id uuid, name text, logo_url text, about text, website text, sector text, locations text,
  hiring_for text[], hiring_countries text, size text,
  sessions jsonb, interview_slots int, free_slots int, interview_days jsonb, openings int
) language sql stable security definer set search_path = public as $$
  select co.id, co.name, co.logo_url, co.about, co.website, co.sector, co.locations, co.hiring_for, co.hiring_countries, co.size,
    coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'title', s.title, 'kind', s.kind, 'startsAt', s.starts_at,
                'durationMin', s.duration_min) order by s.starts_at)
              from sessions s where s.company_id = co.id
                and s.starts_at + make_interval(mins => s.duration_min) > now() - interval '30 days'), '[]'::jsonb),
    (select count(*)::int from interview_slots sl where sl.company_id = co.id and sl.starts_at > now()),
    (select count(*)::int from interview_slots sl where sl.company_id = co.id and sl.starts_at > now() and sl.candidate_id is null),
    coalesce((select jsonb_agg(jsonb_build_object('day', d.day, 'from', d.f, 'to', d.t) order by d.day) from (
      select to_char(sl.starts_at at time zone 'Europe/Madrid', 'YYYY-MM-DD') as day, min(sl.starts_at) as f,
        max(sl.starts_at + make_interval(mins => sl.duration_min)) as t
      from interview_slots sl where sl.company_id = co.id and sl.starts_at > now() group by 1) d), '[]'::jsonb),
    (select count(*)::int from openings o where o.company_id = co.id and o.published)
  from companies co
  where exists (select 1 from invitations i where i.company_id = co.id)
     or exists (select 1 from sessions s where s.company_id = co.id)
     or exists (select 1 from openings o where o.company_id = co.id and o.published)
  order by co.name
$$;

create or replace function company_talent_pool() returns table (
  school text, programme text, graduation_year int, years_experience int, past_sectors text[], functions text[],
  sectors text[], countries text, worked_countries text, languages text[], position_type position_type
) language plpgsql stable security definer set search_path = public as $$
begin
  if my_role() not in ('company', 'admin') then raise exception 'Only companies can see this'; end if;
  return query
    select c.school, c.programme, c.graduation_year, c.years_experience, c.past_sectors, c.functions, c.sectors,
      c.countries, c.worked_countries, c.languages, c.position_type
    from candidates c where is_visible(c.id);
end $$;

create or replace function company_dashboard(cid uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not (coalesce(my_role() = 'admin', false) or (my_role() = 'company' and my_company() = cid)) then
    raise exception 'Only this company can see its dashboard';
  end if;
  return jsonb_build_object(
    'visibleCandidates', (select count(*) from candidates c where is_visible(c.id)),
    'shortlisted', (select count(*) from shortlists s where s.company_id = cid and is_visible(s.candidate_id)),
    'cvViews', (select count(*) from cv_views v where v.company_id = cid),
    'profilesOpened', (select count(distinct v.candidate_id) from cv_views v where v.company_id = cid),
    'interviewRequests', (select count(*) from interview_requests r where r.company_id = cid),
    'slots', (select count(*) from interview_slots sl where sl.company_id = cid),
    'slotsBooked', (select count(*) from interview_slots sl where sl.company_id = cid and sl.candidate_id is not null),
    'openings', (select count(*) from openings o where o.company_id = cid and o.published),
    'interested', (select count(*) from opening_interests i join openings o on o.id = i.opening_id
                   where o.company_id = cid and is_visible(i.candidate_id)),
    'interestedPeople', (select count(distinct i.candidate_id) from opening_interests i join openings o on o.id = i.opening_id
                   where o.company_id = cid and is_visible(i.candidate_id)),
    'sessions', (select count(*) from sessions s where s.company_id = cid),
    'registered', (select count(*) from session_registrations r join sessions s on s.id = r.session_id where s.company_id = cid),
    'attended', (select count(*) from session_registrations r join sessions s on s.id = r.session_id
                 where s.company_id = cid and r.attended_at is not null)
  );
end $$;

revoke execute on function save_company_page(uuid, text, text, text, text, text[], text, text), set_company_logo(uuid, text),
  list_fair_companies(), company_talent_pool(), company_dashboard(uuid) from public;
grant execute on function save_company_page(uuid, text, text, text, text, text[], text, text), set_company_logo(uuid, text),
  list_fair_companies(), company_talent_pool(), company_dashboard(uuid) to authenticated;
