import type { ReactNode } from 'react';
import { AppShell } from '../../components/AppShell';
import { useSession } from '../../App';
import { startPreview } from '../../lib/preview';

export function AdminShell({ children }: { children: ReactNode }) {
  const isOwner = useSession()?.isOwner;
  const tabs = [
    { to: '/admin', label: 'Verification', end: true },
    { to: '/admin/candidates', label: 'Candidates' },
    { to: '/admin/sessions', label: 'Sessions' },
    { to: '/admin/companies', label: 'Companies' },
    { to: '/admin/dashboard', label: 'Dashboard', children: [
      { to: '/admin/dashboard', label: 'Overview' },
      { to: '/admin/dashboard?view=follow-up', label: 'Follow-up' },
      { to: '/admin/dashboard?view=pool', label: 'Talent pool' },
      { to: '/admin/dashboard?view=insights', label: 'Market insights' },
    ] },
    { to: '/admin/admins', label: 'Admins' },
    { to: '/admin/settings', label: 'Settings', children: [
      { to: '/admin/settings', label: 'Lists' },
      ...(isOwner ? [{ to: '/admin/settings?view=site', label: 'Site settings' }] : []),
    ] },
  ];
  const preview = (
    <div className="flex flex-col gap-1.5 border-b border-line-soft pb-3">
      <span className="text-[12px] text-muted">Preview with sample data</span>
      <div className="grid grid-cols-2 gap-1.5">
        <button type="button" className="btn-small px-2 text-[13px]" onClick={() => startPreview('student')}>Student</button>
        <button type="button" className="btn-small px-2 text-[13px]" onClick={() => startPreview('company')}>Company</button>
      </div>
    </div>
  );
  return <AppShell variant="light" badge={isOwner ? 'Owner' : 'Admin'} tabs={tabs} extra={preview}>{children}</AppShell>;
}
