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

/** Sub-tabs under one admin tab, kept in the URL (?view=…) so links and reloads land on the right one. */
function SubTabs<T extends string>({ tabs, current }: { tabs: [T, string][]; current: T }) {
  const [, setParams] = useSearchParams();
  return (
    <div className="border-b border-line bg-surface">
      <nav aria-label="Sub-sections" className="mx-auto flex max-w-page gap-1 overflow-x-auto px-4 text-[15px] font-semibold md:px-10">
        {tabs.map(([t, label], n) => (
          <button key={t} type="button" aria-current={current === t ? 'page' : undefined}
            onClick={() => setParams(n === 0 ? {} : { view: t }, { replace: true })}
            className={`shrink-0 border-b-2 px-4 py-3 ${current === t ? 'border-orange text-ink' : 'border-transparent text-muted hover:text-ink'}`}>
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}

type DashView = 'overview' | 'follow-up' | 'pool' | 'insights';
const DASH_TABS: [DashView, string][] = [['overview', 'Overview'], ['follow-up', 'Follow-up'], ['pool', 'Talent pool'], ['insights', 'Market insights']];

/** Admin → Dashboard: how the fair goes, who to nudge, who the students are, and who attracts whom. */
export function AdminDashboardTabs() {
  const [params] = useSearchParams();
  const view = (DASH_TABS.find(([t]) => t === params.get('view'))?.[0] ?? 'overview') as DashView;
  return (
    <AdminShell>
      <SubTabs tabs={DASH_TABS} current={view} />
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
      <SubTabs tabs={isOwner ? [['lists', 'Lists'], ['site', 'Site settings']] : [['lists', 'Lists']]} current={view} />
      {view === 'site' ? <OwnerSettings embedded /> : <AdminLists embedded />}
    </AdminShell>
  );
}
