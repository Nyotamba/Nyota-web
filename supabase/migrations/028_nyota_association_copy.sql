-- 028 — HEC Paris and INSEAD join the organising schools; the homepage presents Nyota as a student association.
-- Safe to run again.

update schools set show_on_site = true where name in ('HEC Paris', 'INSEAD');

insert into site_settings (key, value) values
  ('hero_text', 'Nyota is an association of MBA students from business schools across Europe, including {schools}. Over two days, companies hiring for Africa present their work and meet candidates.')
on conflict (key) do update set value = excluded.value, updated_at = now();
