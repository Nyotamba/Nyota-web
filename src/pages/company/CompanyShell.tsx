import type { ReactNode } from 'react';
import { AppShell } from '../../components/AppShell';
import { useSession } from '../../App';
import { db } from '../../lib/db';
import { useDbQuery } from '../../lib/useDb';

export function CompanyShell({ children }: { children: ReactNode }) {
  const session = useSession();
  const companyId = session!.companyId!;
  const { data: company } = useDbQuery(() => db.getCompany(companyId), [companyId]);
  const { data: shortlist } = useDbQuery(() => db.listShortlist(companyId), [companyId]);
  const tabs = [
    { to: '/company/candidates', label: 'Candidates' },
    { to: '/company/shortlist', label: `Shortlist · ${shortlist?.length ?? 0}` },
    { to: '/company/meetings', label: 'Sessions & interviews' },
    { to: '/company/openings', label: 'Openings' },
    { to: '/company/dashboard', label: 'Dashboard' },
  ];
  return <AppShell variant="ink" tabs={tabs} who={company?.name}>{children}</AppShell>;
}
