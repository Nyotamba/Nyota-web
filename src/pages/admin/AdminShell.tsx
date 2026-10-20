import type { ReactNode } from 'react';
import { AppShell } from '../../components/AppShell';

export function AdminShell({ children }: { children: ReactNode }) {
  const tabs = [
    { to: '/admin', label: 'Verification', end: true },
    { to: '/admin/companies', label: 'Companies' },
    { to: '/admin/consents', label: 'Consents' },
    { to: '/admin/dashboard', label: 'Dashboard' },
  ];
  return <AppShell variant="light" badge="Admin" tabs={tabs}>{children}</AppShell>;
}
