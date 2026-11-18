import { useSearchParams } from 'react-router-dom';
import { AdminShell } from './AdminShell';
import AdminDashboard from './Dashboard';
import AdminInsights from './Insights';
import AdminLists from './Lists';
import OwnerSettings from './Settings';
import { useSession } from '../../App';
import { FollowUp } from './DashboardViews';
import { TalentPool } from '../../components/TalentPool';
import { db } from '../../lib/db';
import { useDbQuery } from '../../lib/useDb';

function TalentPoolPage() {
  const { data: pool, error } = useDbQuery(() => db.getTalentPool());
  return (
    <div className="mx-auto flex max-w-page flex-col gap-8 px-4 py-10 md:px-10">
      {error && <p className="card m-0 p-6 text-danger">The talent pool could not load: {error.message}</p>}
      {pool ? <TalentPool rows={pool} /> : !error && <p className="text-muted">Loading…</p>}
    </div>
  );
}

const DASH_VIEWS = ['overview', 'follow-up', 'pool', 'insights'] as const;

/** Admin → Dashboard: how the fair goes, who to nudge, who the students are, and who attracts whom. */
export function AdminDashboardTabs() {
  const [params] = useSearchParams();
  const view = DASH_VIEWS.find((v) => v === params.get('view')) ?? 'overview';
  return (
    <AdminShell>
      {view === 'overview' && <AdminDashboard embedded />}
      {view === 'follow-up' && <FollowUp />}
      {view === 'pool' && <TalentPoolPage />}
      {view === 'insights' && <AdminInsights embedded />}
    </AdminShell>
  );
}

/** Admin → Settings: the lists every admin manages, then the site settings (owners only). */
export function AdminSettingsTabs() {
  const [params] = useSearchParams();
  const isOwner = Boolean(useSession()?.isOwner);
  const view = isOwner && params.get('view') === 'site' ? 'site' : 'lists';
  return (
    <AdminShell>
      {view === 'site' ? <OwnerSettings embedded /> : <AdminLists embedded />}
    </AdminShell>
  );
}
