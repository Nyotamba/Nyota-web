-- 011 — Roles (functions), sectors and languages offered in profiles and filters are managed by admins
-- on the site (Admin → Lists), like schools. Run once in Supabase → SQL Editor. Safe to run again.

create table if not exists profile_options (
  kind        text not null check (kind in ('function', 'sector', 'language')),
  name        text not null check (char_length(trim(name)) between 2 and 80),
  created_at  timestamptz not null default now(),
  primary key (kind, name)
);
alter table profile_options enable row level security;
revoke all on profile_options from anon, authenticated;
grant select on profile_options to anon, authenticated;
grant insert, delete on profile_options to authenticated;

drop policy if exists "anyone reads options" on profile_options;
create policy "anyone reads options" on profile_options for select using (true);
drop policy if exists "admin adds options" on profile_options;
create policy "admin adds options" on profile_options for insert to authenticated with check (my_role() = 'admin');
drop policy if exists "admin removes options" on profile_options;
create policy "admin removes options" on profile_options for delete to authenticated using (my_role() = 'admin');

insert into profile_options (kind, name) values
  ('function', 'Strategy'),
  ('function', 'Business development'),
  ('function', 'Finance'),
  ('function', 'Investment'),
  ('function', 'Operations'),
  ('function', 'Product'),
  ('function', 'Marketing'),
  ('function', 'Consulting'),
  ('sector', 'Energy'),
  ('sector', 'Infrastructure'),
  ('sector', 'Financial services'),
  ('sector', 'Consumer goods'),
  ('sector', 'Healthcare'),
  ('sector', 'Agriculture'),
  ('language', 'English'),
  ('language', 'French'),
  ('language', 'Portuguese'),
  ('language', 'Arabic'),
  ('language', 'Spanish'),
  ('language', 'Swahili')
on conflict do nothing;
