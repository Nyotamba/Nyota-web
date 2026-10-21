-- 019 — Company pages for students: who is at the fair, what they do, their sessions, whether they run
-- interviews and when, and how many openings. The company (or an admin) writes its own presentation.
-- Safe to run again.

alter table companies add column if not exists about text not null default '' check (char_length(about) <= 1200);
alter table companies add column if not exists website text not null default '' check (char_length(website) <= 300);
alter table companies add column if not exists sector text not null default '' check (char_length(sector) <= 80);
alter table companies add column if not exists locations text not null default '' check (char_length(locations) <= 200);

-- The company edits its own page; admins edit any.
create or replace function save_company_page(cid uuid, p_about text, p_website text, p_sector text, p_locations text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (coalesce(my_role() = 'admin', false) or (my_role() = 'company' and my_company() = cid)) then
    raise exception 'Only this company or the club can edit its page';
  end if;
  update companies set about = trim(p_about), website = trim(p_website), sector = trim(p_sector), locations = trim(p_locations)
  where id = cid;
end $$;

-- Every company of the fair with its programme. Interview times are shown as a summary only
-- (days and hours, free slots), never who booked them.
create or replace function list_fair_companies() returns table (
  id uuid, name text, logo_url text, about text, website text, sector text, locations text,
  sessions jsonb, interview_slots int, free_slots int, interviews_from timestamptz, interviews_to timestamptz,
  interview_days jsonb, openings int
) language sql stable security definer set search_path = public as $$
  select co.id, co.name, co.logo_url, co.about, co.website, co.sector, co.locations,
    coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'title', s.title, 'kind', s.kind, 'startsAt', s.starts_at,
                'durationMin', s.duration_min) order by s.starts_at)
              from sessions s where s.company_id = co.id
                and s.starts_at + make_interval(mins => s.duration_min) > now() - interval '30 days'), '[]'::jsonb),
    (select count(*)::int from interview_slots sl where sl.company_id = co.id and sl.starts_at > now()),
    (select count(*)::int from interview_slots sl where sl.company_id = co.id and sl.starts_at > now() and sl.candidate_id is null),
    (select min(sl.starts_at) from interview_slots sl where sl.company_id = co.id and sl.starts_at > now()),
    (select max(sl.starts_at + make_interval(mins => sl.duration_min)) from interview_slots sl where sl.company_id = co.id and sl.starts_at > now()),
    coalesce((select jsonb_agg(d order by d) from (
      select distinct jsonb_build_object(
        'day', to_char(sl.starts_at at time zone 'Europe/Madrid', 'YYYY-MM-DD'),
        'from', min(sl.starts_at) over (partition by (sl.starts_at at time zone 'Europe/Madrid')::date),
        'to', max(sl.starts_at + make_interval(mins => sl.duration_min)) over (partition by (sl.starts_at at time zone 'Europe/Madrid')::date)) d
      from interview_slots sl where sl.company_id = co.id and sl.starts_at > now()) x), '[]'::jsonb),
    (select count(*)::int from openings o where o.company_id = co.id and o.published)
  from companies co
  where exists (select 1 from invitations i where i.company_id = co.id)
     or exists (select 1 from sessions s where s.company_id = co.id)
     or exists (select 1 from openings o where o.company_id = co.id and o.published)
  order by co.name
$$;

revoke execute on function save_company_page(uuid, text, text, text, text), list_fair_companies() from public;
grant execute on function save_company_page(uuid, text, text, text, text), list_fair_companies() to authenticated;
