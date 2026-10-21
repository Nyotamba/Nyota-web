-- 024 — Insights v2: what the club can act on, plus insights for companies and students.
--  * hiring_outcomes: after the fair, a company ticks "offer made" / "hired" for a candidate (the number sponsors ask for).
--  * admin_candidate_reach(): per candidate, how much attention they got (counts only, never which company).
--  * admin_company_activity(): per company, what it did (to follow up inactive companies).
--  * company_benchmark(): a company's figures against the average company and its sector.
--  * company_seen_candidates(): the profiles a company already opened (to suggest the ones it has not).
--  * my_profile_stats(): a student's own views (numbers only). Safe to run again.

create table if not exists hiring_outcomes (
  company_id   uuid not null references companies (id) on delete cascade,
  candidate_id uuid not null references candidates (id) on delete cascade,
  status       text not null check (status in ('offer', 'hired')),
  updated_at   timestamptz not null default now(),
  primary key (company_id, candidate_id)
);
alter table hiring_outcomes enable row level security;
revoke all on hiring_outcomes from anon, authenticated;
grant select, insert, update, delete on hiring_outcomes to authenticated;
drop policy if exists "company manages own outcomes" on hiring_outcomes;
create policy "company manages own outcomes" on hiring_outcomes for all to authenticated
  using (my_role() = 'company' and company_id = my_company())
  with check (my_role() = 'company' and company_id = my_company() and is_visible(candidate_id));
drop policy if exists "admin reads outcomes" on hiring_outcomes;
create policy "admin reads outcomes" on hiring_outcomes for select to authenticated using (my_role() = 'admin');

create or replace function admin_candidate_reach() returns table (
  candidate_id uuid, profile_views int, cv_views int, companies int, shortlists int, requests int, interests int, outcome text
) language plpgsql stable security definer set search_path = public as $$
begin
  if my_role() is distinct from 'admin' then raise exception 'Only club admins can see this'; end if;
  return query
    select c.id,
      (select count(*)::int from activity_events e where e.kind = 'profile_view' and e.candidate_id = c.id),
      (select count(*)::int from cv_views v where v.candidate_id = c.id),
      (select count(distinct x.co)::int from (
         select e.company_id co from activity_events e where e.kind = 'profile_view' and e.candidate_id = c.id
         union select v.company_id from cv_views v where v.candidate_id = c.id) x),
      (select count(*)::int from shortlists s where s.candidate_id = c.id),
      (select count(*)::int from interview_requests r where r.candidate_id = c.id),
      (select count(*)::int from opening_interests i where i.candidate_id = c.id),
      (select max(h.status) from hiring_outcomes h where h.candidate_id = c.id)
    from candidates c;
end $$;

create or replace function admin_company_activity() returns table (
  company_id uuid, members int, signed_in int, profile_views int, cv_views int, shortlists int, requests int,
  openings int, slots int, sessions int, interested int, offers int, hires int, last_activity timestamptz
) language plpgsql stable security definer set search_path = public as $$
begin
  if my_role() is distinct from 'admin' then raise exception 'Only club admins can see this'; end if;
  return query
    select co.id,
      (select count(*)::int from invitations i where i.company_id = co.id),
      (select count(*)::int from invitations i where i.company_id = co.id and i.status = 'Accepted'),
      (select count(*)::int from activity_events e where e.kind = 'profile_view' and e.company_id = co.id),
      (select count(*)::int from cv_views v where v.company_id = co.id),
      (select count(*)::int from shortlists s where s.company_id = co.id),
      (select count(*)::int from interview_requests r where r.company_id = co.id),
      (select count(*)::int from openings o where o.company_id = co.id and o.published),
      (select count(*)::int from interview_slots sl where sl.company_id = co.id),
      (select count(*)::int from sessions s where s.company_id = co.id),
      (select count(*)::int from opening_interests i join openings o on o.id = i.opening_id where o.company_id = co.id),
      (select count(*)::int from hiring_outcomes h where h.company_id = co.id and h.status = 'offer'),
      (select count(*)::int from hiring_outcomes h where h.company_id = co.id and h.status = 'hired'),
      greatest(
        (select max(e.at) from activity_events e where e.company_id = co.id and e.kind <> 'company_click'),
        (select max(v.viewed_at) from cv_views v where v.company_id = co.id),
        (select max(s.created_at) from shortlists s where s.company_id = co.id),
        (select max(r.created_at) from interview_requests r where r.company_id = co.id),
        (select max(o.created_at) from openings o where o.company_id = co.id))
    from companies co;
