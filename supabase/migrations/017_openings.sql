-- 017 — Openings: companies (or the club for them) post roles; students say "I'm interested".
-- Companies only see interested students whose profile is verified and shared (is_visible). Safe to run again.

create table if not exists openings (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies (id) on delete cascade,
  title        text not null check (char_length(title) between 3 and 120),
  contract     text not null default 'Full-time' check (contract in ('Full-time', 'Internship', 'Summer internship', 'Other')),
  function     text not null default '' check (char_length(function) <= 80),
  location     text not null default '' check (char_length(location) <= 120),
  description  text not null default '' check (char_length(description) <= 2000),
  apply_url    text not null default '' check (char_length(apply_url) <= 500),
  apply_by     date,
  published    boolean not null default true,
  created_at   timestamptz not null default now()
);
create table if not exists opening_interests (
  opening_id   uuid not null references openings (id) on delete cascade,
  candidate_id uuid not null references candidates (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (opening_id, candidate_id)
);

alter table openings enable row level security;
alter table opening_interests enable row level security;
revoke all on openings, opening_interests from anon, authenticated;
grant insert (company_id, title, contract, function, location, description, apply_url, apply_by, published) on openings to authenticated;
grant update (title, contract, function, location, description, apply_url, apply_by, published) on openings to authenticated;
grant delete on openings to authenticated;

drop policy if exists "admin manages openings" on openings;
create policy "admin manages openings" on openings for all to authenticated
  using (my_role() = 'admin') with check (my_role() = 'admin');
drop policy if exists "company manages own openings" on openings;
create policy "company manages own openings" on openings for all to authenticated
  using (my_role() = 'company' and company_id = my_company())
  with check (my_role() = 'company' and company_id = my_company());

create or replace function is_opening_owner(oid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(my_role() = 'admin', false)
      or exists (select 1 from openings o where o.id = oid and my_role() = 'company' and o.company_id = my_company())
$$;

-- Students: published openings. Companies: their own. Admins: all.
create or replace function list_openings() returns table (
  id uuid, company_id uuid, company_name text, title text, contract text, function text, location text,
  description text, apply_url text, apply_by date, published boolean, created_at timestamptz,
  interested int, is_interested boolean, is_mine boolean
) language sql stable security definer set search_path = public as $$
  select o.id, o.company_id, co.name, o.title, o.contract, o.function, o.location, o.description, o.apply_url,
    o.apply_by, o.published, o.created_at,
    case when is_opening_owner(o.id) then (
      select count(*)::int from opening_interests i where i.opening_id = o.id and is_visible(i.candidate_id)) end,
    exists (select 1 from opening_interests i where i.opening_id = o.id and i.candidate_id = my_candidate()),
    is_opening_owner(o.id)
  from openings o join companies co on co.id = o.company_id
  where is_opening_owner(o.id) or (my_role() = 'student' and o.published)
  order by o.created_at desc
$$;

create or replace function set_opening_interest(oid uuid, interested boolean) returns void
language plpgsql security definer set search_path = public as $$
declare cid uuid := my_candidate();
begin
  if cid is null then raise exception 'Only students can show interest'; end if;
  if not interested then
    delete from opening_interests where opening_id = oid and candidate_id = cid;
    return;
  end if;
  if not exists (select 1 from openings where id = oid and published) then raise exception 'This opening is closed'; end if;
  if not is_visible(cid) then
    raise exception 'Your profile must be verified and shared with companies first (My profile).';
  end if;
  insert into opening_interests (opening_id, candidate_id) values (oid, cid) on conflict do nothing;
end $$;

create or replace function opening_interested(oid uuid) returns table (
  candidate_id uuid, name text, school text, programme text, graduation_year int, interested_at timestamptz
) language plpgsql stable security definer set search_path = public as $$
begin
  if not is_opening_owner(oid) then raise exception 'Only the company can see who is interested'; end if;
  return query
    select c.id, trim(c.first_name || ' ' || c.last_name), c.school, c.programme, c.graduation_year, i.created_at
    from opening_interests i join candidates c on c.id = i.candidate_id
    where i.opening_id = oid and is_visible(c.id) order by i.created_at;
end $$;

revoke execute on function is_opening_owner(uuid), list_openings(), set_opening_interest(uuid, boolean), opening_interested(uuid) from public;
grant execute on function is_opening_owner(uuid), list_openings(), set_opening_interest(uuid, boolean), opening_interested(uuid) to authenticated;
