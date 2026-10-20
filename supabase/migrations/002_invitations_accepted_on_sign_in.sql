-- 002 — Invitation e-mails create the account before the person clicks the link,
-- so "Accepted" must be set at their first real sign-in, not when the account is created.
-- Run once in Supabase → SQL Editor (already included in schema.sql for new installs).

create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
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

create or replace function mark_invitation_accepted() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.last_sign_in_at is not null and old.last_sign_in_at is null then
    update invitations set status = 'Accepted' where lower(email) = lower(new.email) and status = 'Invited';
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_signed_in on auth.users;
create trigger on_auth_user_signed_in after update of last_sign_in_at on auth.users
  for each row execute function mark_invitation_accepted();

revoke execute on function mark_invitation_accepted() from anon, public;
