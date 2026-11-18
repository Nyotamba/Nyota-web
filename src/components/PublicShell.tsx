import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { SideLayout, type Tab } from './AppShell';
import { useSession } from '../App';
import { useSettings } from '../lib/useSettings';
import { NYOTA_LINKEDIN } from '../config/constants';

const TABS: Tab[] = [
  { to: '/', label: 'Home', end: true },
  { to: '/students', label: 'For students' },
  { to: '/companies', label: 'For companies' },
  { to: '/sessions', label: 'Programme' },
  { to: '/privacy', label: 'Privacy notice' },
];
const SPACE = { student: '/student/profile', company: '/company/page', admin: '/admin' } as const;

/** Pages visitors see before signing in. */
export function PublicShell({ children }: { children: ReactNode }) {
  const session = useSession();
  const S = useSettings();
  return (
    <SideLayout tabs={TABS} footer={
      <>
        {session
          ? <Link to={SPACE[session.role]} className="btn-primary text-[15px]">My space</Link>
          : <Link to="/sign-in" className="btn-secondary text-[15px]">Sign in</Link>}
        <div className="flex flex-col gap-1 pt-2 text-[13px] text-muted">
          <a href={NYOTA_LINKEDIN} target="_blank" rel="noreferrer">LinkedIn</a>
          {S.instagram_url && <a href={S.instagram_url} target="_blank" rel="noreferrer">Instagram</a>}
          <a href={`mailto:${S.club_email}`} className="break-all">{S.club_email}</a>
        </div>
      </>
    }>
      {children}
    </SideLayout>
  );
}
