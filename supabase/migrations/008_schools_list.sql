-- 008 — The list of business schools is managed by admins on the site (Admin → Schools).
-- Run once in Supabase → SQL Editor. Safe to run again.

create table if not exists schools (
  name        text primary key check (char_length(trim(name)) between 2 and 120),
  created_at  timestamptz not null default now()
);
alter table schools enable row level security;

-- Everyone can read the list (sign-up and profile forms); only admins change it.
revoke all on schools from anon, authenticated;
grant select on schools to anon, authenticated;
grant insert, delete on schools to authenticated;

drop policy if exists "anyone reads schools" on schools;
create policy "anyone reads schools" on schools for select using (true);
drop policy if exists "admin adds schools" on schools;
create policy "admin adds schools" on schools for insert to authenticated with check (my_role() = 'admin');
drop policy if exists "admin removes schools" on schools;
create policy "admin removes schools" on schools for delete to authenticated using (my_role() = 'admin');

-- Starting list (students can still type a school that is not listed).
insert into schools (name) values
  ('IESE Business School'),
  ('INSEAD'),
  ('HEC Paris'),
  ('London Business School'),
  ('ESADE'),
  ('IE Business School'),
  ('Oxford Saïd Business School'),
  ('Cambridge Judge Business School'),
  ('SDA Bocconi'),
  ('ESSEC Business School'),
  ('ESCP Business School'),
  ('IMD'),
  ('Imperial College Business School'),
  ('Rotterdam School of Management'),
  ('University of St. Gallen'),
  ('WHU – Otto Beisheim'),
  ('Mannheim Business School'),
  ('Warwick Business School'),
  ('Vlerick Business School'),
  ('EDHEC Business School')
on conflict do nothing;
