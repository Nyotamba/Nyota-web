# Nyota — the IESE Africa Business Club career fair platform

Nyota connects MBA students with companies hiring for Africa: verified student profiles and CVs, company pages,
openings, virtual sessions with automatic attendance, 1:1 interviews, and dashboards for the club, companies and students.

This README is written for **the next team running Nyota**. Read sections 1 to 4 before your first fair.

- Live site: https://nyota-mba.vercel.app (target domain: nyota.mba, see section 6)
- Code: https://github.com/Nyotamba/Nyota-web
- Club account for every service: **nyotamba2027@gmail.com** (the Nyota Gmail, see section 2)

---

## 1. How it works, in one picture

```
Browser (React app)  ──►  Supabase (database, sign-in, file storage, e-mail functions)
        ▲
        └── Vercel hosts the site and rebuilds it on every push to GitHub (branch main)
```

| Piece | What it does | Where |
|---|---|---|
| **Front end** | React 18 + TypeScript + Tailwind (Vite). All pages. | `src/` |
| **Database** | PostgreSQL on Supabase. Privacy rules live **in the database** (row-level security), not only in the pages. | `supabase/schema.sql` + `supabase/migrations/` |
| **Sign-in** | Supabase Auth: password, e-mail links, access codes for companies and admins. | Supabase → Authentication |
| **Files** | CVs (private, links expire after 5 min) and logos (public). | Supabase → Storage (`cvs`, `logos`) |
| **E-mails** | Edge functions send access codes through the Nyota Gmail. | `supabase/functions/` |
| **Hosting** | Vercel builds `npm run build` and serves `dist/`. | Vercel project `nyota-mba` |

The pages never talk to Supabase directly: everything goes through one interface, `NyotaDb`
(`src/lib/db/types.ts`), with two implementations:

- `supabaseAdapter.ts`: the live site;
- `demoAdapter.ts`: a demo with sample data kept in the browser (used by the Claude preview and by the admin
  "Preview with sample data" buttons).

When you add a feature, add it to the interface, then to **both** adapters.

---

## 2. Accounts: who owns what

Everything should belong to the **club** (the Nyota Gmail), with **at least two people** able to log in.
Never leave a service on one student's personal address: when they graduate, the club loses it.

| Service | What for | Owner account | Second admin | Notes |
|---|---|---|---|---|
| Nyota Gmail `nyotamba2027@gmail.com` | Sends access codes, owns the other accounts | club | | 2-step verification on: keep the recovery phone and codes in the club's password manager. The "app password" used by Supabase is in Supabase secrets. |
| GitHub org **Nyotamba** | The code | `nyotamba2027-stack` (club) | `Sirdec973` (2026–27 team) | Organisation owners can add people. Repository `Nyota-web`. |
| Supabase org **Nyotamba**, project “Nyota Website” `zucuuwsisyyixjamtpep` | Database, sign-in, files, e-mail functions | nyotamba2027@gmail.com (club) | 2026–27 team | Free plan. Invite people under Organization → Team. |
| Vercel project `nyota-mba` | Hosting, auto-deploy from GitHub | _fill in_ | | Free (Hobby) plan = one owner. Do not pick Pro. |
| Namecheap | Domain `nyota.mba` | _fill in_ | | Renew every year. See section 6. |

**Never put a password, API key or the Supabase "service role" key in the code or in this README.**
The publishable key in Vercel (`VITE_SUPABASE_PUBLISHABLE_KEY`) is public by design.

### Hand over at the end of your year

1. Add the new team as owners on GitHub, Supabase and Vercel (or transfer Vercel to their account).
2. In Nyota: Admin → Admins → add them as **owners** (keep at least two owners).
3. Give them the Nyota Gmail password and the 2-step recovery codes, then change the password.
4. Remove yourself last.

---

## 3. Run it on your computer

Needs Node.js 20+.

```bash
npm install
npm run dev              # http://localhost:5173 (demo data unless .env.local is set)
npm run build            # what Vercel runs: type-check + build into dist/
npm run build:artifact   # single-file demo (dist-artifact/nyota.html), no server needed
```

To work against the live database, create `.env.local` (never commit it) from `.env.example`:

```
VITE_SUPABASE_URL=https://zucuuwsisyyixjamtpep.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…   (Supabase → Project settings → API keys)
```

### Put a change online

```bash
git add -A && git commit -m "What changed and why"
git push origin main     # Vercel rebuilds and publishes in about a minute
```

If the Vercel build fails, the previous version stays online. Read the error in Vercel → Deployments.

---

## 4. Changing the database

Database changes are numbered files in `supabase/migrations/` (`002_…` to `025_…` today). Each one is written to be
safe to run again. **The history is tracked by Supabase**, so you always know what is applied:

