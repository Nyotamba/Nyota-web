import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CompanyShell } from './CompanyShell';
import { CandidateProfile } from '../../components/CandidateProfile';
import { ChevronLeft, Star } from '../../components/icons';
import { Notice } from '../../components/Notice';
import { db } from '../../lib/db';
import { useDbQuery } from '../../lib/useDb';
import { useSession } from '../../App';
import { formatDate, fullName, isVisible } from '../../lib/candidate';

export default function CompanyCandidateDetail() {
  const { id = '' } = useParams();
  const companyId = useSession()!.companyId!;
  const { data: c, loading } = useDbQuery(() => db.getCandidate(id), [id]);
  const { data: shortlist = [] } = useDbQuery(() => db.listShortlist(companyId), [companyId]);
  const { data: requests = [] } = useDbQuery(() => db.listInterviewRequests(companyId), [companyId]);
  const [notice, setNotice] = useState<string | null>(null);

  const back = <Link to="/company/candidates" className="flex items-center gap-1.5 self-start text-sm font-semibold no-underline"><ChevronLeft size={16} />Back to candidates</Link>;

  if (loading) return <CompanyShell><p className="p-10 text-muted">Loading…</p></CompanyShell>;
  // Companies only ever see consented, verified profiles.
  if (!c || !isVisible(c)) {
    return (
      <CompanyShell>
        <div className="mx-auto flex max-w-page flex-col gap-4 px-4 py-10 md:px-10">
          {back}
          <p className="card m-0 max-w-[560px] p-7 text-base text-muted">This profile is not available. The candidate may have withdrawn their consent.</p>
        </div>
      </CompanyShell>
    );
  }

  const on = shortlist.includes(c.id);
  const requested = requests.find((r) => r.candidateId === c.id);
  const actions = (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2.5">
        <button type="button" aria-pressed={on} onClick={() => db.toggleShortlist(companyId, c.id)}
          className={`btn flex-1 rounded-xl border px-4 text-[15px] ${on ? 'border-ink bg-surface text-ink' : 'border-line-strong bg-surface text-ink hover:border-ink'}`}>
          <Star fill={on ? '#FD790C' : 'none'} />{on ? 'Shortlisted' : 'Shortlist'}
        </button>
        <button type="button" disabled={Boolean(requested)}
          onClick={async () => { await db.requestInterview(companyId, c.id); setNotice(`Interview request sent to ${fullName(c)}`); }}
          className="btn flex-1 rounded-xl bg-ink px-4 text-[15px] text-offwhite hover:bg-green disabled:bg-line disabled:text-muted">
          {requested ? 'Interview requested' : 'Request interview'}
        </button>
      </div>
      {requested && <p className="m-0 text-[13px] text-muted">Requested on {formatDate(requested.createdAt)}. The candidate picks an interview slot during the fair.</p>}
    </div>
  );

  return (
    <CompanyShell>
      <CandidateProfile c={c} top={back} actions={actions} onOpenCv={() => db.logCvView(companyId, c.id)} />
      <Notice message={notice} onDone={() => setNotice(null)} />
    </CompanyShell>
  );
}
