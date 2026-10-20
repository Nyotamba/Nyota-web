-- 006 — E-mail + password accounts, with access codes for companies and admins.
-- Run once in Supabase → SQL Editor. Safe to run again.
--
-- Why codes: password sign-ups do not prove the person owns the e-mail address. So a password account
-- always starts as a student; company and admin rights come only from a one-time access code that an
-- admin hands out, and that works only together with the invited e-mail address.
-- (E-mail links and Google / Microsoft / LinkedIn sign-ins still prove the address and keep working as before.)

create or replace function gen_access_code() returns text language sql volatile as $$
  select upper(substr(md5(gen_random_uuid()::text), 1, 4) || '-' || substr(md5(gen_random_uuid()::text), 1, 4))
$$;

alter table invitations add column if not exists access_code text;
update invitations set access_code = gen_access_code() where access_code is null;
alter table invitations alter column access_code set default gen_access_code();
create unique index if not exists invitations_access_code on invitations (access_code);

alter table admin_emails add column if not exists access_code text;
update admin_emails set access_code = gen_access_code() where access_code is null;
alter table admin_emails alter column access_code set default gen_access_code();
create unique index if not exists admin_emails_access_code on admin_emails (access_code);

-- First sign-in: rights from the e-mail address only when the sign-in method proves it.
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare
  em text := lower(new.email);
  inv invitations;
  -- Password sign-ups do not prove ownership of the address; links and Google/Microsoft/LinkedIn do.
  trusted boolean := coalesce(new.raw_app_meta_data->>'provider', 'email') <> 'email' or coalesce(new.encrypted_password, '') = '';
begin
  if trusted and exists (select 1 from admin_emails where lower(email) = em) then
    insert into profiles (id, role, email) values (new.id, 'admin', em);
    return new;
  end if;
  if trusted then
    select * into inv from invitations where lower(email) = em order by created_at desc limit 1;
    if found then
      insert into profiles (id, role, email, company_id) values (new.id, 'company', em, inv.company_id);
      return new;
    end if;
  end if;
  insert into profiles (id, role, email) values (new.id, 'student', em);
  insert into candidates (user_id, email) values (new.id, em)
    on conflict (email) do update set user_id = excluded.user_id;
  return new;
end $$;

-- Turn the caller's account into a company or admin account with a code (must match their e-mail).
create or replace function redeem_access_code(code text) returns user_role
language plpgsql security definer set search_path = public as $$
declare
  c text := upper(trim(code));
  me profiles;
  inv invitations;
begin
  select * into me from profiles where id = auth.uid();
  if not found then raise exception 'Sign in first'; end if;

  if exists (select 1 from admin_emails a where a.access_code = c and lower(a.email) = me.email) then
    update profiles set role = 'admin', company_id = null where id = me.id;
  else
    select * into inv from invitations i where i.access_code = c and lower(i.email) = me.email;
    if not found then
      raise exception 'This code does not match your e-mail address. Check both with the club.';
    end if;
    update profiles set role = 'company', company_id = inv.company_id where id = me.id;
    update invitations set status = 'Accepted' where id = inv.id;
  end if;
  -- Drop the empty student profile created at sign-up (never one with a CV or a consent).
  delete from candidates x where x.user_id = me.id and x.cv_path is null
    and not exists (select 1 from consents k where k.candidate_id = x.id);
  return (select role from profiles where id = me.id);
end $$;

-- Admin list now includes the code to hand out.
drop function if exists list_admins();
create function list_admins() returns table (email text, signed_in boolean, access_code text)
language plpgsql stable security definer set search_path = public as $$
begin
  if my_role() is distinct from 'admin' then raise exception 'Only club admins can see the admin list'; end if;
  return query
    select a.email, exists (select 1 from profiles p where lower(p.email) = lower(a.email) and p.role = 'admin'), a.access_code
    from admin_emails a order by a.email;
end $$;

revoke execute on function gen_access_code(), redeem_access_code(text), list_admins() from public, anon;
-- gen_access_code runs as the column default when an admin adds an invitation or an admin e-mail.
grant execute on function gen_access_code(), redeem_access_code(text), list_admins() to authenticated;
