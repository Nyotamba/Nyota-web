import type { ReactNode } from 'react';
import { AppShell } from '../../components/AppShell';
import { useSession } from '../../App';
import { startPreview } from '../../lib/preview';

export function AdminShell({ children }: { children: ReactNode }) {
  const tabs = [
    { to: '/admin', label: 'Verification', end: true },
    { to: '/admin/candidates', label: 'Candidates' },
    { to: '/admin/sessions', label: 'Sessions' },
    { to: '/admin/companies', label: 'Companies' },
    { to: '/admin/dashboard', label: 'Dashboard' },
    { to: '/admin/admins', label: 'Admins' },
    { to: '/admin/settings', label: 'Settings' },
  ];
  return (
    <AppShell variant="light" badge={useSession()?.isOwner ? 'Owner' : 'Admin'} tabs={tabs}>
      <div className="border-b border-line bg-offwhite">
        <div className="mx-auto flex max-w-page flex-wrap items-center gap-2 px-4 py-2 text-sm md:px-10">
          <span className="mr-1 text-muted">Preview with sample data:</span>
          <button type="button" className="btn-small text-[13px]" onClick={() => startPreview('student')}>Student side</button>
          <button type="button" className="btn-small text-[13px]" onClick={() => startPreview('company')}>Company side</button>
        </div>
      </div>
      {children}
    </AppShell>
  );
}
