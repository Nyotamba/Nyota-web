-- 027 — Nyota 2027 (homepage review, November 2026).
--  * Companies register themselves; an admin approves each one before it gets an access code.
--    Until approved, a registration is only a row in company_registrations: no account, no access to profiles.
--  * Organising schools = schools with "show on homepage" on. They appear by name even before their logo is uploaded.
--  * School names harmonised, company name typo fixed, homepage texts updated. Safe to run again.

create table if not exists company_registrations (
  id               uuid primary key default gen_random_uuid(),
  company_name     text not null check (char_length(company_name) between 2 and 120),
  contact_name     text not null check (char_length(contact_name) between 2 and 120),
  email            text not null check (char_length(email) <= 200 and email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  job_title        text not null default '' check (char_length(job_title) <= 120),
  website          text not null default '' check (website = '' or (char_length(website) <= 300 and website ~* '^https?://')),
  sector           text not null default '' check (char_length(sector) <= 80),
  hiring_countries text not null default '' check (char_length(hiring_countries) <= 300),
  message          text not null default '' check (char_length(message) <= 1000),
  status           text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  company_id       uuid references companies (id) on delete set null,
  created_at       timestamptz not null default now(),
  decided_at       timestamptz,
  decided_by       uuid references profiles (id) on delete set null
);
create unique index if not exists one_pending_registration on company_registrations (lower(email)) where status = 'pending';
alter table company_registrations enable row level security;
revoke all on company_registrations from anon, authenticated;
grant select on company_registrations to authenticated;
drop policy if exists "admin reads registrations" on company_registrations;
create policy "admin reads registrations" on company_registrations for select to authenticated using (my_role() = 'admin');

-- Public form. Answers the same way whether or not the address is already known.
create or replace function register_company(p_company text, p_contact text, p_email text, p_job_title text default '',
  p_website text default '', p_sector text default '', p_countries text default '', p_message text default '') returns void
language plpgsql security definer set search_path = public as $$
declare site text := trim(coalesce(p_website, ''));
begin
  if (select count(*) from company_registrations where created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Too many registrations right now. Please try again in an hour.';
  end if;
  if site <> '' and site !~* '^https?://' then site := 'https://' || site; end if;
  insert into company_registrations (company_name, contact_name, email, job_title, website, sector, hiring_countries, message)
  values (trim(p_company), trim(p_contact), lower(trim(p_email)), trim(coalesce(p_job_title, '')), site,
          trim(coalesce(p_sector, '')), trim(coalesce(p_countries, '')), trim(coalesce(p_message, '')))
  on conflict (lower(email)) where status = 'pending' do nothing;
end $$;

-- Approve: creates the company if it is new and the invitation (with its access code).
create or replace function approve_company_registration(rid uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r company_registrations; cid uuid;
begin
  if my_role() is distinct from 'admin' then raise exception 'Only admins can approve companies'; end if;
  select * into r from company_registrations where id = rid for update;
  if not found then raise exception 'This registration no longer exists'; end if;
  if r.status <> 'pending' then raise exception 'This registration has already been decided'; end if;
  select id into cid from companies where lower(name) = lower(r.company_name) limit 1;
  if cid is null then
    insert into companies (name, website, sector, hiring_countries)
    values (r.company_name, r.website, r.sector, r.hiring_countries) returning id into cid;
  end if;
  insert into invitations (company_id, email, invited_by) values (cid, lower(r.email), auth.uid())
  on conflict (company_id, email) do nothing;
  update company_registrations set status = 'approved', company_id = cid, decided_at = now(), decided_by = auth.uid() where id = rid;
  return jsonb_build_object('companyId', cid, 'email', lower(r.email));
end $$;

create or replace function reject_company_registration(rid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if my_role() is distinct from 'admin' then raise exception 'Only admins can decline companies'; end if;
  update company_registrations set status = 'rejected', decided_at = now(), decided_by = auth.uid() where id = rid and status = 'pending';
end $$;

revoke execute on function register_company(text, text, text, text, text, text, text, text),
  approve_company_registration(uuid), reject_company_registration(uuid) from public;
revoke execute on function approve_company_registration(uuid), reject_company_registration(uuid) from anon;
grant execute on function register_company(text, text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function approve_company_registration(uuid), reject_company_registration(uuid) to authenticated;

-- Homepage strips: organising schools show with or without a logo; companies still need a confirmed logo.
create or replace function public_partners() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'companies', coalesce((select jsonb_agg(jsonb_build_object('name', name, 'logoUrl', logo_url) order by name)
                           from companies where show_on_site and logo_url is not null), '[]'::jsonb),
    'schools', coalesce((select jsonb_agg(jsonb_build_object('name', name, 'logoUrl', logo_url) order by name)
                         from schools where show_on_site), '[]'::jsonb)
  )
$$;

-- School names, in one style, and the two schools that took part in 2026.
update schools set name = 'Esade Business School' where name = 'ESADE';
update candidates set school = 'Esade Business School' where school = 'ESADE';
update schools set name = 'IMD Business School' where name = 'IMD';
update candidates set school = 'IMD Business School' where school = 'IMD';
insert into schools (name) values ('Oxford Saïd Business School'), ('Cambridge Judge Business School') on conflict do nothing;
-- The organising schools for 2027. Add others from Settings > Lists > Schools ("Show on homepage").
update schools set show_on_site = true where name in ('IESE Business School', 'Esade Business School');

update companies set name = 'BP' where name = 'British petrolium';

insert into site_settings (key, value) values
  ('hero_title', 'Where Europe’s MBA talent meets Africa’s employers.'),
  ('hero_text', 'Two days of company sessions, open roles and interviews, run by the Africa and Black business clubs of {schools}. Free for students and alumni.'),
  ('forum_date', 'February 2027')
on conflict (key) do update set value = excluded.value, updated_at = now();
