-- 022 — Admins edit candidate profiles; activity signals for the admin "Insights" page.
--  * Admins can update candidate profiles (not consent, CV or gender: those stay the student's own).
--  * activity_events: what companies look at (profiles, searches) and what students look at (companies).
--    Combined with what already exists (CV views, shortlists, interview requests, interest in openings,
--    session registrations and attendance), it tells the club who attracts whom, and why.
--  * Admins only ever see these as anonymous rows (no name, no e-mail) and aggregate them on the page.
--  * Kept 12 months, then deleted (see purge in log_event). Safe to run again.

drop policy if exists "admin edits candidates" on candidates;
create policy "admin edits candidates" on candidates for update to authenticated
  using (my_role() = 'admin') with check (my_role() = 'admin');

create table if not exists activity_events (
  id           bigint generated always as identity primary key,
  at           timestamptz not null default now(),
  kind         text not null check (kind in ('profile_view', 'filter_search', 'company_click')),
  company_id   uuid references companies (id) on delete cascade,
  candidate_id uuid references candidates (id) on delete cascade,
  detail       jsonb not null default '{}'::jsonb check (pg_column_size(detail) < 4000)
);
create index if not exists activity_events_at on activity_events (at);
alter table activity_events enable row level security;
revoke all on activity_events from anon, authenticated;
-- No policy: written through log_event(), read only through admin_insight_signals().

-- Companies log profile views and searches; students log clicks on company pages. The actor comes from the session.
create or replace function log_event(p_kind text, p_target uuid default null, p_detail jsonb default '{}'::jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare r user_role := my_role();
begin
  if p_kind in ('profile_view', 'filter_search') and r = 'company' then
    if p_kind = 'profile_view' and (p_target is null or not is_visible(p_target)) then return; end if;
    insert into activity_events (kind, company_id, candidate_id, detail)
    values (p_kind, my_company(), case when p_kind = 'profile_view' then p_target end, coalesce(p_detail, '{}'::jsonb));
  elsif p_kind = 'company_click' and r = 'student' and my_candidate() is not null then
    if not exists (select 1 from companies where id = p_target) then return; end if;
    insert into activity_events (kind, company_id, candidate_id, detail) values (p_kind, p_target, my_candidate(), coalesce(p_detail, '{}'::jsonb));
  end if;
  -- Retention: 12 months.
  if random() < 0.02 then delete from activity_events where at < now() - interval '12 months'; end if;
end $$;

-- One anonymous row per signal, with the candidate's background and the company's name and sector.
-- direction: 'company_to_candidate' (who companies look at), 'candidate_to_company' (who students look at), 'search'.
create or replace function admin_insight_signals() returns table (
  direction text, kind text, at timestamptz, company_name text, company_sector text,
  school text, functions text[], past_sectors text[], sectors text[], languages text[], years_experience int, detail jsonb
) language plpgsql stable security definer set search_path = public as $$
begin
  if my_role() is distinct from 'admin' then raise exception 'Only club admins can see insights'; end if;
  return query
    with sig as (
      select 'company_to_candidate'::text d, e.kind k, e.at a, e.company_id co, e.candidate_id ca, e.detail det
        from activity_events e where e.kind = 'profile_view'
      union all select 'company_to_candidate', 'cv_view', v.viewed_at, v.company_id, v.candidate_id, '{}'::jsonb from cv_views v
      union all select 'company_to_candidate', 'shortlist', s.created_at, s.company_id, s.candidate_id, '{}'::jsonb from shortlists s
      union all select 'company_to_candidate', 'interview_request', r.created_at, r.company_id, r.candidate_id, '{}'::jsonb from interview_requests r
      union all select 'candidate_to_company', 'company_click', e.at, e.company_id, e.candidate_id, e.detail from activity_events e where e.kind = 'company_click'
      union all select 'candidate_to_company', 'opening_interest', i.created_at, o.company_id, i.candidate_id, jsonb_build_object('opening', o.title)
        from opening_interests i join openings o on o.id = i.opening_id
      union all select 'candidate_to_company', 'session_register', r.created_at, s.company_id, r.candidate_id, jsonb_build_object('session', s.title)
        from session_registrations r join sessions s on s.id = r.session_id where s.company_id is not null
      union all select 'candidate_to_company', 'session_attend', coalesce(r.attended_at, r.created_at), s.company_id, r.candidate_id, jsonb_build_object('session', s.title)
        from session_registrations r join sessions s on s.id = r.session_id where s.company_id is not null and r.attended_at is not null
      union all select 'search', 'filter_search', e.at, e.company_id, null, e.detail from activity_events e where e.kind = 'filter_search'
    )
    select sig.d, sig.k, sig.a, co.name, co.sector, c.school, c.functions, c.past_sectors, c.sectors, c.languages, c.years_experience, sig.det
    from sig left join companies co on co.id = sig.co left join candidates c on c.id = sig.ca
    where sig.a > now() - interval '12 months';
end $$;

revoke execute on function log_event(text, uuid, jsonb), admin_insight_signals() from public;
grant execute on function log_event(text, uuid, jsonb), admin_insight_signals() to authenticated;
