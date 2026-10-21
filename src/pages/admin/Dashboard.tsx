import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { AdminShell } from './AdminShell';
import { db, type Dashboard } from '../../lib/db';
import { useDbQuery } from '../../lib/useDb';
import { TalentPool } from '../../components/TalentPool';

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

export default function AdminDashboard({ embedded = false }: { embedded?: boolean }) {
  const Wrap = embedded ? Fragment : AdminShell;
  const { data: d, error } = useDbQuery(() => db.getDashboard());
  const { data: pool, error: poolError } = useDbQuery(() => db.getTalentPool());
  return (
    <Wrap>
      <div className="mx-auto flex max-w-page flex-col gap-8 px-4 py-10 md:px-10">
        <div className="flex flex-col gap-1">
          <h1 className="m-0 font-display text-[34px] tracking-display md:text-[40px]">Dashboard</h1>
          <div className="text-[15px] text-muted">Where candidates stand, and what companies do with their profiles.</div>
        </div>
        {error && <p className="card m-0 p-6 text-danger">The dashboard could not load: {error.message}</p>}
        {!d && !error && <p className="text-muted">Loading figures…</p>}
        {d && <Body d={d} />}
        {pool && <TalentPool rows={pool} />}
        {poolError && (
          <p className="card m-0 p-6 text-[15px] text-muted">
            The talent pool needs the latest database update (SQL 009). Run it in Supabase → SQL Editor, then reload this page.
          </p>
        )}
      </div>
    </Wrap>
  );
}

function Body({ d }: { d: Dashboard }) {
  const s = d.students;
  const waitingTone = s.waiting === 0 ? 'ok' : (d.oldestWaitingDays ?? 0) > 3 ? 'late' : 'pending';
  return (
    <>
      {/* Headline figures */}
      <section aria-label="Key figures" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile label="Students signed up" value={s.signedUp} sub={`${pct(s.complete, s.signedUp)}% have a complete profile`} />
        <Tile
          label="Waiting for verification"
          value={s.waiting}
          sub={
            s.waiting === 0
              ? 'Nothing to verify'
              : `Oldest waiting ${d.oldestWaitingDays ?? 0} day${d.oldestWaitingDays === 1 ? '' : 's'}`
          }
          tone={waitingTone}
          action={s.waiting > 0 ? <Link to="/admin" className="text-sm font-semibold">Verify now</Link> : undefined}
        />
        <Tile label="Visible to companies" value={s.visible} sub={`${pct(s.visible, s.signedUp)}% of sign-ups`} />
        <Tile
          label="Companies"
          value={d.companies.total}
          sub={`${d.companies.accepted} of ${d.companies.invited} invited members signed in`}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Candidate funnel: one series, bars drawn to the same scale (sign-ups = 100%) */}
        <section className="card flex flex-col gap-5 p-6">
          <div className="flex flex-col gap-1">
            <h2 className="m-0 text-lg font-bold">Candidate pipeline</h2>
            <p className="m-0 text-sm text-muted">Each step as a share of students who signed up.</p>
          </div>
          <Funnel
            total={s.signedUp}
            steps={[
              ['Signed up', s.signedUp],
              ['Profile complete', s.complete],
              ['Complete and consent given', s.readyForReview],
              ['Verified and visible', s.visible],
            ]}
          />
          {d.activity.consentsWithdrawn > 0 && (
            <p className="m-0 text-[13px] text-muted">{d.activity.consentsWithdrawn} consent(s) withdrawn so far.</p>
          )}
        </section>

        {/* Company activity */}
        <section className="card flex flex-col gap-5 p-6">
          <div className="flex flex-col gap-1">
            <h2 className="m-0 text-lg font-bold">Company activity</h2>
            <p className="m-0 text-sm text-muted">Totals across all companies since the start.</p>
          </div>
          <dl className="m-0 grid grid-cols-3 gap-4">
            {[
              ['CVs opened', d.activity.cvViews],
              ['Shortlisted', d.activity.shortlisted],
              ['Interview requests', d.activity.interviewRequests],
            ].map(([k, v]) => (
              <div key={k as string} className="flex flex-col gap-1 rounded-xl bg-offwhite p-4">
                <dt className="text-[13px] text-muted">{k}</dt>
                <dd className="m-0 font-display text-[34px] leading-none tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="m-0 text-[13px] text-muted">
            Invitations: {d.companies.accepted} signed in out of {d.companies.invited} sent ({pct(d.companies.accepted, d.companies.invited)}%).
          </p>
        </section>
      </div>

      {/* Per company */}
      <section className="flex flex-col gap-3">
        <h2 className="m-0 text-lg font-bold">By company</h2>
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-bold uppercase tracking-[0.06em] text-muted">
                <th scope="col" className="px-5 py-3.5">Company</th>
                <th scope="col" className="px-5 py-3.5 text-right">Members signed in</th>
                <th scope="col" className="px-5 py-3.5 text-right">CVs opened</th>
                <th scope="col" className="px-5 py-3.5 text-right">Shortlisted</th>
                <th scope="col" className="px-5 py-3.5 text-right">Interview requests</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {d.perCompany.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-muted">No company yet. Invite one from the Verification tab.</td></tr>
              )}
              {d.perCompany.map((c) => (
                <tr key={c.name} className="border-b border-line-soft last:border-b-0">
                  <th scope="row" className="px-5 py-3.5 text-left font-semibold">{c.name}</th>
                  <td className="px-5 py-3.5 text-right">{c.accepted} / {c.invited}</td>
                  <td className="px-5 py-3.5 text-right">{c.cvViews}</td>
                  <td className="px-5 py-3.5 text-right">{c.shortlisted}</td>
                  <td className="px-5 py-3.5 text-right">{c.interviewRequests}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

const toneStyles = {
  ok: 'bg-green text-white',
  pending: 'bg-sand text-ink',
  late: 'bg-orange text-ink',
};
const toneLabel = { ok: 'Up to date', pending: 'To do', late: 'Overdue' };

function Tile({ label, value, sub, tone, action }: {
  label: string; value: number; sub: string; tone?: keyof typeof toneStyles; action?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col gap-2 p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold text-muted">{label}</span>
        {tone && <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${toneStyles[tone]}`}>{toneLabel[tone]}</span>}
      </div>
      <span className="font-display text-[44px] leading-none tabular-nums">{value}</span>
      <span className="text-[13px] text-muted">{sub}</span>
      {action}
    </div>
  );
}

function Funnel({ total, steps }: { total: number; steps: [string, number][] }) {
  return (
    <ol className="m-0 flex list-none flex-col gap-3 p-0">
      {steps.map(([label, n]) => {
        const share = pct(n, total);
        return (
          <li key={label} className="flex flex-col gap-1.5" title={`${label}: ${n} (${share}%)`}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-semibold">{label}</span>
              <span className="tabular-nums text-muted"><strong className="text-ink">{n}</strong> · {share}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-offwhite">
              <div className="h-full rounded-full bg-green" style={{ width: `${total ? (n / total) * 100 : 0}%` }} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
