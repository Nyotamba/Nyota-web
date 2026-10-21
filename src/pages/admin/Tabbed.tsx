import { useSearchParams } from 'react-router-dom';
import { AdminShell } from './AdminShell';
import AdminDashboard from './Dashboard';
import AdminInsights from './Insights';
import AdminLists from './Lists';
import OwnerSettings from './Settings';
import { useSession } from '../../App';

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

/** Admin → Dashboard: the figures, then who attracts whom (Insights). */
export function AdminDashboardTabs() {
  const [params] = useSearchParams();
  const view = params.get('view') === 'insights' ? 'insights' : 'overview';
  return (
    <AdminShell>
      <SubTabs tabs={[['overview', 'Overview'], ['insights', 'Insights']]} current={view} />
      {view === 'insights' ? <AdminInsights embedded /> : <AdminDashboard embedded />}
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
