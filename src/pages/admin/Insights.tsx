import { useMemo, useState, type ReactNode } from 'react';
import { AdminShell } from './AdminShell';
import { db, type InsightSignal, type TalentRow } from '../../lib/db';
import { useDbQuery } from '../../lib/useDb';

// How much each action says about real interest.
const COMPANY_WEIGHT: Partial<Record<InsightSignal['kind'], number>> = { profile_view: 1, cv_view: 2, shortlist: 3, interview_request: 5 };
const STUDENT_WEIGHT: Partial<Record<InsightSignal['kind'], number>> = { company_click: 1, session_register: 2, opening_interest: 3, session_attend: 3 };
const expBucket = (y: number | null) => (y === null ? 'Not answered' : y <= 2 ? '0–2 years' : y <= 5 ? '3–5 years' : y <= 9 ? '6–9 years' : '10+ years');

type Dim = { key: string; label: string; of: (r: { functions: string[]; pastSectors: string[]; school: string | null; yearsExperience: number | null; languages: string[] }) => string[] };
const DIMS: Dim[] = [
  { key: 'functions', label: 'Target role', of: (r) => r.functions },
  { key: 'past', label: 'Past sector', of: (r) => r.pastSectors },
  { key: 'exp', label: 'Experience', of: (r) => [expBucket(r.yearsExperience)] },
  { key: 'lang', label: 'Language', of: (r) => r.languages },
  { key: 'school', label: 'School', of: (r) => [r.school || 'Not answered'] },
];

function weighted(list: InsightSignal[], weights: Partial<Record<InsightSignal['kind'], number>>, of: (s: InsightSignal) => string[]) {
  const m = new Map<string, number>();
  let total = 0;
  for (const s of list) {
    const w = weights[s.kind] ?? 0;
    for (const v of of(s)) m.set(v, (m.get(v) ?? 0) + w);
    total += w;
  }
  return { m, total };
}

/** Admin: who attracts whom, and why. Anonymous aggregates of the last 12 months. */
export default function AdminInsights() {
  const { data: signals, error } = useDbQuery(() => db.getInsightSignals());
  const { data: pool = [] } = useDbQuery(() => db.getTalentPool());
  const [company, setCompany] = useState('');
  const companies = useMemo(() => [...new Set((signals ?? []).map((s) => s.companyName).filter(Boolean) as string[])].sort(), [signals]);
  const list = (signals ?? []).filter((s) => !company || s.companyName === company);
  const c2c = list.filter((s) => s.direction === 'company_to_candidate');
  const s2c = list.filter((s) => s.direction === 'candidate_to_company');
  const searches = list.filter((s) => s.direction === 'search');
  const count = (k: InsightSignal['kind']) => list.filter((s) => s.kind === k).length;

  return (
    <AdminShell>
      <div className="mx-auto flex max-w-page flex-col gap-8 px-4 py-10 md:px-10">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-1 flex-col gap-1">
            <h1 className="m-0 font-display text-[34px] tracking-display md:text-[40px]">Insights</h1>
            <div className="max-w-[75ch] text-[15px] text-muted">
              Who attracts whom, and why: what companies look at and search for, and which companies students go to. Anonymous
              counts over the last 12 months; no name is ever shown here.
            </div>
          </div>
          <label className="label" htmlFor="in-company">Company
            <select id="in-company" className="field min-w-[220px] text-[15px]" value={company} onChange={(e) => setCompany(e.target.value)}>
              <option value="">All companies</option>
              {companies.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
        </div>
        {error && <p className="card m-0 p-6 text-danger">Insights could not load: {error.message}</p>}
        {!signals && !error && <p className="text-muted">Loading…</p>}
        {signals && (
          <>
            <section aria-label="Activity" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Tile label="Companies → profiles" value={count('profile_view')} sub={`profile views · ${count('cv_view')} CV views`} />
              <Tile label="Shortlists & requests" value={count('shortlist') + count('interview_request')} sub={`${count('shortlist')} shortlisted · ${count('interview_request')} interview requests`} />
              <Tile label="Students → companies" value={count('company_click') + count('opening_interest')} sub={`${count('opening_interest')} interests in openings · ${count('company_click')} clicks`} />
              <Tile label="Sessions" value={count('session_register')} sub={`registrations · ${count('session_attend')} attended`} />
            </section>

            <Section title="What attracts companies" sub="Weighted by action: profile view 1, CV 2, shortlist 3, interview request 5. “Attention” = share of company attention going to profiles with this value (a profile can have several). “Lift” compares it with the share of the verified pool: above 1 = more wanted than the pool offers.">
              {c2c.length === 0 ? <Empty>No company activity yet.</Empty> : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {DIMS.map((d) => <LiftTable key={d.key} dim={d} signals={c2c} pool={pool.filter((r) => r.visible)} />)}
                </div>
              )}
            </Section>

            <Section title="What companies search for" sub="Filters companies use in “Candidates”. Searches with few results point to profiles to recruit for the next edition.">
              {searches.length === 0 ? <Empty>No search yet.</Empty> : <Searches list={searches} />}
            </Section>

            <Section title="What attracts students" sub="Weighted by action: click on a company 1, session registration 2, interest in an opening 3, attended a session 3.">
              {s2c.length === 0 ? <Empty>No student activity yet.</Empty> : <StudentSide list={s2c} />}
            </Section>
          </>
        )}
      </div>
    </AdminShell>
  );
}

