-- Nyota — database schema (PostgreSQL / Supabase).
-- Run once on a fresh project: Supabase → SQL Editor → paste this file → Run.
-- Existing projects: run the files in supabase/migrations/ instead, in order.
-- Mirrors src/lib/db/types.ts (snake_case here).

create extension if not exists "pgcrypto";

create type user_role as enum ('student', 'company', 'admin');
create type position_type as enum ('Full-time', 'Internship', 'Both');
create type invitation_status as enum ('Invited', 'Accepted');

-- Tables ---------------------------------------------------------------------

create table companies (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  created_at timestamptz not null default now()
);

-- One row per signed-in person, created automatically at first sign-in (see handle_new_user).
create table profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        user_role not null,
  email       text not null unique,
  company_id  uuid references companies (id) on delete set null,
  created_at  timestamptz not null default now()
);

-- E-mails that become club admins when they first sign in. Fill it from the SQL editor only.
create table admin_emails (
  email text primary key
);

-- Student profile. Deliberately no fields for ethnicity, religion, health, nationality or immigration status.
create table candidates (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid unique references profiles (id) on delete cascade,
  email            text not null unique,   -- never readable by companies (column privileges below)
  first_name       text not null default '',
  last_name        text not null default '',
  school           text not null default 'IESE Business School',
  programme        text not null default 'Full-time MBA',
  graduation_year  int,
  linkedin_url     text not null default '',
  functions        text[] not null default '{}',
  sectors          text[] not null default '{}',
  regions          text[] not null default '{}',
  countries        text not null default '',
  languages        text[] not null default '{}',
  position_type    position_type not null default 'Full-time',
  available_from   date,
  story            text not null default '' check (char_length(story) <= 1000),
  cv_path          text,          -- object key in the private "cvs" storage bucket: <candidate id>/cv.pdf
  cv_size_bytes    int check (cv_size_bytes <= 5242880),
  cv_uploaded_at   timestamptz,
  verified_at      timestamptz,
  verified_by      uuid references profiles (id),
  updated_at       timestamptz not null default now()
);

-- Consent history: one row per consent given; withdrawal closes the row (kept for audit).
create table consents (
  id            uuid primary key default gen_random_uuid(),
  candidate_id  uuid not null references candidates (id) on delete cascade,
  version       text not null,
  given_at      timestamptz not null default now(),
  withdrawn_at  timestamptz
);
create unique index one_active_consent on consents (candidate_id) where withdrawn_at is null;

create table invitations (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies (id) on delete cascade,
  email       text not null,
  status      invitation_status not null default 'Invited',
  invited_by  uuid references profiles (id),
  created_at  timestamptz not null default now(),
  unique (company_id, email)
);

create table shortlists (
  company_id    uuid not null references companies (id) on delete cascade,
  candidate_id  uuid not null references candidates (id) on delete cascade,
  added_by      uuid references profiles (id) default auth.uid(),
  created_at    timestamptz not null default now(),
  primary key (company_id, candidate_id)
);

create table interview_requests (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies (id) on delete cascade,
  candidate_id  uuid not null references candidates (id) on delete cascade,
  requested_by  uuid references profiles (id) default auth.uid(),
  created_at    timestamptz not null default now(),
  unique (company_id, candidate_id)
);

-- Every CV opening is logged (shared with the club).
create table cv_views (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies (id) on delete cascade,
  candidate_id  uuid not null references candidates (id) on delete cascade,
  viewer_id     uuid references profiles (id) default auth.uid(),
  viewed_at     timestamptz not null default now()
);

-- Helper functions (security definer: they read tables the caller cannot read directly) ---

create function my_role() returns user_role language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create function my_company() returns uuid language sql stable security definer set search_path = public as $$
  select company_id from profiles where id = auth.uid()
$$;

create function my_candidate() returns uuid language sql stable security definer set search_path = public as $$
  select id from candidates where user_id = auth.uid()
$$;

-- A candidate is visible to companies only with an active consent, a CV and club verification.
create function is_visible(cid uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from candidates c
    where c.id = cid and c.verified_at is not null and c.cv_path is not null
      and exists (select 1 from consents k where k.candidate_id = c.id and k.withdrawn_at is null)
  )
$$;

-- First sign-in: admin if listed, company member if invited, otherwise student.
create function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare
  em text := lower(new.email);
  inv invitations;
begin
  if exists (select 1 from admin_emails where lower(email) = em) then
    insert into profiles (id, role, email) values (new.id, 'admin', em);
  else
    select * into inv from invitations where lower(email) = em order by created_at desc limit 1;
    if found then
      insert into profiles (id, role, email, company_id) values (new.id, 'company', em, inv.company_id);
    else
      insert into profiles (id, role, email) values (new.id, 'student', em);
      insert into candidates (user_id, email) values (new.id, em)
        on conflict (email) do update set user_id = excluded.user_id;
    end if;
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- An invitation counts as accepted at the person's first real sign-in
-- (the invitation e-mail creates the account before they click).
create function mark_invitation_accepted() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.last_sign_in_at is not null and old.last_sign_in_at is null then
    update invitations set status = 'Accepted' where lower(email) = lower(new.email) and status = 'Invited';
  end if;
  return new;
