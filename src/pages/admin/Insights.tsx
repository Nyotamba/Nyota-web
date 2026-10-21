import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { AdminShell } from './AdminShell';
import { db, type InsightSignal } from '../../lib/db';
import { useDbQuery } from '../../lib/useDb';
import { parseCountries } from '../../components/TalentPool';

// How much each action says about real interest.
type Weights = Partial<Record<InsightSignal['kind'], number>>;
const COMPANY_WEIGHT: Weights = { profile_view: 1, cv_view: 2, shortlist: 3, interview_request: 5 };
const STUDENT_WEIGHT: Weights = { company_click: 1, session_register: 2, opening_interest: 3, session_attend: 3 };
type Direction = 'company_to_candidate' | 'candidate_to_company';
const expBucket = (y: number | null) => (y === null ? 'Not answered' : y <= 2 ? '0–2 years' : y <= 5 ? '3–5 years' : y <= 9 ? '6–9 years' : '10+ years');

/** A candidate, read the same way from a signal and from a talent-pool row. */
type Person = { functions: string[]; pastSectors: string[]; school: string | null; yearsExperience: number | null; languages: string[]; workedCountries: string; countries?: string; targetCountries?: string };
type Dim = { key: string; label: string; of: (r: Person) => string[] };
const DIMS: Dim[] = [
  { key: 'functions', label: 'Target role', of: (r) => r.functions },
  { key: 'past', label: 'Past sector', of: (r) => r.pastSectors },
  { key: 'exp', label: 'Experience', of: (r) => [expBucket(r.yearsExperience)] },
  { key: 'lang', label: 'Language', of: (r) => r.languages },
  { key: 'school', label: 'School', of: (r) => [r.school || 'Not answered'] },
  { key: 'worked', label: 'Worked in', of: (r) => parseCountries(r.workedCountries) },
];
const targets = (r: Person) => parseCountries(r.targetCountries ?? r.countries ?? '');

/** Company traits to cross with candidate traits. */
type CTrait = { key: string; label: string; of: (s: InsightSignal) => string[] };
const CTRAITS: CTrait[] = [
  { key: 'sector', label: 'Company sector', of: (s) => [s.companySector || 'Not set'] },
  { key: 'country', label: 'Country the company hires for', of: (s) => parseCountries(s.companyCountries) },
  { key: 'role', label: 'Role the company hires for', of: (s) => s.companyHiringFor },
];

const share = (rows: Person[], of: (r: Person) => string[], v: string) =>
  rows.length ? rows.filter((r) => of(r).includes(v)).length / rows.length : 0;

/** Of the weighted attention in `list`, the share going to people with value v. */
function attention(list: InsightSignal[], w: Weights, of: (r: Person) => string[], v: string) {
  let total = 0;
  let hit = 0;
  for (const s of list) {
    const x = w[s.kind] ?? 0;
    total += x;
    if (of(s).includes(v)) hit += x;
  }
  return { att: total ? hit / total : 0, total };
}

function LiftBadge({ lift, weak = false }: { lift: number | null; weak?: boolean }) {
  if (lift === null) return <span className="text-muted">—</span>;
  const tone = weak ? 'bg-offwhite text-muted' : lift >= 1.2 ? 'bg-green text-white' : lift <= 0.8 ? 'bg-offwhite text-muted' : 'bg-sand text-ink';
  return <span className={`rounded-full px-2 py-0.5 text-[12px] font-bold tabular-nums ${tone}`}>×{lift.toFixed(1)}</span>;
}

