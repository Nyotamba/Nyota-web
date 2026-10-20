-- Fictional demo data (same as src/lib/db/seed.ts). Do not load in production.
-- Candidates are inserted without user_id; link them to auth users when testing sign-in.

insert into companies (id, name) values
  ('00000000-0000-0000-0000-0000000000a1', 'Kora Capital (demo)'),
  ('00000000-0000-0000-0000-0000000000a2', 'Sahel Grid Energy (demo)');

insert into candidates (id, email, first_name, last_name, school, graduation_year, linkedin_url, functions, sectors, regions, countries, languages, position_type, available_from, story, cv_path, cv_size_bytes, cv_uploaded_at, verified_at) values
  ('00000000-0000-0000-0000-000000000c01', 'amara.diallo@iese.net', 'Amara', 'Diallo', 'IESE Business School', 2027, 'https://www.linkedin.com/in/amara-diallo', '{Strategy,"Business development"}', '{Energy,Infrastructure}', '{West,Central}', 'Senegal, Côte d’Ivoire, Cameroon', '{English,French}', 'Full-time', '2027-07-01', 'Six years building energy infrastructure projects between Dakar and Paris. At IESE to move from delivering projects to deciding which ones get built.', 'demo/c01.pdf', 208896, '2026-09-28', null),
  ('00000000-0000-0000-0000-000000000c02', 'k.mensah@insead.example', 'Kwame', 'Mensah', 'INSEAD', 2027, '', '{Finance,Investment}', '{"Financial services"}', '{West,East}', 'Ghana, Kenya', '{English}', 'Full-time', '2027-01-01', 'Former investment banker in Accra. Looking to join a growth-stage investor focused on West and East Africa.', 'demo/c02.pdf', 180224, '2026-09-20', '2026-09-22'),
  ('00000000-0000-0000-0000-000000000c03', 'l.benali@hec.example', 'Leila', 'Benali', 'HEC Paris', 2027, '', '{Strategy,Operations}', '{"Consumer goods"}', '{West}', 'Senegal, Morocco', '{French,Arabic,English}', 'Both', '2027-06-01', 'Supply-chain lead for a consumer brand across francophone West Africa. Interested in operations roles with P&L ownership.', 'demo/c03.pdf', 202752, '2026-09-18', '2026-09-21'),
  ('00000000-0000-0000-0000-000000000c04', 't.moyo@lbs.example', 'Tendai', 'Moyo', 'London Business School', 2027, '', '{Finance,Product}', '{"Financial services"}', '{East,Southern}', 'Zimbabwe, South Africa, Kenya', '{English,French}', 'Full-time', '2027-08-01', 'Product manager at a mobile-money start-up in Harare. Wants to build payment products for the next 100 million users.', 'demo/c04.pdf', 226304, '2026-09-15', '2026-09-19'),
  ('00000000-0000-0000-0000-000000000c05', 's.okafor@esade.example', 'Sofia', 'Okafor', 'ESADE', 2027, '', '{Strategy,Marketing}', '{Healthcare}', '{West}', 'Nigeria, Ghana', '{English,French,Spanish}', 'Full-time', '2027-09-01', 'Marketing manager in pharmaceuticals in Lagos and Madrid. Focused on access to healthcare in West Africa.', 'demo/c05.pdf', 193536, '2026-09-12', '2026-09-16'),
  ('00000000-0000-0000-0000-000000000c06', 'y.tesfaye@ie.example', 'Yohannes', 'Tesfaye', 'IE Business School', 2027, '', '{Strategy,Consulting}', '{Agriculture}', '{East}', 'Ethiopia, Kenya, Tanzania', '{English,French}', 'Both', '2027-07-01', 'Consultant on agricultural value chains in the Horn of Africa. Looking for strategy roles in agribusiness.', 'demo/c06.pdf', 211968, '2026-09-10', '2026-09-14'),
  ('00000000-0000-0000-0000-000000000c07', 'n.kamara@hec.edu', 'Nadia', 'Kamara', 'HEC Paris', 2027, '', '{Finance}', '{"Financial services"}', '{West}', 'Sierra Leone, Guinea', '{English,French}', 'Internship', '2027-06-01', '', 'demo/c07.pdf', 217088, '2026-09-27', null),
  ('00000000-0000-0000-0000-000000000c08', 'isow@london.edu', 'Ibrahim', 'Sow', 'London Business School', 2027, '', '{Strategy}', '{Energy}', '{West,North}', 'Mali, Morocco', '{French,English,Arabic}', 'Full-time', '2027-07-01', '', 'demo/c08.pdf', 192512, '2026-09-27', null),
  ('00000000-0000-0000-0000-000000000c09', 'g.achieng@insead.edu', 'Grace', 'Achieng', 'INSEAD', 2026, '', '{Operations}', '{Agriculture}', '{East}', 'Kenya, Uganda', '{English,Swahili}', 'Full-time', '2027-01-01', '', null, null, null, null),
  ('00000000-0000-0000-0000-000000000c10', 'mtraore@iese.net', 'Moussa', 'Traoré', 'IESE Business School', 2027, '', '{"Business development"}', '{Infrastructure}', '{West}', 'Burkina Faso, Côte d’Ivoire', '{French,English}', 'Full-time', '2027-07-01', '', 'demo/c10.pdf', 245760, '2026-09-25', null),
  ('00000000-0000-0000-0000-000000000c11', 'c.mbeki@esade.edu', 'Chiara', 'Mbeki', 'ESADE', 2027, '', '{Marketing,Product}', '{"Consumer goods"}', '{Southern}', 'South Africa', '{English,Spanish}', 'Both', '2027-09-01', '', 'demo/c11.pdf', 200704, '2026-09-24', null);

insert into consents (candidate_id, version, given_at)
select id, 'v1', coalesce(cv_uploaded_at, '2026-09-26') from candidates;

insert into invitations (company_id, email, status, created_at) values
  ('00000000-0000-0000-0000-0000000000a1', 'j.ndiaye@kora.example', 'Accepted', '2026-09-20'),
  ('00000000-0000-0000-0000-0000000000a1', 'm.otieno@kora.example', 'Invited', '2026-09-25'),
  ('00000000-0000-0000-0000-0000000000a2', 'hr@sahelgrid.example', 'Invited', '2026-09-26');

insert into shortlists (company_id, candidate_id) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000c03'),
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000c05');
