# Nyota — web app

React + TypeScript + Tailwind, built from the mockups in `../design/` (see `../DESIGN.md`).

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/
```

## Screens

| Route | Who | Mockup |
|---|---|---|
| `/` | everyone | Main |
| `/sign-in` | everyone | — (magic link + demo accounts) |
| `/student/profile`, `/student/preview` | student | Student-Profile, Candidate-Detail |
| `/company/candidates`, `/company/candidates/:id`, `/company/shortlist` | company | Company-Candidates, Candidate-Detail |
| `/admin`, `/admin/review/:id` | club admin | Admin |

Openings, meetings, slots and dashboards are placeholders for a later phase.
Routing uses `#/…` URLs by default; set `VITE_ROUTER=browser` when the host rewrites every path to `index.html`.

## Database

All reads and writes go through one interface, `NyotaDb` in `src/lib/db/types.ts`.
Today it is implemented by `src/lib/db/demoAdapter.ts`, which keeps demo data in the browser
(each visitor has their own copy; "Reset demo data" restores it).

To connect the real database:

1. Create a Supabase project (PostgreSQL), run `supabase/schema.sql`, then `supabase/seed.sql` for test data.
2. Create a private storage bucket `cvs` for the PDFs (served through signed URLs that expire after 300 s).
3. Write `src/lib/db/supabaseAdapter.ts` implementing `NyotaDb` with `@supabase/supabase-js`
   (magic-link sign-in = `auth.signInWithOtp`), and export it from `src/lib/db/index.ts`.
   No page needs to change.

Row-level security in `schema.sql` enforces the privacy rules: companies only read candidates with an
active consent, a CV and club verification; withdrawing consent removes verification and shortlists.

## Placeholders

`src/config/constants.ts` holds the values still to be decided (`[FORUM DATE]`, `[VENUE]`, `[YEAR]`,
`[club e-mail]`, `[X]` months, `[CONSENT TEXT v1]`). Replace them there only, with the approved values.