/** Admin: who attracts whom, and why. Anonymous aggregates of the last 12 months. */
export default function AdminInsights({ embedded = false }: { embedded?: boolean }) {
  const Wrap = embedded ? Fragment : AdminShell;
  const { data: signals, error } = useDbQuery(() => db.getInsightSignals());
  const { data: poolAll = [] } = useDbQuery(() => db.getTalentPool());
  const [company, setCompany] = useState('');
  const [dir, setDir] = useState<Direction>('company_to_candidate');
  const companies = useMemo(() => [...new Set((signals ?? []).map((s) => s.companyName).filter(Boolean) as string[])].sort(), [signals]);
  const list = (signals ?? []).filter((s) => !company || s.companyName === company);
  const count = (k: InsightSignal['kind']) => list.filter((s) => s.kind === k).length;
  // Companies only see verified profiles; students of every status can act.
  const poolFor = (d: Direction): Person[] => (d === 'company_to_candidate' ? poolAll.filter((r) => r.visible) : poolAll);

  return (
    <Wrap>
      <div className="mx-auto flex max-w-page flex-col gap-8 px-4 py-10 md:px-10">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-1 flex-col gap-1">
            <h1 className="m-0 font-display text-[34px] tracking-display md:text-[40px]">Insights</h1>
            <div className="max-w-[75ch] text-[15px] text-muted">
              Who attracts whom, and why. Pick a company for its details. Anonymous counts over the last 12 months; no name is ever shown.
            </div>
          </div>
          <label className="label" htmlFor="in-company">Company
            <select id="in-company" className="field min-w-[240px] text-[15px]" value={company} onChange={(e) => setCompany(e.target.value)}>
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
            {company
              ? <CompanyDetail list={list} poolFor={poolFor} />
              : <AllCompanies list={list} poolFor={poolFor} dir={dir} setDir={setDir} />}
          </>
        )}
      </div>
    </Wrap>
  );
}

/* ---------- All companies: company traits × candidate traits ---------- */

function AllCompanies({ list, poolFor, dir, setDir }: {
  list: InsightSignal[]; poolFor: (d: Direction) => Person[]; dir: Direction; setDir: (d: Direction) => void;
}) {
  const w = dir === 'company_to_candidate' ? COMPANY_WEIGHT : STUDENT_WEIGHT;
  const sig = list.filter((s) => s.direction === dir);
  const pool = poolFor(dir);
  return (
    <>
      <Section title="Which companies go with which profiles"
        sub={dir === 'company_to_candidate'
          ? 'For each kind of company (rows), the profiles it looks at (columns). ×2.0 = twice as much attention as these profiles weigh in the verified pool. Weights: profile view 1, CV 2, shortlist 3, interview request 5.'
          : 'For each kind of company (rows), the students who go to it (columns). ×2.0 = twice as many as these students weigh in the pool. Weights: click 1, session registration 2, interest in an opening 3, attended 3.'}
        right={
          <div role="group" aria-label="Direction" className="grid grid-cols-2 overflow-hidden rounded-field border border-line-strong">
            {([['company_to_candidate', 'Companies → candidates'], ['candidate_to_company', 'Candidates → companies']] as const).map(([d, label]) => (
              <button key={d} type="button" aria-pressed={dir === d} onClick={() => setDir(d)}
                className={`min-h-[44px] px-3 text-[13px] font-semibold ${dir === d ? 'bg-ink text-offwhite' : 'bg-surface text-ink hover:bg-offwhite'}`}>{label}</button>
            ))}
          </div>
        }>
        {sig.length === 0 ? <Empty>No activity in this direction yet.</Empty> : (
          <div className="flex flex-col gap-4">
            <CountryTies sig={sig} pool={pool} w={w} />
            <div className="grid gap-4 xl:grid-cols-2">
              <Matrix title="Company sector × target role" rows={CTRAITS[0]} col={DIMS[0]} sig={sig} pool={pool} w={w} />
              <Matrix title="Company sector × past sector" rows={CTRAITS[0]} col={DIMS[1]} sig={sig} pool={pool} w={w} />
              <Matrix title="Country hired for × language" rows={CTRAITS[1]} col={DIMS[3]} sig={sig} pool={pool} w={w} />
              <Matrix title="Role hired for × experience" rows={CTRAITS[2]} col={DIMS[2]} sig={sig} pool={pool} w={w} />
            </div>
            <RoleFit sig={sig} pool={pool} w={w} />
          </div>
        )}
      </Section>
      <Section title="What companies search for" sub="Filters companies use in “Candidates”. Searches with few results point to profiles to recruit for the next edition.">
        {list.some((s) => s.direction === 'search') ? <Searches list={list.filter((s) => s.direction === 'search')} /> : <Empty>No search yet.</Empty>}
      </Section>
      <Section title="Companies students go to" sub="Weighted student actions per company, and the profiles each one mostly attracts.">
        {list.some((s) => s.direction === 'candidate_to_company') ? <Ranking list={list.filter((s) => s.direction === 'candidate_to_company')} /> : <Empty>No student activity yet.</Empty>}
      </Section>
    </>
  );
}

