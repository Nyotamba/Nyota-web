import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { db, type Candidate, type InsightSignal } from '../../lib/db';
import { useDbQuery } from '../../lib/useDb';
import { fullName, isVisible } from '../../lib/candidate';
import { parseCountries } from '../../components/TalentPool';
import { fairDay } from '../../lib/time';

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);
const dayKey = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });
const dayLabel = (key: string) => new Date(`${key}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

/* ---------- Overview: pilot the event ---------- */

/** 1 · From verified profile to job: where candidates stop. 8 · what came of the fair. */
export function ReachAndOutcomes() {
  const { data: cands } = useDbQuery(() => db.listAllCandidates());
  const { data: reach } = useDbQuery(() => db.getCandidateReach());
  if (!cands || !reach) return null;
  const visible = new Set(cands.filter(isVisible).map((c) => c.id));
  const r = reach.filter((x) => visible.has(x.candidateId));
  const steps: [string, number][] = [
    ['Verified and shared', r.length],
    ['Opened by a company', r.filter((x) => x.profileViews + x.cvViews > 0).length],
    ['Shortlisted', r.filter((x) => x.shortlists > 0).length],
    ['Interview requested', r.filter((x) => x.requests > 0).length],
    ['Offer or hire', r.filter((x) => x.outcome).length],
  ];
  const offers = reach.filter((x) => x.outcome === 'offer').length;
  const hires = reach.filter((x) => x.outcome === 'hired').length;
  return (
    <div className="grid gap-6 xl:grid-cols-12">
      <section className="card flex flex-col gap-4 p-6 xl:col-span-8">
        <div className="flex flex-col gap-1">
          <h2 className="m-0 text-lg font-bold">From verified profile to job</h2>
          <p className="m-0 text-sm text-muted">Each step as a share of the previous one: where candidates stop.</p>
        </div>
        <ol className="m-0 flex list-none flex-col gap-2 p-0">
          {steps.map(([label, n], i) => (
            <li key={label} className="grid grid-cols-[170px_1fr_90px] items-center gap-3 text-sm">
              <span className="font-semibold">{label}</span>
              <span className="h-3 overflow-hidden rounded-full bg-offwhite">
                <span className="block h-full rounded-full bg-green" style={{ width: `${pct(n, steps[0][1] || 1)}%` }} />
              </span>
              <span className="text-right tabular-nums"><strong>{n}</strong>{i > 0 && <span className="text-muted"> · {steps[i - 1][1] ? `${pct(n, steps[i - 1][1])}%` : '—'}</span>}</span>
            </li>
          ))}
        </ol>
      </section>
      <section className="card flex flex-col gap-3 p-6 xl:col-span-4">
        <h2 className="m-0 text-lg font-bold">Outcomes</h2>
        <div className="grid grid-cols-2 gap-3">
          <Big label="Offers made" value={offers} />
          <Big label="Hired" value={hires} />
        </div>
        <p className="m-0 text-[13px] leading-relaxed text-muted">
          Companies tick “Offer made” or “Hired” on a candidate’s page after the fair. Remind them in the closing e-mail: it is the
          number sponsors ask for.
        </p>
      </section>
    </div>
  );
}

/** 4 · Activity day by day (companies and students). */
export function DailyActivity({ signals }: { signals: InsightSignal[] }) {
  const days = new Map<string, { c: number; s: number }>();
  for (const x of signals) {
    const k = dayKey(x.at);
    const d = days.get(k) ?? { c: 0, s: 0 };
    if (x.direction === 'candidate_to_company') d.s++;
    else d.c++;
    days.set(k, d);
  }
  const rows = [...days.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-21);
  const max = Math.max(1, ...rows.map(([, d]) => d.c + d.s));
  return (
    <section className="card flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <h2 className="m-0 text-lg font-bold">Activity day by day</h2>
          <p className="m-0 text-sm text-muted">Last 21 active days. Spot which day or session drives activity.</p>
        </div>
        <span className="flex items-center gap-3 text-[12px] text-muted">
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-ink" />Companies</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-orange" />Students</span>
        </span>
      </div>
      {rows.length === 0 ? <p className="m-0 text-sm text-muted">No activity yet.</p> : (
        <div className="flex h-44 items-end gap-1.5 overflow-x-auto" role="img" aria-label="Activity per day">
          {rows.map(([k, d]) => (
            <div key={k} className="flex min-w-[34px] flex-1 flex-col items-center gap-1" title={`${dayLabel(k)}: ${d.c} company actions, ${d.s} student actions`}>
              <span className="text-[11px] font-bold tabular-nums">{d.c + d.s}</span>
              <div className="flex w-full flex-col justify-end overflow-hidden rounded-t" style={{ height: `${Math.max(4, ((d.c + d.s) / max) * 120)}px` }}>
                <span className="block bg-orange" style={{ height: `${pct(d.s, d.c + d.s)}%` }} />
                <span className="block flex-1 bg-ink" />
              </div>
              <span className="whitespace-nowrap text-[10px] text-muted">{dayLabel(k).replace(/^\w+ /, '')}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/** 5 · Attendance per session, by format and by time. */
export function SessionAttendance() {
  const { data: sessions } = useDbQuery(() => db.listSessions());
  if (!sessions) return null;
  const past = sessions.filter((s) => Date.parse(s.startsAt) < Date.now() && s.registered > 0);
  const byKind = new Map<string, { r: number; a: number }>();
  past.forEach((s) => {
    const k = byKind.get(s.kind) ?? { r: 0, a: 0 };
    k.r += s.registered;
    k.a += s.attended ?? 0;
    byKind.set(s.kind, k);
  });
  return (
    <section className="card flex flex-col gap-4 p-6">
      <div className="flex flex-col gap-1">
        <h2 className="m-0 text-lg font-bold">Session attendance</h2>
        <p className="m-0 text-sm text-muted">Registered against present, counted by the Nyota room. Which formats and time slots work.</p>
      </div>
      {past.length === 0 ? <p className="m-0 text-sm text-muted">No session has taken place yet.</p> : (
        <>
          <div className="flex flex-wrap gap-2">
            {[...byKind.entries()].map(([k, v]) => (
              <span key={k} className="rounded-full bg-offwhite px-3 py-1.5 text-sm"><strong>{k}</strong> · {pct(v.a, v.r)}% attend</span>
            ))}
          </div>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-[12px] uppercase tracking-overline text-muted">
                <th className="pb-2 font-semibold">Session</th><th className="pb-2 font-semibold">When</th>
                <th className="pb-2 text-right font-semibold">Registered</th><th className="pb-2 text-right font-semibold">Present</th><th className="pb-2 text-right font-semibold">Rate</th>
              </tr>
            </thead>
            <tbody>
              {past.sort((a, b) => pct(b.attended ?? 0, b.registered) - pct(a.attended ?? 0, a.registered)).map((s) => (
                <tr key={s.id} className="border-t border-line-soft">
                  <td className="py-2 pr-2"><span className="font-semibold">{s.title}</span> <span className="text-muted">· {s.kind}</span></td>
                  <td className="py-2 pr-2 text-muted">{fairDay(s.startsAt)}</td>
                  <td className="py-2 text-right tabular-nums">{s.registered}</td>
                  <td className="py-2 text-right tabular-nums">{s.attended ?? 0}</td>
                  <td className="py-2 text-right font-bold tabular-nums">{pct(s.attended ?? 0, s.registered)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}

/* ---------- Follow-up: what to act on now ---------- */

/** 3 · Companies that do nothing, 2 · verified profiles nobody opened. */
export function FollowUp() {
  const { data: activity } = useDbQuery(() => db.getCompanyActivity());
  const { data: companies } = useDbQuery(() => db.listCompanies());
  const { data: cands } = useDbQuery(() => db.listAllCandidates());
  const { data: reach } = useDbQuery(() => db.getCandidateReach());
  const name = (id: string) => companies?.find((c) => c.id === id)?.name ?? '—';
  const rows = (activity ?? []).map((a) => {
    const actions = a.profileViews + a.cvViews + a.shortlists + a.requests + a.openings;
    const issue = a.signedIn === 0 ? 'Nobody signed in' : actions === 0 ? 'Signed in, did nothing' : a.openings === 0 ? 'No opening posted' : a.slots === 0 ? 'No interview slot' : null;
    return { ...a, actions, issue };
  }).sort((a, b) => a.actions - b.actions);
  const reachBy = new Map((reach ?? []).map((r) => [r.candidateId, r]));
  const unseen = (cands ?? []).filter((c) => isVisible(c) && !((reachBy.get(c.id)?.profileViews ?? 0) + (reachBy.get(c.id)?.cvViews ?? 0)));

  return (
    <div className="mx-auto flex max-w-page flex-col gap-8 px-4 py-10 md:px-10">
      <div className="flex flex-col gap-1">
        <h1 className="m-0 font-display text-[34px] tracking-display md:text-[40px]">Follow-up</h1>
        <div className="text-[15px] text-muted">Who to nudge now: companies that are not active, and verified profiles nobody has opened.</div>
      </div>
      <section className="flex flex-col gap-3">
        <h2 className="m-0 text-lg font-bold">Companies · {rows.filter((r) => r.issue).length} to follow up</h2>
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[820px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-[12px] uppercase tracking-overline text-muted">
                <th className="px-5 py-3 font-semibold">Company</th><th className="px-3 py-3 font-semibold">To do</th>
                <th className="px-3 py-3 text-right font-semibold">Signed in</th><th className="px-3 py-3 text-right font-semibold">Profiles opened</th>
                <th className="px-3 py-3 text-right font-semibold">Shortlist</th><th className="px-3 py-3 text-right font-semibold">Requests</th>
                <th className="px-3 py-3 text-right font-semibold">Openings</th><th className="px-3 py-3 text-right font-semibold">Hires</th>
                <th className="px-5 py-3 font-semibold">Last active</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.companyId} className="border-t border-line-soft">
                  <td className="px-5 py-3"><Link to={`/admin/companies/${r.companyId}`} className="font-semibold">{name(r.companyId)}</Link></td>
                  <td className="px-3 py-3">{r.issue ? <span className="rounded-full bg-sand px-2.5 py-1 text-[12px] font-bold">{r.issue}</span> : <span className="text-[12px] font-semibold text-green">Active</span>}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{r.signedIn}/{r.members}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{r.profileViews}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{r.shortlists}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{r.requests}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{r.openings}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{r.hires + r.offers}</td>
                  <td className="px-5 py-3 text-muted">{r.lastActivity ? fairDay(r.lastActivity) : 'Never'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="m-0 text-lg font-bold">Verified profiles nobody opened · {unseen.length}</h2>
          <p className="m-0 text-sm text-muted">Help them: a clearer story, another target role, or point a matching company to them.</p>
        </div>
        {unseen.length === 0 ? <p className="card m-0 p-6 text-[15px] text-muted">Every verified profile has been opened at least once.</p> : (
          <ul className="m-0 grid list-none gap-3 p-0 md:grid-cols-2">
            {unseen.map((c) => <UnseenRow key={c.id} c={c} />)}
          </ul>
        )}
      </section>
    </div>
  );
}

function UnseenRow({ c }: { c: Candidate }) {
  const tips = [
    !c.story && 'no story',
    !c.jobTitle && 'no current role',
    c.yearsExperience === null && 'experience missing',
    !c.workedCountries && 'no country worked in',
    c.functions.length === 0 && 'no target role',
  ].filter(Boolean);
  return (
    <li className="card flex flex-col gap-1.5 p-4 text-sm">
      <span className="flex flex-wrap items-center gap-2">
        <Link to={`/admin/review/${c.id}`} className="font-semibold">{fullName(c)}</Link>
        <span className="text-muted">{c.school} · {c.functions.join(', ') || '—'}</span>
      </span>
      {tips.length > 0 && <span className="text-[13px] text-danger">Weak spots: {tips.join(', ')}</span>}
    </li>
  );
}

/* ---------- Market: demand against supply ---------- */

/** 6 · What companies ask for vs what the pool offers. 7 · countries hired for vs countries students want. */
export function DemandSupply({ signals }: { signals: InsightSignal[] }) {
  const { data: pool = [] } = useDbQuery(() => db.getTalentPool());
  const { data: companies = [] } = useDbQuery(() => db.listFairCompanies());
  const { data: openings = [] } = useDbQuery(() => db.listOpenings());
  const visible = pool.filter((r) => r.visible);
  // Demand: searches using a value + openings asking for it + companies hiring for it.
  const demand = new Map<string, number>();
  const add = (v: string | null | undefined, n = 1) => v && demand.set(v, (demand.get(v) ?? 0) + n);
  signals.filter((s) => s.direction === 'search').forEach((s) => {
    const d = s.detail as { functions?: string[]; sector?: string; language?: string };
    (d.functions ?? []).forEach((f) => add(f));
    add(d.sector);
    add(d.language);
  });
  openings.forEach((o) => o.skills.forEach((k) => add(k)));
  companies.forEach((c) => c.hiringFor.forEach((f) => add(f)));
  const supply = (v: string) => visible.filter((r) => [...r.functions, ...r.sectors, ...r.pastSectors, ...r.languages].includes(v)).length;
  const rows = [...demand.entries()].map(([v, n]) => ({ v, n, s: supply(v) })).sort((a, b) => b.n / Math.max(1, b.s) - a.n / Math.max(1, a.s));

  const hireCountries = new Map<string, number>();
  companies.forEach((c) => parseCountries(c.hiringCountries).forEach((k) => hireCountries.set(k, (hireCountries.get(k) ?? 0) + 1)));
  const countryRows = [...hireCountries.entries()].map(([k, n]) => ({
    k, n,
    want: pool.filter((r) => parseCountries(r.countries).includes(k)).length,
    worked: pool.filter((r) => parseCountries(r.workedCountries).includes(k)).length,
  })).sort((a, b) => b.n - a.n);

  return (
    <div className="grid items-start gap-4 xl:grid-cols-2">
      <section className="card flex flex-col gap-3 p-5">
        <div className="flex flex-col gap-1">
          <h3 className="m-0 text-base font-bold">Demand vs supply of skills</h3>
          <p className="m-0 text-[13px] text-muted">Demand = searches, openings and roles companies hire for. Supply = verified profiles with it. Top = hardest to find.</p>
        </div>
        {rows.length === 0 ? <p className="m-0 text-sm text-muted">No demand recorded yet.</p> : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-[12px] uppercase tracking-overline text-muted">
                <th className="pb-2 font-semibold">Skill</th><th className="pb-2 text-right font-semibold">Asked</th><th className="pb-2 text-right font-semibold">Profiles</th><th className="pb-2 text-right font-semibold">Gap</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 12).map((r) => {
                const ratio = r.n / Math.max(1, r.s);
                return (
                  <tr key={r.v} className="border-t border-line-soft">
                    <td className="py-2 font-semibold">{r.v}</td>
                    <td className="py-2 text-right tabular-nums">{r.n}</td>
                    <td className={`py-2 text-right tabular-nums ${r.s === 0 ? 'font-bold text-danger' : ''}`}>{r.s}</td>
                    <td className="py-2 text-right">
                      <span className={`rounded-full px-2 py-0.5 text-[12px] font-bold ${r.s === 0 ? 'bg-danger text-white' : ratio >= 1 ? 'bg-sand text-ink' : 'bg-offwhite text-muted'}`}>
                        {r.s === 0 ? 'None' : ratio >= 1 ? 'Short' : 'OK'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
      <section className="card flex flex-col gap-3 p-5">
        <div className="flex flex-col gap-1">
          <h3 className="m-0 text-base font-bold">Countries: hired for vs wanted by students</h3>
          <p className="m-0 text-[13px] text-muted">Countries companies hire for, against students who want to work there or already have. Low numbers = recruit students with ties there, or invite companies from the countries students want.</p>
        </div>
        {countryRows.length === 0 ? <p className="m-0 text-sm text-muted">Companies have not filled in the countries they hire for yet.</p> : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-[12px] uppercase tracking-overline text-muted">
                <th className="pb-2 font-semibold">Country</th><th className="pb-2 text-right font-semibold">Companies</th><th className="pb-2 text-right font-semibold">Want to go</th><th className="pb-2 text-right font-semibold">Worked there</th>
              </tr>
            </thead>
            <tbody>
              {countryRows.map((r) => (
                <tr key={r.k} className="border-t border-line-soft">
                  <td className="py-2 font-semibold">{r.k}</td>
                  <td className="py-2 text-right tabular-nums">{r.n}</td>
                  <td className={`py-2 text-right tabular-nums ${r.want === 0 ? 'font-bold text-danger' : ''}`}>{r.want}</td>
                  <td className="py-2 text-right tabular-nums">{r.worked}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <WantedNotHired pool={pool} hired={new Set(hireCountries.keys())} />
      </section>
    </div>
  );
}

function WantedNotHired({ pool, hired }: { pool: { countries: string }[]; hired: Set<string> }) {
  const m = new Map<string, number>();
  pool.forEach((r) => parseCountries(r.countries).forEach((k) => !hired.has(k) && m.set(k, (m.get(k) ?? 0) + 1)));
  const top = [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (top.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5 border-t border-line-soft pt-3">
      <span className="text-[12px] font-semibold uppercase tracking-overline text-muted">Wanted by students, no company hiring there</span>
      <div className="flex flex-wrap gap-1.5">
        {top.map(([k, n]) => <span key={k} className="rounded-full bg-offwhite px-2.5 py-1 text-[13px] font-semibold">{k} <span className="text-muted">· {n}</span></span>)}
      </div>
    </div>
  );
}

function Big({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-offwhite p-4">
      <span className="text-[13px] font-semibold text-muted">{label}</span>
      <span className="font-display text-[36px] leading-none tabular-nums">{value}</span>
    </div>
  );
}