function LiftTable({ dim, signals, pool }: { dim: Dim; signals: InsightSignal[]; pool: TalentRow[] }) {
  const { m, total } = weighted(signals, COMPANY_WEIGHT, (s) => dim.of(s));
  const poolCount = new Map<string, number>();
  for (const r of pool) for (const v of dim.of(r)) poolCount.set(v, (poolCount.get(v) ?? 0) + 1);
  const rows = [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  return (
    <div className="card flex flex-col gap-3 p-5">
      <h3 className="m-0 text-base font-bold">{dim.label}</h3>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="text-left text-[12px] uppercase tracking-overline text-muted">
            <th className="pb-2 font-semibold">Value</th><th className="pb-2 font-semibold">Attention</th><th className="pb-2 text-right font-semibold">Pool</th><th className="pb-2 text-right font-semibold">Lift</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([v, w]) => {
            const att = total ? w / total : 0;
            const share = pool.length ? (poolCount.get(v) ?? 0) / pool.length : 0;
            const lift = share ? att / share : null;
            return (
              <tr key={v} className="border-t border-line-soft">
                <td className="py-2 pr-2 font-semibold">{v}</td>
                <td className="py-2 pr-2">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-20 overflow-hidden rounded-full bg-offwhite"><span className="block h-full bg-green" style={{ width: `${Math.round(att * 100)}%` }} /></span>
                    <span className="tabular-nums text-muted">{Math.round(att * 100)}%</span>
                  </span>
                </td>
                <td className="py-2 text-right tabular-nums text-muted">{Math.round(share * 100)}%</td>
                <td className="py-2 text-right">
                  {lift === null ? <span className="text-muted">—</span> : (
                    <span className={`rounded-full px-2 py-0.5 text-[12px] font-bold tabular-nums ${lift >= 1.2 ? 'bg-green text-white' : lift <= 0.8 ? 'bg-offwhite text-muted' : 'bg-sand text-ink'}`}>
                      ×{lift.toFixed(1)}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Searches({ list }: { list: InsightSignal[] }) {
  const tally = (vals: (string | null | undefined)[]) => {
    const m = new Map<string, number>();
    vals.filter(Boolean).forEach((v) => m.set(v as string, (m.get(v as string) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  };
  const d = list.map((s) => s.detail as { functions?: string[]; sector?: string; language?: string; minYears?: number; positionType?: string; results?: number });
  const groups: [string, [string, number][]][] = [
    ['Roles', tally(d.flatMap((x) => x.functions ?? []))],
    ['Sectors', tally(d.map((x) => x.sector))],
    ['Languages', tally(d.map((x) => x.language))],
    ['Experience', tally(d.map((x) => (x.minYears ? `${x.minYears}+ years` : null)))],
  ];
  const thin = list.filter((s) => typeof s.detail.results === 'number' && (s.detail.results as number) <= 2);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card flex flex-col gap-4 p-5">
        <h3 className="m-0 text-base font-bold">Most used filters · {list.length} searches</h3>
        {groups.map(([label, rows]) => rows.length > 0 && (
          <div key={label} className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold uppercase tracking-overline text-muted">{label}</span>
            <div className="flex flex-wrap gap-1.5">
              {rows.map(([v, n]) => <span key={v} className="rounded-full bg-offwhite px-2.5 py-1 text-[13px] font-semibold">{v} <span className="text-muted">· {n}</span></span>)}
            </div>
          </div>
        ))}
      </div>
      <div className="card flex flex-col gap-3 p-5">
        <h3 className="m-0 text-base font-bold">Searches with 2 results or fewer · {thin.length}</h3>
        <p className="m-0 text-[13px] text-muted">What companies wanted and did not find: profiles to bring to the next edition.</p>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {thin.slice(0, 10).map((s, n) => {
            const x = s.detail as { functions?: string[]; sector?: string; language?: string; minYears?: number; positionType?: string; results?: number };
            const crit = [...(x.functions ?? []), x.sector, x.language, x.minYears && `${x.minYears}+ yrs`, x.positionType !== 'Any' && x.positionType].filter(Boolean);
            return (
              <li key={n} className="flex flex-wrap items-center gap-2 border-t border-line-soft pt-2 text-sm">
                <span className="font-semibold">{s.companyName ?? 'A company'}</span>
                {crit.map((c) => <span key={String(c)} className="rounded-full border border-line-strong px-2 py-0.5 text-[12px]">{String(c)}</span>)}
                <span className={`ml-auto text-[12px] font-bold ${x.results === 0 ? 'text-danger' : 'text-muted'}`}>{x.results} result{x.results === 1 ? '' : 's'}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function StudentSide({ list }: { list: InsightSignal[] }) {
  const byCompany = new Map<string, InsightSignal[]>();
  for (const s of list) {
    const k = s.companyName ?? 'Unknown';
    byCompany.set(k, [...(byCompany.get(k) ?? []), s]);
  }
  const top = (xs: InsightSignal[], of: (s: InsightSignal) => string[]) => {
    const { m } = weighted(xs, STUDENT_WEIGHT, of);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([v]) => v);
  };
  const rows = [...byCompany.entries()]
    .map(([name, xs]) => ({ name, xs, score: xs.reduce((t, s) => t + (STUDENT_WEIGHT[s.kind] ?? 0), 0) }))
    .sort((a, b) => b.score - a.score);
  const sectors = [...new Set(list.map((s) => s.companySector || 'Not set'))];
  const roles = top(list, (s) => s.functions).concat().slice(0, 3);
  const allRoles = [...new Set(list.flatMap((s) => s.functions))].sort();
  return (
    <div className="flex flex-col gap-4">
      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-[12px] uppercase tracking-overline text-muted">
              <th className="px-5 py-3 font-semibold">Company</th><th className="px-3 py-3 text-right font-semibold">Score</th>
              <th className="px-3 py-3 text-right font-semibold">Clicks</th><th className="px-3 py-3 text-right font-semibold">Registered</th>
              <th className="px-3 py-3 text-right font-semibold">Attended</th><th className="px-3 py-3 text-right font-semibold">Interests</th>
              <th className="px-5 py-3 font-semibold">Mostly attracts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const n = (k: InsightSignal['kind']) => r.xs.filter((s) => s.kind === k).length;
              return (
                <tr key={r.name} className="border-t border-line-soft">
                  <td className="px-5 py-3 font-semibold">{r.name}</td>
                  <td className="px-3 py-3 text-right font-bold tabular-nums">{r.score}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{n('company_click')}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{n('session_register')}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{n('session_attend')}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{n('opening_interest')}</td>
                  <td className="px-5 py-3 text-muted">{[...top(r.xs, (s) => s.functions), ...top(r.xs, (s) => [s.school ?? '']).filter(Boolean).slice(0, 2)].join(' · ') || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {allRoles.length > 0 && sectors.length > 0 && (
        <div className="card flex flex-col gap-3 overflow-x-auto p-5">
          <h3 className="m-0 text-base font-bold">Which student roles go to which company sectors</h3>
          <p className="m-0 text-[13px] text-muted">Weighted student actions, by the role students target (rows) and the company’s sector (columns). Most active: {roles.join(', ') || '—'}.</p>
          <table className="border-collapse text-sm">
            <thead>
              <tr><th />{sectors.map((s) => <th key={s} className="px-3 py-2 text-left text-[12px] font-semibold text-muted">{s}</th>)}</tr>
            </thead>
            <tbody>
              {allRoles.map((role) => {
                const cells = sectors.map((sec) => weighted(list.filter((s) => (s.companySector || 'Not set') === sec && s.functions.includes(role)), STUDENT_WEIGHT, () => ['x']).total);
                const max = Math.max(1, ...cells);
                return (
                  <tr key={role}>
                    <th className="py-1 pr-3 text-left font-semibold">{role}</th>
                    {cells.map((v, n) => (
                      <td key={n} className="px-1 py-1">
                        <span className="flex h-8 min-w-[64px] items-center justify-center rounded-md text-[12px] font-bold tabular-nums"
                          style={{ background: v ? `rgba(20, 93, 54, ${0.15 + 0.85 * (v / max)})` : '#F8F7F2', color: v / max > 0.5 ? '#fff' : '#053129' }}>
                          {v || ''}
                        </span>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Section({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="m-0 font-display text-[28px] tracking-display">{title}</h2>
        <p className="m-0 max-w-[80ch] text-sm text-muted">{sub}</p>
      </div>
      {children}
    </section>
  );
}
function Tile({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="card flex flex-col gap-1.5 p-5">
      <span className="text-sm font-semibold text-muted">{label}</span>
      <span className="font-display text-[40px] leading-none tabular-nums">{value}</span>
      <span className="text-[13px] text-muted">{sub}</span>
    </div>
  );
}
const Empty = ({ children }: { children: ReactNode }) => <p className="card m-0 p-6 text-[15px] text-muted">{children}</p>;
