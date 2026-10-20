import type { ReactNode } from 'react';
import { AppShell } from '../../components/AppShell';
import { useSession } from '../../App';

export function AdminShell({ children }: { children: ReactNode }) {
  const tabs = [
    { to: '/admin', label: 'Verification', end: true },
    { to: '/admin/candidates', label: 'Candidates' },
    { to: '/admin/sessions', label: 'Sessions' },
    { to: '/admin/companies', label: 'Companies' },
    { to: '/admin/lists', label: 'Lists' },
    { to: '/admin/dashboard', label: 'Dashboard' },
    { to: '/admin/admins', label: 'Admins' },
    ...(useSession()?.isOwner ? [{ to: '/admin/settings', label: 'Settings' }] : []),
  ];
  return <AppShell variant="light" badge={useSession()?.isOwner ? 'Owner' : 'Admin'} tabs={tabs}>{children}</AppShell>;
}
