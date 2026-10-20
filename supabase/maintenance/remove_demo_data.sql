-- Removes the fictional demo data loaded by seed.sql (fixed ids 00000000-…, .example e-mails).
-- Real sign-ups, real companies and admins are not touched. Safe to run again.
delete from candidates where id::text like '00000000-0000-0000-0000-%' and user_id is null;
delete from invitations where email like '%.example';
delete from companies where id::text like '00000000-0000-0000-0000-%';
