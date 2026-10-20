import { Link, useNavigate, useParams } from 'react-router-dom';
import { AdminShell } from './AdminShell';
import { CandidateProfile } from '../../components/CandidateProfile';
import { ChevronLeft } from '../../components/icons';
import { db } from '../../lib/db';
import { useDbQuery } from '../../lib/useDb';

export default function AdminReview() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: c } = useDbQuery(() => db.getCandidate(id), [id]);
  const back = <Link to="/admin" className="flex items-center gap-1.5 self-start text-sm font-semibold no-underline"><ChevronLeft size={16} />Back to verification</Link>;
  return (
    <AdminShell>
      {c ? (
        <CandidateProfile c={c} top={back} actions={
          !c.verifiedAt && (
            <button type="button" disabled={!c.cv || !c.consent} onClick={async () => { await db.verifyCandidates([c.id]); navigate('/admin'); }}
              className="btn rounded-xl bg-green px-5 text-[15px] text-white hover:bg-[#053129] disabled:bg-line disabled:text-muted">
              {c.cv ? 'Verify this profile' : 'A CV is required before verification'}
            </button>
          )
        } />
      ) : c === null ? <div className="p-10">{back}<p className="text-muted">Profile not found.</p></div> : null}
    </AdminShell>
  );
}