end $$;
create trigger on_auth_user_signed_in after update of last_sign_in_at on auth.users
  for each row execute function mark_invitation_accepted();

-- Withdrawing consent hides the profile and requires a new verification.
create function on_consent_withdrawn() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.withdrawn_at is not null and old.withdrawn_at is null then
    update candidates set verified_at = null, verified_by = null where id = new.candidate_id;
    delete from shortlists where candidate_id = new.candidate_id;
  end if;
  return new;
end $$;
create trigger consent_withdrawn after update on consents for each row execute function on_consent_withdrawn();

-- Admin actions (students cannot touch verified_at: see column privileges).
create function verify_candidates(ids uuid[]) returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if my_role() is distinct from 'admin' then raise exception 'Only club admins can verify profiles'; end if;
  update candidates c set verified_at = now(), verified_by = auth.uid()
  where c.id = any (ids) and c.cv_path is not null
    and exists (select 1 from consents k where k.candidate_id = c.id and k.withdrawn_at is null);
  get diagnostics n = row_count;
  return n;
end $$;

create function verification_queue() returns table (
  id uuid, email text, consent_version text, consent_given_at timestamptz
) language plpgsql stable security definer set search_path = public as $$
begin
  if my_role() is distinct from 'admin' then raise exception 'Only club admins can see the verification queue'; end if;
  return query
    select c.id, c.email, k.version, k.given_at
    from candidates c join consents k on k.candidate_id = c.id and k.withdrawn_at is null
    where c.verified_at is null
    order by k.given_at desc;
end $$;

-- Privileges -----------------------------------------------------------------
-- Nothing is readable without signing in.
revoke all on all tables in schema public from anon;
revoke execute on all functions in schema public from anon, public;
grant execute on all functions in schema public to authenticated;

-- candidates: every column except e-mail is readable; students may only edit their own profile fields.
revoke all on candidates from authenticated;
grant select (id, user_id, first_name, last_name, school, programme, graduation_year, linkedin_url, functions, sectors,
  regions, countries, languages, position_type, available_from, story, cv_path, cv_size_bytes, cv_uploaded_at,
  verified_at, updated_at) on candidates to authenticated;
grant update (first_name, last_name, school, programme, graduation_year, linkedin_url, functions, sectors, regions,
  countries, languages, position_type, available_from, story, cv_path, cv_size_bytes, cv_uploaded_at, updated_at)
  on candidates to authenticated;

-- Profiles are created by the trigger only; admin e-mails are managed from the SQL editor only.
revoke insert, update, delete on profiles from authenticated;
revoke all on admin_emails from authenticated;

-- Row-level security -----------------------------------------------------------
alter table profiles enable row level security;
alter table admin_emails enable row level security;
alter table companies enable row level security;
alter table candidates enable row level security;
alter table consents enable row level security;
alter table invitations enable row level security;
alter table shortlists enable row level security;
alter table interview_requests enable row level security;
alter table cv_views enable row level security;

create policy "read own profile" on profiles for select using (id = auth.uid() or my_role() = 'admin');

create policy "student reads own candidate" on candidates for select using (user_id = auth.uid());
create policy "student edits own candidate" on candidates for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "company reads visible candidates" on candidates for select using (my_role() = 'company' and is_visible(id));
create policy "admin reads candidates" on candidates for select using (my_role() = 'admin');

create policy "student manages own consents" on consents for all
  using (candidate_id = my_candidate()) with check (candidate_id = my_candidate());
create policy "admin reads consents" on consents for select using (my_role() = 'admin');

create policy "company own shortlist" on shortlists for all using (company_id = my_company()) with check (company_id = my_company());
create policy "company own requests" on interview_requests for all using (company_id = my_company()) with check (company_id = my_company());
create policy "student sees requests" on interview_requests for select using (candidate_id = my_candidate());
create policy "company logs views" on cv_views for insert with check (company_id = my_company());
create policy "admin reads views" on cv_views for select using (my_role() = 'admin');

create policy "admin manages companies" on companies for all using (my_role() = 'admin') with check (my_role() = 'admin');
create policy "company reads itself" on companies for select using (id = my_company());
create policy "admin manages invitations" on invitations for all using (my_role() = 'admin') with check (my_role() = 'admin');

-- CV storage: private bucket, PDF only, 5 MB. Files live at <candidate id>/cv.pdf ------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cvs', 'cvs', false, 5242880, array['application/pdf']);

create policy "student manages own cv" on storage.objects for all to authenticated
  using (bucket_id = 'cvs' and (storage.foldername(name))[1] = public.my_candidate()::text)
  with check (bucket_id = 'cvs' and (storage.foldername(name))[1] = public.my_candidate()::text);
create policy "company reads visible cvs" on storage.objects for select to authenticated
  using (bucket_id = 'cvs' and public.my_role() = 'company'
         and public.is_visible(((storage.foldername(name))[1])::uuid));
create policy "admin reads cvs" on storage.objects for select to authenticated
  using (bucket_id = 'cvs' and public.my_role() = 'admin');
