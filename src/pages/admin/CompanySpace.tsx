import { Link, useParams, useSearchParams } from 'react-router-dom';
import { AdminShell } from './AdminShell';
import { ChevronLeft } from '../../components/icons';
import { CompanyProfileEditor } from '../company/CompanyPage';
import { CompanyDashboardBody } from '../company/Dashboard';
import { OpeningsManager } from '../company/Openings';
import { db } from '../../lib/db';
import { useDbQuery } from '../../lib/useDb';

type Tab = 'profile' | 'dashboard' | 'openings';
const TABS: [Tab, string][] = [['profile', 'Profile'], ['dashboard', 'Dashboard'], ['openings', 'Openings']];

/** Admin: one company's space, with the same pages the company sees, editable by the club. */
export default function AdminCompanySpace() {
  const { id = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = (TABS.find(([t]) => t === params.get('tab'))?.[0] ?? 'profile') as Tab;
  const { data: company } = useDbQuery(() => db.getCompany(id), [id]);

  return (
    <AdminShell>
      <div className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-page flex-wrap items-center gap-x-6 gap-y-3 px-4 pt-6 md:px-10">
          <Link to="/admin/companies" className="flex w-full items-center gap-1.5 text-sm font-semibold no-underline"><ChevronLeft size={16} />All companies</Link>
          <span className="font-display text-[28px] leading-none tracking-display">{company?.name ?? '…'}</span>
          <span className="rounded-md bg-sand px-2 py-1 text-[12px] font-bold uppercase tracking-[0.06em]">Admin view · you can edit</span>
          <nav aria-label="Company sections" className="flex w-full gap-1 text-[15px] font-semibold">
            {TABS.map(([t, label]) => (
              <button key={t} type="button" aria-current={tab === t ? 'page' : undefined} onClick={() => setParams({ tab: t }, { replace: true })}
                className={`border-b-2 px-4 py-3 ${tab === t ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink'}`}>
                {label}
              </button>
            ))}
            <Link to="/admin/sessions" className="ml-auto self-center text-sm font-semibold">Sessions are managed in Sessions →</Link>
          </nav>
        </div>
      </div>
      {company === null && <p className="p-10 text-muted">Company not found.</p>}
      {company && tab === 'profile' && <CompanyProfileEditor companyId={id} />}
      {company && tab === 'dashboard' && <CompanyDashboardBody companyId={id} />}
      {company && tab === 'openings' && <OpeningsManager companyId={id} />}
    </AdminShell>
  );
}