```bash
npx supabase login                                   # once, opens the browser
npx supabase link --project-ref zucuuwsisyyixjamtpep # once per computer
npx supabase migration list --linked                 # what is applied (local vs remote)
```

To add a change:

1. Create the next file, e.g. `supabase/migrations/026_short_name.sql`.
2. Apply it: `npx supabase db push --linked` (applies only the files not yet applied).
3. Then deploy the code that uses it. **Database first, code second**, or the live site breaks.

Rules that keep the platform legal and safe (see `../DESIGN.md` and the privacy notice):

- Companies only ever see candidates that are **verified + consented + have a CV** (`is_visible()`).
- Gender is optional, admin-only, aggregate only. Nyota never stores nationality, origin, religion or health.
- Admin insights show **anonymous totals**, never "company X looked at student Y". Activity is deleted after 12 months.
- New tables: enable row-level security and add policies in the same file.

### E-mail functions

```bash
npx supabase functions deploy send-access-code --project-ref zucuuwsisyyixjamtpep --use-api
```

Secrets (Supabase → Edge Functions → Secrets): `GMAIL_USER`, `GMAIL_APP_PASSWORD`
(or `BREVO_API_KEY` + `SENDER_EMAIL`). The others (`SUPABASE_URL`, …) are provided by Supabase.

---

## 5. What admins can do without code

Admin area (sign in with an admin account):

| Tab | Use it to |
|---|---|
| Verification | Check and verify student profiles (a CV is required). |
| Candidates | All students; open, edit a profile (not consent, CV or gender). |
| Sessions | Create sessions, paste the Teams link; attendance is counted by the Nyota room. |
| Companies | Invite company members (access codes by e-mail), logos, **Premium** switch, "Open company space" to edit a company. |
| Dashboard | Overview, Follow-up (who to nudge), Talent pool, Market insights. |
| Admins | Add admins and owners (owners only). |
| Settings | Lists (schools, roles, sectors, languages) and, for owners, the site texts, dates and consent text. |

"Preview with sample data" shows the student or company side without changing account.

**Nyota Premium**: the advanced company insights (benchmark, matching profiles not opened, talent pool) only show
for companies with the Premium switch on. This is enforced in the database (migration 025).

---

## 6. Every year: checklist

**Before the fair**

- [ ] Settings → Site settings: fair dates, year, venue, club e-mail, homepage text.
- [ ] Consent text: if it changes, give it a **new version** (v2, v3…). Have it approved by the DPO.
- [ ] Settings → Lists: schools, roles, sectors, languages.
- [ ] Invite companies (Companies), ask them to fill in their **Profile** (sector, countries and roles they hire for):
      the insights depend on it.
- [ ] Create sessions with their Teams links. Check with IESE IT: guests without an account, participant limit,
      attendance reports.
- [ ] Test the full journey with three accounts: one student, one company, one admin.

**After the fair**

- [ ] Remind companies to tick "Offer made" / "Hired" on candidate pages: it gives the result for sponsors.
- [ ] Export what you need (registrant CSVs, dashboard screenshots).
- [ ] Delete personal data after the period promised on the homepage (Settings → retention months).
      `supabase/maintenance/remove_demo_data.sql` shows how test data is removed; deleting real profiles must follow
      the privacy notice. Ask before running anything you do not understand.

---

## 7. Map of the code

```
src/
  App.tsx                 routes and sign-in guards
  pages/student/          My profile, Companies, Sessions (+ agenda, live room), Interviews, Openings, Account
  pages/company/          Profile, Dashboard, Sessions & interviews, Openings, Candidates
  pages/admin/            Verification, Candidates, Sessions, Companies (+ company space), Dashboard, Admins, Settings
  components/             shared pieces (cards, tables, map, talent pool, agenda…)
  lib/db/                 NyotaDb interface + Supabase and demo implementations, demo seed data
  lib/                    time (Barcelona), calendar files, preview mode, settings
  config/constants.ts     default texts and lists (overridden by Settings)
supabase/
  schema.sql              the base database (first install)
  migrations/             every change since, in order
  functions/              e-mail sending (Deno)
  email-templates/        sign-in e-mails to paste in Supabase → Authentication → Templates
```

Brand: IESE Africa Business Club brand book (colours and fonts in `tailwind.config.ts`; logo in `components/Logo.tsx`).

---

## 8. If something breaks

| Symptom | Look at |
|---|---|
| Site does not update | Vercel → Deployments: last build red? Read the log. |
| "Could not load…" messages | Supabase → Logs (API / Postgres). Often: code deployed before its migration. |
| Access-code e-mails not arriving | Supabase → Edge Functions → `send-access-code` logs. Gmail app password revoked? |
| Nobody can sign in | Supabase → Authentication → URL configuration: Site URL and redirect URLs must include the live domain. |

Keep this README up to date when you change how things work.
