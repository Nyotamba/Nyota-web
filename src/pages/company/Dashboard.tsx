import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { CompanyShell } from './CompanyShell';
import { TalentPool } from '../../components/TalentPool';
import { CompanyInsights } from './DashboardInsights';
import { db } from '../../lib/db';
import { useDbQuery } from '../../lib/useDb';
import { useSession } from '../../App';

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

/** The company's own activity at the fair, then the anonymous talent pool it can recruit from. */
export function CompanyDashboardBody({ companyId }: { companyId: string }) {
  const { data: d, error } = useDbQuery(() => db.getCompanyDashboard(companyId), [companyId]);
  const { data: company } = useDbQuery(() => db.getCompany(companyId), [companyId]);
  const admin = useSession()?.role === 'admin';
  const { data: pool } = useDbQuery(() => (company?.premium || admin ? db.getCompanyTalentPool() : Promise.resolve(null)), [company?.premium, admin]);

  return (
    <>
      <div className="mx-auto flex max-w-page flex-col gap-8 px-4 py-10 md:px-10">
        <div className="flex flex-col gap-1">
          <h1 className="m-0 font-display text-[40px] tracking-display">Dashboard</h1>
          <div className="text-[15px] text-muted">Your activity at the fair, and the profiles you can recruit from.</div>
        </div>
        {error && <p className="card m-0 p-6 text-danger">The dashboard could not load: {error.message}</p>}
        {!d && !error && <p className="text-muted">Loading figures…</p>}
        {d && (
          <>
            <section aria-label="Key figures" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Tile label="Verified profiles" value={d.visibleCandidates} sub="students you can see and contact"
                action={<Link to="/company/candidates" className="text-sm font-semibold">Browse</Link>} />
              <Tile label="Interested in your roles" value={d.interestedPeople}
                sub={`${d.interested} interest${d.interested === 1 ? '' : 's'} across ${d.openings} opening${d.openings === 1 ? '' : 's'}`}
                action={<Link to="/company/candidates?view=interested" className="text-sm font-semibold">See them</Link>} />
              <Tile label="Shortlisted" value={d.shortlisted} sub={`${d.profilesOpened} profiles opened · ${d.cvViews} CV views`}
                action={<Link to="/company/candidates?view=shortlist" className="text-sm font-semibold">Open shortlist</Link>} />
              <Tile label="Interviews booked" value={d.slotsBooked}
                sub={`${d.slots} slot${d.slots === 1 ? '' : 's'} offered · ${d.interviewRequests} request${d.interviewRequests === 1 ? '' : 's'} sent`}
                action={<Link to="/company/meetings" className="text-sm font-semibold">Manage slots</Link>} />
            </section>

            <section aria-labelledby="funnel-title" className="card flex flex-col gap-4 p-6">
              <h2 id="funnel-title" className="m-0 text-lg font-bold">From profile to interview</h2>
              <Funnel steps={[
                ['Verified profiles', d.visibleCandidates],
                ['Interested in your roles', d.interestedPeople],
                ['Shortlisted', d.shortlisted],
                ['Interview requests', d.interviewRequests],
                ['Interviews booked', d.slotsBooked],
              ]} />
            </section>

            <section aria-labelledby="sessions-title" className="card flex flex-col gap-3 p-6">
              <h2 id="sessions-title" className="m-0 text-lg font-bold">Your sessions</h2>
              {d.sessions === 0 ? (
                <p className="m-0 text-[15px] text-muted">The club has not scheduled a session with you yet.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-3">
                  <Stat label="Sessions" value={d.sessions} />
                  <Stat label="Registered" value={d.registered} />
                  <Stat label="Attended" value={d.attended} sub={d.registered ? `${pct(d.attended, d.registered)}% of registered` : undefined} />
                </div>
              )}
            </section>
          </>
        )}
        {company?.premium || admin ? (
          <>
            <CompanyInsights companyId={companyId} />
            {pool && <TalentPool rows={pool} forCompany />}
          </>
        ) : company && <PremiumTeaser />}
      </div>
    </>
  );
}

function Tile({ label, value, sub, action }: { label: string; value: number; sub: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col gap-1.5 p-5">
      <span className="text-sm font-semibold text-muted">{label}</span>
      <span className="font-display text-[44px] leading-none tabular-nums">{value}</span>
      <span className="text-[13px] text-muted">{sub}</span>
      {action && <span className="mt-1">{action}</span>}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-offwhite p-4">
      <span className="text-[13px] font-semibold text-muted">{label}</span>
      <span className="font-display text-[32px] leading-none tabular-nums">{value}</span>
      {sub && <span className="text-[12px] text-muted">{sub}</span>}
    </div>
  );
}

function Funnel({ steps }: { steps: [string, number][] }) {
  const top = Math.max(1, steps[0][1]);
  return (
    <ol className="m-0 flex list-none flex-col gap-2 p-0">
      {steps.map(([label, n]) => (
        <li key={label} className="grid grid-cols-[180px_1fr_48px] items-center gap-3 text-sm">
          <span className="font-semibold">{label}</span>
          <span className="h-3 overflow-hidden rounded-full bg-offwhite">
            <span className="block h-full rounded-full bg-green" style={{ width: `${Math.max(n ? 2 : 0, (n / top) * 100)}%` }} />
          </span>
          <span className="text-right font-bold tabular-nums">{n}</span>
        </li>
      ))}
    </ol>
  );
}

export default function CompanyDashboard() {
  const companyId = useSession()!.companyId!;
  return <CompanyShell><CompanyDashboardBody companyId={companyId} /></CompanyShell>;
}

/** What Nyota Premium adds, shown to companies that do not have it. */
function PremiumTeaser() {
  const items = [
    ['How you compare', 'Your figures against the average company and your sector.'],
    ['Matching profiles you missed', 'Verified students with the skills of your openings that you have not opened yet.'],
    ['Who is interested in you', 'The roles, experience, countries and schools of the students who like your offers.'],
    ['Your response time', 'How fast you answer interested students, and who is still waiting.'],
    ['Talent pool', 'The whole verified pool in charts and on the map: backgrounds, countries, target roles.'],
  ];
  return (
    <section className="card flex flex-col gap-5 border-2 border-dashed border-line-strong p-6 md:p-8">
      <div className="flex flex-col gap-1">
        <span className="overline">Nyota Premium</span>
        <h2 className="m-0 font-display text-[30px] tracking-display">Recruit faster with your insights</h2>
        <p className="m-0 max-w-[70ch] text-[15px] text-muted">Available for partner companies of the fair. Ask the club to switch it on for your team.</p>
      </div>
      <ul className="m-0 grid list-none gap-3 p-0 md:grid-cols-2">
        {items.map(([t, d]) => (
          <li key={t} className="flex flex-col gap-1 rounded-xl bg-offwhite p-4">
            <span className="flex items-center gap-2 font-bold"><span aria-hidden="true">🔒</span>{t}</span>
            <span className="text-sm text-muted">{d}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
