import { useMemo, useState } from 'react';
import { Notice } from '../../components/Notice';
import { useSession } from '../../App';
import { Link } from 'react-router-dom';
import { AdminShell } from './AdminShell';
import { Badge } from '../../components/Badge';
import { db, type Candidate } from '../../lib/db';
import { useDbQuery } from '../../lib/useDb';
import { experienceLine, formatDate, fullName, isProfileComplete, isVisible, shortSchool } from '../../lib/candidate';

type Status = 'incomplete' | 'not-shared' | 'waiting' | 'visible';
const STATUS: Record<Status, { label: string; tone: 'neutral' | 'orange' | 'green' }> = {
  incomplete: { label: 'Profile incomplete', tone: 'neutral' },
  'not-shared': { label: 'No consent yet', tone: 'neutral' },
  waiting: { label: 'Waiting for verification', tone: 'orange' },
  visible: { label: 'Visible to companies', tone: 'green' },
};
const statusOf = (c: Candidate): Status =>
  isVisible(c) ? 'visible' : c.consent && !c.verifiedAt ? 'waiting' : !isProfileComplete(c) ? 'incomplete' : 'not-shared';

/** Every student who signed up, whatever their status. */
export default function AdminCandidates() {
  const { data: all, error } = useDbQuery(() => db.listAllCandidates());
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<Status | ''>('');
  const isOwner = Boolean(useSession()?.isOwner);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ msg: string; tone?: 'green' | 'danger' } | null>(null);
  const remove = async (c: Candidate) => {
    try {
      await db.deleteCandidate(c.id);
      setNotice({ msg: `${fullName(c) || 'The student'} and their CV were deleted` });
    } catch (err) {
      setNotice({ msg: (err as Error).message, tone: 'danger' });
    } finally {
      setConfirm(null);
    }
  };
  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    (all ?? []).forEach((c) => (m[statusOf(c)] = (m[statusOf(c)] ?? 0) + 1));
    return m;
  }, [all]);
  const query = q.trim().toLowerCase();
  const list = (all ?? []).filter(
    (c) =>
      (!status || statusOf(c) === status) &&
      (!query || [fullName(c), c.school, c.jobTitle, c.employer, c.countries].join(' ').toLowerCase().includes(query)),
  );

  return (
    <AdminShell>
      <div className="mx-auto flex max-w-page flex-col gap-5 px-4 py-10 md:px-10">
        <div className="flex flex-col gap-1">
          <h1 className="m-0 font-display text-[34px] tracking-display md:text-[40px]">Candidates</h1>
          <div className="text-[15px] text-muted">
            Every student who signed up ({all?.length ?? 0}). Companies only see the ones marked “Visible to companies”.
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="label min-w-[220px] flex-1" htmlFor="ac-q">Search
            <input id="ac-q" type="search" className="field text-[15px]" placeholder="Name, school, role, country"
              value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <label className="label" htmlFor="ac-status">Status
            <select id="ac-status" className="field min-h-[44px] text-[15px]" value={status} onChange={(e) => setStatus(e.target.value as Status | '')}>
              <option value="">All ({all?.length ?? 0})</option>
              {(Object.keys(STATUS) as Status[]).map((s) => <option key={s} value={s}>{STATUS[s].label} ({counts[s] ?? 0})</option>)}
            </select>
          </label>
        </div>
        {error && <p className="card m-0 p-6 text-danger">The list could not load: {error.message}</p>}
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-bold uppercase tracking-[0.06em] text-muted">
                <th scope="col" className="px-5 py-3.5">Student</th>
                <th scope="col" className="px-5 py-3.5">School · class</th>
                <th scope="col" className="px-5 py-3.5">Experience</th>
                <th scope="col" className="px-5 py-3.5">Status</th>
                <th scope="col" className="px-5 py-3.5">Updated</th>
                <th scope="col" className="px-5 py-3.5"><span className="sr-only">Open</span></th>
              </tr>
            </thead>
            <tbody>
              {all && list.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-muted">{all.length ? 'No student matches.' : 'No student has signed up yet.'}</td></tr>
              )}
              {list.map((c) => {
                const st = STATUS[statusOf(c)];
                return (
                  <tr key={c.id} className="border-b border-line-soft last:border-b-0">
                    <th scope="row" className="px-5 py-3.5 text-left font-semibold">{fullName(c) || 'Name not filled in'}</th>
                    <td className="px-5 py-3.5">{c.school ? shortSchool(c.school) : '—'}{c.graduationYear ? ` · ${c.graduationYear}` : ''}</td>
                    <td className="px-5 py-3.5 text-muted">{experienceLine(c) || '—'}</td>
                    <td className="px-5 py-3.5"><Badge tone={st.tone}>{st.label}</Badge></td>
                    <td className="px-5 py-3.5 tabular-nums text-muted">{formatDate(c.updatedAt, { day: 'numeric', month: 'short' })}</td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="inline-flex flex-wrap justify-end gap-2">
                        <Link to={`/admin/review/${c.id}`} className="btn-small text-[13px]">Open</Link>
                        {isOwner && (confirm === c.id ? (
                          <>
                            <button type="button" className="btn-small border-danger text-[13px] text-danger hover:border-danger hover:text-danger" onClick={() => remove(c)}>
                              Delete for good
                            </button>
                            <button type="button" className="btn-small text-[13px]" onClick={() => setConfirm(null)}>Keep</button>
                          </>
                        ) : (
                          <button type="button" className="btn-small text-[13px] text-danger hover:text-danger" onClick={() => setConfirm(c.id)}>Delete…</button>
                        ))}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <Notice message={notice?.msg ?? null} tone={notice?.tone} onDone={() => setNotice(null)} />
    </AdminShell>
  );
}
