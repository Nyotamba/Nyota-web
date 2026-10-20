import { Link } from 'react-router-dom';
import { StudentShell } from './StudentShell';
import { CandidateProfile } from '../../components/CandidateProfile';
import { ChevronLeft } from '../../components/icons';
import { db } from '../../lib/db';
import { useDbQuery } from '../../lib/useDb';
import { useSession } from '../../App';

export default function StudentPreview() {
  const session = useSession();
  const { data: c } = useDbQuery(() => db.getCandidate(session!.candidateId!), [session?.candidateId]);
  return (
    <StudentShell>
      <div className="border-b border-line bg-sand px-4 py-3 text-center text-sm font-semibold text-ink md:px-10">
        Preview: this is what invited companies see once your profile is verified.
      </div>
      {c && (
        <CandidateProfile c={c} top={
          <Link to="/student/profile" className="flex items-center gap-1.5 self-start text-sm font-semibold no-underline"><ChevronLeft size={16} />Back to my profile</Link>
        } />
      )}
    </StudentShell>
  );
}
