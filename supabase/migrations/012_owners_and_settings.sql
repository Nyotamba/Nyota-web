-- 012 — Owners (super-admins) and site settings edited on the site.
-- Run once in Supabase → SQL Editor. Safe to run again.
--
-- Owners are admins with extra powers: manage admins and other owners, delete students and companies,
-- edit site settings (fair date, venue, texts, consent). An admin can never remove or demote an owner,
-- and the last owner can never be removed. Keep at least two owners so the club is never locked out.

alter table admin_emails add column if not exists is_owner boolean not null default false;
alter table profiles add column if not exists is_owner boolean not null default false;

-- First owner.
update admin_emails set is_owner = true where lower(email) = 'sirdec93@gmail.com';
update profiles set is_owner = true where lower(email) = 'sirdec93@gmail.com' and role = 'admin';

create or replace function is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_owner and role = 'admin' from profiles where id = auth.uid()), false)
$$;

-- New owners get the flag at sign-up or code redemption: keep profiles in line with admin_emails.
create or replace function sync_owner_flag() returns trigger language plpgsql security definer set search_path = public as $$
begin
  update profiles set is_owner = new.is_owner where lower(email) = lower(new.email) and role = 'admin';
  return new;
end $$;
drop trigger if exists admin_email_owner_sync on admin_emails;
create trigger admin_email_owner_sync after insert or update of is_owner on admin_emails
  for each row execute function sync_owner_flag();

create or replace function sync_owner_on_profile() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role = 'admin' then
    new.is_owner := coalesce((select a.is_owner from admin_emails a where lower(a.email) = lower(new.email)), false);
  else
    new.is_owner := false;
  end if;
  return new;
end $$;
drop trigger if exists profile_owner_sync on profiles;
create trigger profile_owner_sync before insert or update of role on profiles
  for each row execute function sync_owner_on_profile();

-- Admin management becomes owner-only.
create or replace function add_admin(new_email text) returns void
language plpgsql security definer set search_path = public as $$
declare em text := lower(trim(new_email));
begin
  if not is_owner() then raise exception 'Only owners can add admins'; end if;
  if em !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then raise exception 'Enter a valid e-mail address'; end if;
  insert into admin_emails (email) values (em) on conflict do nothing;
  update profiles set role = 'admin', company_id = null where lower(email) = em;
end $$;

create or replace function remove_admin(old_email text) returns void
language plpgsql security definer set search_path = public as $$
declare em text := lower(trim(old_email));
begin
  if not is_owner() then raise exception 'Only owners can remove admins'; end if;
  if em = (select lower(email) from profiles where id = auth.uid()) then
    raise exception 'You cannot remove yourself. Ask another owner.';
  end if;
  if (select is_owner from admin_emails where lower(email) = em)
     and (select count(*) from admin_emails where is_owner) <= 1 then
    raise exception 'The club needs at least one owner';
  end if;
  delete from admin_emails where lower(email) = em;
  update profiles set role = 'student', is_owner = false where lower(email) = em and role = 'admin';
  insert into candidates (user_id, email)
    select p.id, p.email from profiles p where lower(p.email) = em
    on conflict (email) do update set user_id = excluded.user_id;
end $$;

create or replace function set_owner(target_email text, owner boolean) returns void
language plpgsql security definer set search_path = public as $$
declare em text := lower(trim(target_email));
begin
  if not is_owner() then raise exception 'Only owners can change owners'; end if;
  if not exists (select 1 from admin_emails where lower(email) = em) then raise exception 'Add this person as an admin first'; end if;
  if not owner and (select count(*) from admin_emails where is_owner) <= 1 then
    raise exception 'The club needs at least one owner';
  end if;
  update admin_emails set is_owner = owner where lower(email) = em;
end $$;

drop function if exists list_admins();
create function list_admins() returns table (email text, signed_in boolean, access_code text, is_owner boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if my_role() is distinct from 'admin' then raise exception 'Only club admins can see the admin list'; end if;
  return query
    select a.email, exists (select 1 from profiles p where lower(p.email) = lower(a.email) and p.role = 'admin'),
      case when is_owner() then a.access_code end, a.is_owner
    from admin_emails a order by a.is_owner desc, a.email;
end $$;

-- Owner-only deletions -----------------------------------------------------------

create or replace function delete_candidate(cid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_owner() then raise exception 'Only owners can delete student profiles'; end if;
  -- The CV file is removed by the site through the Storage API first (see policy below).
  delete from candidates where id = cid; -- consents, registrations, shortlists, slots follow (cascade)
end $$;

create or replace function delete_company(co uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_owner() then raise exception 'Only owners can delete companies'; end if;
  update profiles set role = 'student', company_id = null where company_id = co and role = 'company';
  delete from companies where id = co; -- invitations, sessions, shortlists, slots, CV views follow (cascade)
end $$;

drop policy if exists "owner deletes cvs" on storage.objects;
create policy "owner deletes cvs" on storage.objects for delete to authenticated
  using (bucket_id = 'cvs' and public.is_owner());

-- Site settings --------------------------------------------------------------------

create table if not exists site_settings (
  key         text primary key,
  value       text not null default '',
  updated_at  timestamptz not null default now(),
  updated_by  uuid references profiles (id) default auth.uid()
);
alter table site_settings enable row level security;
revoke all on site_settings from anon, authenticated;
grant select on site_settings to anon, authenticated;
grant insert, update on site_settings to authenticated;
drop policy if exists "anyone reads settings" on site_settings;
create policy "anyone reads settings" on site_settings for select using (true);
drop policy if exists "owners write settings" on site_settings;
create policy "owners write settings" on site_settings for all to authenticated
  using (is_owner()) with check (is_owner());

insert into site_settings (key, value) values
  ('forum_name', 'Nyota Africa Career Fair'),
  ('forum_date', '16–19 February 2027'),
  ('forum_venue', 'Online'),
  ('forum_year', '2027'),
  ('club_email', 'contact@nyota.mba'),
  ('retention_months', '[X]'),
  ('consent_version', 'v1'),
  ('consent_text', '[CONSENT TEXT v1 — to be pasted from the DPO-approved version.]'),
  ('hero_title', 'Europe’s MBA talent, meeting Africa’s next decade.'),
  ('hero_text', 'Nyota connects MBA students from European business schools with companies that operate in Africa or plan to. Build one verified profile. Only invited companies can see it, and only once you say yes.')
on conflict (key) do nothing;

revoke execute on function is_owner(), set_owner(text, boolean), list_admins(), delete_candidate(uuid), delete_company(uuid),
  add_admin(text), remove_admin(text) from public, anon;
grant execute on function is_owner(), set_owner(text, boolean), list_admins(), delete_candidate(uuid), delete_company(uuid),
  add_admin(text), remove_admin(text) to authenticated;
