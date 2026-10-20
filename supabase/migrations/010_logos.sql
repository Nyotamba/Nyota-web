-- 010 — Logos for companies and schools, uploaded by admins, optionally shown on the homepage.
-- Run once in Supabase → SQL Editor, AFTER 008 (schools). Safe to run again.
-- Brand book K1–K3, K7: use only logo files supplied or approved by the organisation, and confirm every
-- partner in writing before showing it, so "show on homepage" is off until an admin switches it on.

alter table companies add column if not exists logo_url text;
alter table companies add column if not exists show_on_site boolean not null default false;
alter table schools add column if not exists logo_url text;
alter table schools add column if not exists show_on_site boolean not null default false;

grant update (logo_url, show_on_site) on schools to authenticated;
drop policy if exists "admin updates schools" on schools;
create policy "admin updates schools" on schools for update to authenticated
  using (my_role() = 'admin') with check (my_role() = 'admin');

-- Public bucket (logos are public by nature), PNG / JPEG / WebP only (no SVG: it can carry scripts), 1 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', true, 1048576, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "admin uploads logos" on storage.objects;
create policy "admin uploads logos" on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and public.my_role() = 'admin');
drop policy if exists "admin replaces logos" on storage.objects;
create policy "admin replaces logos" on storage.objects for update to authenticated
  using (bucket_id = 'logos' and public.my_role() = 'admin');
drop policy if exists "admin deletes logos" on storage.objects;
create policy "admin deletes logos" on storage.objects for delete to authenticated
  using (bucket_id = 'logos' and public.my_role() = 'admin');

-- Homepage strips: only organisations an admin chose to show, with a logo.
create or replace function public_partners() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'companies', coalesce((select jsonb_agg(jsonb_build_object('name', name, 'logoUrl', logo_url) order by name)
                           from companies where show_on_site and logo_url is not null), '[]'::jsonb),
    'schools', coalesce((select jsonb_agg(jsonb_build_object('name', name, 'logoUrl', logo_url) order by name)
                         from schools where show_on_site and logo_url is not null), '[]'::jsonb)
  )
$$;
revoke execute on function public_partners() from public;
grant execute on function public_partners() to anon, authenticated;