end $$;

-- The company's own figures next to the average company and the average company of its sector.
create or replace function company_benchmark(cid uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare my_sector text;
begin
  if not (coalesce(my_role() = 'admin', false) or (my_role() = 'company' and my_company() = cid)) then
    raise exception 'Only this company can see its benchmark';
  end if;
  select sector into my_sector from companies where id = cid;
  return (
    with m as (
      select co.id, co.sector,
        (select count(*) from activity_events e where e.kind = 'company_click' and e.company_id = co.id)::numeric clicks,
        (select count(*) from opening_interests i join openings o on o.id = i.opening_id where o.company_id = co.id)::numeric interests,
        greatest(1, (select count(*) from openings o where o.company_id = co.id and o.published))::numeric openings,
        (select count(*) from session_registrations r join sessions s on s.id = r.session_id where s.company_id = co.id)::numeric registrations,
        (select count(*) from activity_events e where e.kind = 'profile_view' and e.company_id = co.id)::numeric views
      from companies co
      where exists (select 1 from invitations i where i.company_id = co.id and i.status = 'Accepted')
    )
    select jsonb_build_object(
      'me', (select jsonb_build_object('clicks', clicks, 'interestsPerOpening', round(interests / openings, 1),
               'registrations', registrations, 'views', views) from m where id = cid),
      'all', (select jsonb_build_object('clicks', round(avg(clicks), 1), 'interestsPerOpening', round(avg(interests / openings), 1),
               'registrations', round(avg(registrations), 1), 'views', round(avg(views), 1), 'companies', count(*)) from m),
      'sector', (select jsonb_build_object('name', my_sector, 'clicks', round(avg(clicks), 1), 'interestsPerOpening', round(avg(interests / openings), 1),
               'registrations', round(avg(registrations), 1), 'views', round(avg(views), 1), 'companies', count(*))
               from m where coalesce(my_sector, '') <> '' and m.sector = my_sector)
    ));
end $$;

create or replace function company_seen_candidates() returns setof uuid
language sql stable security definer set search_path = public as $$
  select e.candidate_id from activity_events e where e.kind = 'profile_view' and e.company_id = my_company() and my_role() = 'company'
  union select v.candidate_id from cv_views v where v.company_id = my_company() and my_role() = 'company'
$$;

create or replace function my_profile_stats() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'views30', (select count(*) from activity_events e where e.kind = 'profile_view' and e.candidate_id = my_candidate() and e.at > now() - interval '30 days'),
    'views', (select count(*) from activity_events e where e.kind = 'profile_view' and e.candidate_id = my_candidate()),
    'cvViews', (select count(*) from cv_views v where v.candidate_id = my_candidate()),
    'companies', (select count(distinct x.co) from (
        select e.company_id co from activity_events e where e.kind = 'profile_view' and e.candidate_id = my_candidate()
        union select v.company_id from cv_views v where v.candidate_id = my_candidate()) x))
  where my_candidate() is not null
$$;

revoke execute on function admin_candidate_reach(), admin_company_activity(), company_benchmark(uuid), company_seen_candidates(), my_profile_stats() from public;
grant execute on function admin_candidate_reach(), admin_company_activity(), company_benchmark(uuid), company_seen_candidates(), my_profile_stats() to authenticated;
