-- 023 — Insights: company traits (sector, roles and countries they hire for, size) and candidate countries
-- (worked in, want to work in) on every signal, to cross "what kind of company looks for what kind of profile".
-- Safe to run again.

drop function if exists admin_insight_signals();
create function admin_insight_signals() returns table (
  direction text, kind text, at timestamptz, company_name text, company_sector text,
  company_hiring_for text[], company_countries text, company_size text,
  school text, functions text[], past_sectors text[], sectors text[], languages text[], years_experience int,
  worked_countries text, target_countries text, detail jsonb
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
    select sig.d, sig.k, sig.a, co.name, co.sector, co.hiring_for, co.hiring_countries, co.size,
      c.school, c.functions, c.past_sectors, c.sectors, c.languages, c.years_experience, c.worked_countries, c.countries, sig.det
    from sig left join companies co on co.id = sig.co left join candidates c on c.id = sig.ca
    where sig.a > now() - interval '12 months';
end $$;

revoke execute on function admin_insight_signals() from public;
grant execute on function admin_insight_signals() to authenticated;
