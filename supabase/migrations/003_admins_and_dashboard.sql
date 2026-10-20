-- 003 — Manage admins from the site, and the admin dashboard (KPIs).
-- Run once in Supabase → SQL Editor. Safe to run again.

-- Admins can read shortlists and interview requests (for the dashboard).
drop policy if exists "admin reads shortlists" on shortlists;
create policy "admin reads shortlists" on shortlists for select using (my_role() = 'admin');
drop policy if exists "admin reads requests" on interview_requests;
create policy "admin reads requests" on interview_requests for select using (my_role() = 'admin');

-- Admins ---------------------------------------------------------------------

create or replace function list_admins() returns table (email text, signed_in boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if my_role() is distinct from 'admin' then raise exception 'Only club admins can see the admin list'; end if;
  return query
    select a.email, exists (select 1 from profiles p where lower(p.email) = lower(a.email))
    from admin_emails a order by a.email;
end $$;

create or replace function add_admin(new_email text) returns void
language plpgsql security definer set search_path = public as $$
declare em text := lower(trim(new_email));
begin
  if my_role() is distinct from 'admin' then raise exception 'Only club admins can add admins'; end if;
  if em !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then raise exception 'Enter a valid e-mail address'; end if;
  insert into admin_emails (email) values (em) on conflict do nothing;
  -- Already signed in as a student or company member: becomes admin right away.
  update profiles set role = 'admin', company_id = null where lower(email) = em;
end $$;

create or replace function remove_admin(old_email text) returns void
language plpgsql security definer set search_path = public as $$
declare em text := lower(trim(old_email));
begin
  if my_role() is distinct from 'admin' then raise exception 'Only club admins can remove admins'; end if;
  if em = (select lower(email) from profiles where id = auth.uid()) then
    raise exception 'You cannot remove yourself. Ask another admin.';
  end if;
  if (select count(*) from admin_emails) <= 1 then raise exception 'The club needs at least one admin'; end if;
  delete from admin_emails where lower(email) = em;
  -- Back to a regular account (student profile, kept empty until they fill it in).
  update profiles set role = 'student' where lower(email) = em and role = 'admin';
  insert into candidates (user_id, email)
    select p.id, p.email from profiles p where lower(p.email) = em
    on conflict (email) do update set user_id = excluded.user_id;
end $$;

-- Dashboard --------------------------------------------------------------------

create or replace function admin_dashboard() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare result jsonb;
begin
  if my_role() is distinct from 'admin' then raise exception 'Only club admins can see the dashboard'; end if;
  with c as (
    select c.*,
      exists (select 1 from consents k where k.candidate_id = c.id and k.withdrawn_at is null) as consented,
      (c.first_name <> '' and c.last_name <> '' and c.graduation_year is not null
        and cardinality(c.functions) > 0 and cardinality(c.sectors) > 0 and cardinality(c.regions) > 0
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

revoke execute on function list_admins(), add_admin(text), remove_admin(text), admin_dashboard() from anon, public;
grant execute on function list_admins(), add_admin(text), remove_admin(text), admin_dashboard() to authenticated;
