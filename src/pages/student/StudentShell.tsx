import type { ReactNode } from 'react';
import { AppShell } from '../../components/AppShell';
import { useSession } from '../../App';

export const studentTabs = [
  { to: '/student/profile', label: 'My profile' },
  { to: '/student/openings', label: 'Openings' },
  { to: '/student/meetings', label: 'Meetings' },
  { to: '/student/account', label: 'Account' },
];

export function StudentShell({ children }: { children: ReactNode }) {
  const session = useSession();
  return <AppShell variant="light" tabs={studentTabs} who={session?.email}>{children}</AppShell>;
}