/** Rows: a company trait. Columns: the most frequent values of a candidate trait. Cell: lift. */
function Matrix({ title, rows, col, sig, pool, w }: { title: string; rows: CTrait; col: Dim; sig: InsightSignal[]; pool: Person[]; w: Weights }) {
  const rowVals = [...new Set(sig.flatMap(rows.of))].filter(Boolean).slice(0, 8);
  const colCount = new Map<string, number>();
  sig.forEach((s) => col.of(s).forEach((v) => colCount.set(v, (colCount.get(v) ?? 0) + (w[s.kind] ?? 0))));
  const colVals = [...colCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([v]) => v);
  if (rowVals.length === 0 || colVals.length === 0) {
    return <div className="card p-5"><h3 className="m-0 text-base font-bold">{title}</h3><p className="m-0 mt-2 text-sm text-muted">Not enough data: companies have not filled this in yet.</p></div>;
  }
  return (
    <div className="card flex flex-col gap-3 overflow-x-auto p-5">
      <h3 className="m-0 text-base font-bold">{title}</h3>
      <table className="border-collapse text-sm">
        <thead>
          <tr>
            <th />
            {colVals.map((c) => <th key={c} className="px-2 pb-2 text-left align-bottom text-[12px] font-semibold text-muted">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rowVals.map((r) => {
            const sub = sig.filter((s) => rows.of(s).includes(r));
            return (
              <tr key={r} className="border-t border-line-soft">
                <th className="py-2 pr-3 text-left font-semibold">{r}</th>
                {colVals.map((c) => {
                  const { att, total } = attention(sub, w, col.of, c);
                  const base = share(pool, col.of, c);
                  return (
                    <td key={c} className="px-2 py-2" title={`${Math.round(att * 100)}% of attention vs ${Math.round(base * 100)}% of the pool`}>
                      <LiftBadge lift={base ? att / base : null} weak={total < 3} />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="m-0 text-[12px] text-muted">Hover a cell for the shares. Grey = small numbers, read with care.</p>
    </div>
  );
}

/** Does attention go to people tied to the company's countries (worked there, want to work there)? */
function CountryTies({ sig, pool, w }: { sig: InsightSignal[]; pool: Person[]; w: Weights }) {
  const countries = [...new Set(sig.flatMap((s) => parseCountries(s.companyCountries)))].slice(0, 10);
  if (countries.length === 0) {
    return <Empty>Countries companies hire for are not filled in yet (Company → Profile). They unlock “who has worked in or wants to work in the company’s country”.</Empty>;
  }
  return (
    <div className="card overflow-x-auto p-0">
      <div className="flex flex-col gap-1 px-5 pt-5">
        <h3 className="m-0 text-base font-bold">Ties to the company’s countries</h3>
        <p className="m-0 text-[13px] text-muted">For companies hiring for each country: the share of attention on people who have worked there or want to work there, against the pool.</p>
      </div>
      <table className="mt-3 w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="text-left text-[12px] uppercase tracking-overline text-muted">
            <th className="px-5 py-2 font-semibold">Country</th>
            <th className="px-3 py-2 font-semibold">Worked there</th><th className="px-3 py-2 font-semibold">Lift</th>
            <th className="px-3 py-2 font-semibold">Want to work there</th><th className="px-3 py-2 font-semibold">Lift</th>
          </tr>
        </thead>
        <tbody>
          {countries.map((k) => {
            const sub = sig.filter((s) => parseCountries(s.companyCountries).includes(k));
            const worked = attention(sub, w, (r) => parseCountries(r.workedCountries), k);
            const want = attention(sub, w, targets, k);
            const bw = share(pool, (r) => parseCountries(r.workedCountries), k);
            const bt = share(pool, targets, k);
            return (
              <tr key={k} className="border-t border-line-soft">
                <td className="px-5 py-2 font-semibold">{k}</td>
                <td className="px-3 py-2 tabular-nums">{Math.round(worked.att * 100)}% <span className="text-muted">vs {Math.round(bw * 100)}%</span></td>
                <td className="px-3 py-2"><LiftBadge lift={bw ? worked.att / bw : null} weak={worked.total < 3} /></td>
                <td className="px-3 py-2 tabular-nums">{Math.round(want.att * 100)}% <span className="text-muted">vs {Math.round(bt * 100)}%</span></td>
                <td className="px-3 py-2"><LiftBadge lift={bt ? want.att / bt : null} weak={want.total < 3} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Do companies look at the roles they say they hire for? */
function RoleFit({ sig, pool, w }: { sig: InsightSignal[]; pool: Person[]; w: Weights }) {
  const withRoles = sig.filter((s) => s.companyHiringFor.length > 0);
  if (withRoles.length === 0) return null;
  let total = 0;
  let hit = 0;
  let base = 0;
  for (const s of withRoles) {
    const x = w[s.kind] ?? 0;
    total += x;
    if (s.functions.some((f) => s.companyHiringFor.includes(f))) hit += x;
    base += x * (pool.length ? pool.filter((r) => r.functions.some((f) => s.companyHiringFor.includes(f))).length / pool.length : 0);
  }
  const att = total ? hit / total : 0;
  const exp = total ? base / total : 0;
  return (
    <p className="card m-0 flex flex-wrap items-center gap-3 p-5 text-[15px]">
      <strong>Role fit:</strong> {Math.round(att * 100)}% of the attention goes to profiles targeting a role the company says it hires for
      <span className="text-muted">(vs {Math.round(exp * 100)}% if it were random)</span>
      <LiftBadge lift={exp ? att / exp : null} weak={total < 3} />
    </p>
  );
}

/* ---------- One company: details ---------- */

function CompanyDetail({ list, poolFor }: { list: InsightSignal[]; poolFor: (d: Direction) => Person[] }) {
  const s0 = list.find((s) => s.companyName);
  const c2c = list.filter((s) => s.direction === 'company_to_candidate');
  const s2c = list.filter((s) => s.direction === 'candidate_to_company');
  const searches = list.filter((s) => s.direction === 'search');
  const own = parseCountries(s0?.companyCountries ?? '');
  const dims: Dim[] = [
    ...DIMS,
    ...own.slice(0, 3).map((k) => ({ key: `tie-${k}`, label: `Tie to ${k}`, of: (r: Person) => [
      parseCountries(r.workedCountries).includes(k) ? 'Worked there' : targets(r).includes(k) ? 'Wants to work there' : 'No tie',
    ] })),
  ];
  return (
    <>
      <div className="card flex flex-wrap gap-x-8 gap-y-2 p-5 text-sm">
        <span><span className="text-muted">Sector</span> <strong>{s0?.companySector || '—'}</strong></span>
        <span><span className="text-muted">Size</span> <strong>{s0?.companySize || '—'}</strong></span>
        <span><span className="text-muted">Hires for</span> <strong>{s0?.companyHiringFor.join(', ') || '—'}</strong></span>
        <span><span className="text-muted">Countries</span> <strong>{own.join(', ') || '—'}</strong></span>
      </div>
      <Section title="What this company looks at" sub="Weighted by action: profile view 1, CV 2, shortlist 3, interview request 5. Lift = share of its attention vs share of the verified pool.">
        {c2c.length === 0 ? <Empty>This company has not looked at profiles yet.</Empty> : (
          <>
            <RoleFit sig={c2c} pool={poolFor('company_to_candidate')} w={COMPANY_WEIGHT} />
            <div className="grid gap-4 lg:grid-cols-2">
              {dims.map((d) => <LiftTable key={d.key} dim={d} signals={c2c} pool={poolFor('company_to_candidate')} w={COMPANY_WEIGHT} />)}
            </div>
          </>
        )}
      </Section>
      <Section title="Who comes to this company" sub="Students who clicked on it, registered for its sessions, attended, or showed interest in its openings. Lift = share of its visitors vs share of the pool.">
        {s2c.length === 0 ? <Empty>No student activity yet.</Empty> : (
          <>
            <Breakdown list={s2c} />
            <div className="grid gap-4 lg:grid-cols-2">
              {dims.map((d) => <LiftTable key={d.key} dim={d} signals={s2c} pool={poolFor('candidate_to_company')} w={STUDENT_WEIGHT} />)}
            </div>
          </>
        )}
      </Section>
      <Section title="Its searches" sub="What this company filtered on, and what it did not find.">
        {searches.length === 0 ? <Empty>No search yet.</Empty> : <Searches list={searches} />}
      </Section>
    </>
  );
}

function Breakdown({ list }: { list: InsightSignal[] }) {
  const n = (k: InsightSignal['kind']) => list.filter((s) => s.kind === k).length;
  const byItem = new Map<string, number>();
  list.forEach((s) => {
    const item = (s.detail.opening as string) ?? (s.detail.session as string);
    if (item) byItem.set(item, (byItem.get(item) ?? 0) + 1);
  });
  return (
    <div className="card flex flex-col gap-3 p-5 text-sm">
      <div className="flex flex-wrap gap-x-8 gap-y-1">
        <span><strong>{n('company_click')}</strong> <span className="text-muted">clicks</span></span>
        <span><strong>{n('session_register')}</strong> <span className="text-muted">registrations</span></span>
        <span><strong>{n('session_attend')}</strong> <span className="text-muted">attended</span></span>
        <span><strong>{n('opening_interest')}</strong> <span className="text-muted">interests in openings</span></span>
      </div>
      {byItem.size > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {[...byItem.entries()].sort((a, b) => b[1] - a[1]).map(([t, c]) => (
            <span key={t} className="rounded-full bg-offwhite px-2.5 py-1 text-[12px] font-semibold">{t} <span className="text-muted">· {c}</span></span>
          ))}
        </div>
      )}
    </div>
  );
}

function LiftTable({ dim, signals, pool, w }: { dim: Dim; signals: InsightSignal[]; pool: Person[]; w: Weights }) {
  const m = new Map<string, number>();
  signals.forEach((s) => dim.of(s).forEach((v) => m.set(v, (m.get(v) ?? 0) + (w[s.kind] ?? 0))));
  const rows = [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  if (rows.length === 0) return null;
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
          {rows.map(([v]) => {
            const { att, total } = attention(signals, w, dim.of, v);
            const base = share(pool, dim.of, v);
            return (
              <tr key={v} className="border-t border-line-soft">
                <td className="py-2 pr-2 font-semibold">{v}</td>
                <td className="py-2 pr-2">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-20 overflow-hidden rounded-full bg-offwhite"><span className="block h-full bg-green" style={{ width: `${Math.round(att * 100)}%` }} /></span>
                    <span className="tabular-nums text-muted">{Math.round(att * 100)}%</span>
                  </span>
                </td>
                <td className="py-2 text-right tabular-nums text-muted">{Math.round(base * 100)}%</td>
                <td className="py-2 text-right"><LiftBadge lift={base ? att / base : null} weak={total < 3} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Searches and ranking ---------- */

type SearchDetail = { functions?: string[]; sector?: string; language?: string; minYears?: number; positionType?: string; results?: number };

function Searches({ list }: { list: InsightSignal[] }) {
  const tally = (vals: (string | null | undefined)[]) => {
    const m = new Map<string, number>();
    vals.filter(Boolean).forEach((v) => m.set(v as string, (m.get(v as string) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  };
  const d = list.map((s) => s.detail as SearchDetail);
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
            const x = s.detail as SearchDetail;
            const crit = [...(x.functions ?? []), x.sector, x.language, x.minYears && `${x.minYears}+ yrs`, x.positionType !== 'Any' && x.positionType].filter(Boolean);
            return (
              <li key={n} className="flex flex-wrap items-center gap-2 border-t border-line-soft pt-2 text-sm">
                <span className="font-semibold">{s.companyName ?? 'A company'}</span>
                {s.companySector && <span className="text-[12px] text-muted">({s.companySector})</span>}
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

function Ranking({ list }: { list: InsightSignal[] }) {
  const byCompany = new Map<string, InsightSignal[]>();
  for (const s of list) byCompany.set(s.companyName ?? 'Unknown', [...(byCompany.get(s.companyName ?? 'Unknown') ?? []), s]);
  const top = (xs: InsightSignal[], of: (s: InsightSignal) => string[]) => {
    const m = new Map<string, number>();
    xs.forEach((s) => of(s).forEach((v) => v && m.set(v, (m.get(v) ?? 0) + (STUDENT_WEIGHT[s.kind] ?? 0))));
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([v]) => v);
  };
  const rows = [...byCompany.entries()]
    .map(([name, xs]) => ({ name, xs, score: xs.reduce((t, s) => t + (STUDENT_WEIGHT[s.kind] ?? 0), 0) }))
    .sort((a, b) => b.score - a.score);
  return (
    <div className="card overflow-x-auto p-0">
      <table className="w-full min-w-[760px] border-collapse text-sm">
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
                <td className="px-5 py-3 text-muted">{[...top(r.xs, (s) => s.functions), ...top(r.xs, (s) => s.pastSectors), ...top(r.xs, (s) => [s.school ?? ''])].join(' · ') || '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Layout bits ---------- */

function Section({ title, sub, right, children }: { title: string; sub: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-1 flex-col gap-1">
          <h2 className="m-0 font-display text-[28px] tracking-display">{title}</h2>
          <p className="m-0 max-w-[85ch] text-sm text-muted">{sub}</p>
        </div>
        {right}
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
