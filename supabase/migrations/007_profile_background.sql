-- 007 — Professional background on the student profile; African regions are no longer asked.
-- Run once in Supabase → SQL Editor. Safe to run again.
-- Never add nationality, origin, ethnicity, religion, health or immigration status (privacy rules).

alter table candidates add column if not exists job_title text not null default '';
alter table candidates add column if not exists employer text not null default '';
alter table candidates add column if not exists years_experience int check (years_experience is null or years_experience between 0 and 40);
alter table candidates add column if not exists past_sectors text[] not null default '{}';
alter table candidates add column if not exists worked_countries text not null default '';

-- Same column rules as the other profile fields: everyone signed in may read them (companies only for
-- visible profiles, by row-level security); students edit their own.
grant select (job_title, employer, years_experience, past_sectors, worked_countries) on candidates to authenticated;
grant update (job_title, employer, years_experience, past_sectors, worked_countries) on candidates to authenticated;

-- A complete profile no longer needs African regions.
create or replace function admin_dashboard() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare result jsonb;
begin
  if my_role() is distinct from 'admin' then raise exception 'Only club admins can see the dashboard'; end if;
  with c as (
    select c.*,
      exists (select 1 from consents k where k.candidate_id = c.id and k.withdrawn_at is null) as consented,
      (c.first_name <> '' and c.last_name <> '' and c.graduation_year is not null
        and cardinality(c.functions) > 0 and cardinality(c.sectors) > 0
        and cardinality(c.languages) > 0 and c.available_from is not null and c.cv_path is not null) as complete
    from candidates c
  )
  select jsonb_build_object(
    'students', (select jsonb_build_object(
        'signedUp', count(*),
        'complete', count(*) filter (where complete),
        'consented', count(*) filter (where consented),
        'readyForReview', count(*) filter (where consented and complete),
        'waiting', count(*) filter (where consented and verified_at is null),
        'visible', count(*) filter (where consented and verified_at is not null and cv_path is not null)
      ) from c),
    'oldestWaitingDays', (
      select floor(extract(epoch from now() - min(k.given_at)) / 86400)::int
      from candidates x join consents k on k.candidate_id = x.id and k.withdrawn_at is null
      where x.verified_at is null),
    'companies', jsonb_build_object(
      'total', (select count(*) from companies),
      'invited', (select count(*) from invitations),
      'accepted', (select count(*) from invitations where status = 'Accepted')),
    'activity', jsonb_build_object(
      'cvViews', (select count(*) from cv_views),
      'shortlisted', (select count(*) from shortlists),
      'interviewRequests', (select count(*) from interview_requests),
      'consentsWithdrawn', (select count(*) from consents where withdrawn_at is not null)),
    'perCompany', coalesce((
      select jsonb_agg(t.row order by t.row->>'name') from (
        select jsonb_build_object(
          'name', co.name,
          'invited', (select count(*) from invitations i where i.company_id = co.id),
          'accepted', (select count(*) from invitations i where i.company_id = co.id and i.status = 'Accepted'),
          'cvViews', (select count(*) from cv_views v where v.company_id = co.id),
          'shortlisted', (select count(*) from shortlists s where s.company_id = co.id),
          'interviewRequests', (select count(*) from interview_requests r where r.company_id = co.id)
        ) as row from companies co) t), '[]'::jsonb)
  ) into result;
  return result;
end $$;
