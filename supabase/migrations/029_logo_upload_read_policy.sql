-- 029 — Logo uploads were refused: storage must be able to read back the file it has just written,
-- and admins and companies had no read rule on the logos bucket. Safe to run again.

drop policy if exists "admin reads logos" on storage.objects;
create policy "admin reads logos" on storage.objects for select to authenticated
  using (bucket_id = 'logos' and public.my_role() = 'admin');

drop policy if exists "company reads own logo" on storage.objects;
create policy "company reads own logo" on storage.objects for select to authenticated
  using (bucket_id = 'logos' and public.my_role() = 'company' and name like 'company/' || public.my_company()::text || '-%');
