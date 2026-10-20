import { Link } from 'react-router-dom';
import { CompanyShell } from './CompanyShell';
import { CandidateTable } from '../../components/CandidateTable';
import { db } from '../../lib/db';
import { useDbQuery } from '../../lib/useDb';
import { useSession } from '../../App';

export default function CompanyShortlist() {
  const companyId = useSession()!.companyId!;
  const { data: all = [] } = useDbQuery(() => db.listVisibleCandidates());
  const { data: shortlist = [] } = useDbQuery(() => db.listShortlist(companyId), [companyId]);
  const rows = all.filter((c) => shortlist.includes(c.id));
  return (
    <CompanyShell>
      <div className="mx-auto flex max-w-page flex-col gap-5 px-4 py-9 md:px-10">
        <div className="flex flex-col gap-1">
          <h1 className="m-0 font-display text-[40px] font-normal tracking-display">Shortlist</h1>
          <div className="text-[15px] text-muted">Shared with everyone on your company’s team.</div>
        </div>
        {rows.length ? (
          <CandidateTable rows={rows} shortlisted={shortlist} onToggle={(id) => db.toggleShortlist(companyId, id)} />
        ) : (
          <div className="card flex flex-col items-start gap-3 p-7">
            <p className="m-0 text-base text-muted">Your shortlist is empty. Use the star on a candidate to add them here.</p>
            <Link to="/company/candidates" className="btn-primary">Browse candidates</Link>
          </div>
        )}
      </div>
    </CompanyShell>
  );
}
