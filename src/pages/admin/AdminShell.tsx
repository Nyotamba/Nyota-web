import type { ReactNode } from 'react';
import { AppShell } from '../../components/AppShell';

export function AdminShell({ children }: { children: ReactNode }) {
  const tabs = [
    { to: '/admin', label: 'Verification', end: true },
    { to: '/admin/sessions', label: 'Sessions' },
    { to: '/admin/companies', label: 'Companies' },
    { to: '/admin/schools', label: 'Schools' },
    { to: '/admin/consents', label: 'Consents' },
    { to: '/admin/dashboard', label: 'Dashboard' },
    { to: '/admin/admins', label: 'Admins' },
  ];
  return <AppShell variant="light" badge="Admin" tabs={tabs}>{children}</AppShell>;
}
