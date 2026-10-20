import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Logo } from './Logo';
import { db } from '../lib/db';

export interface Tab { to: string; label: string; end?: boolean }

/** Top bar for signed-in areas. Student & admin = white, company = ink. */
export function AppShell({ variant, tabs, who, badge, children }: {
  variant: 'light' | 'ink'; tabs: Tab[]; who?: string; badge?: string; children: ReactNode;
}) {
  const navigate = useNavigate();
  const ink = variant === 'ink';
  const signOut = async () => {
    await db.signOut();
    navigate('/');
  };
  return (
    <div className="flex min-h-full flex-col">
      <header className={`border-b ${ink ? 'on-ink border-ink bg-ink text-offwhite' : 'border-line bg-surface'}`}>
        <div className="flex h-[72px] items-center gap-4 px-4 md:gap-8 md:px-10">
          <Logo dark={ink} />
          {badge && <span className="rounded-md bg-ink px-2.5 py-1 text-xs font-bold uppercase tracking-[0.06em] text-offwhite">{badge}</span>}
          <nav aria-label="Sections" className="hidden h-full flex-1 gap-1 text-[15px] font-semibold xl:flex">
            <Tabs tabs={tabs} ink={ink} />
          </nav>
          <div className="ml-auto flex items-center gap-4 xl:ml-0">
            {who && <span className={`hidden whitespace-nowrap text-sm md:inline ${ink ? 'text-ink-muted' : 'text-muted'}`}>{who}</span>}
            <button type="button" onClick={signOut}
              className={`min-h-[44px] whitespace-nowrap rounded-full border px-4 text-sm font-semibold ${ink ? 'border-ink-border text-offwhite hover:border-offwhite' : 'border-line-strong text-ink hover:border-ink'}`}>
              Sign out
            </button>
          </div>
        </div>
        <nav aria-label="Sections" className="flex h-12 gap-1 overflow-x-auto px-2 text-[15px] font-semibold xl:hidden">
          <Tabs tabs={tabs} ink={ink} />
        </nav>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}

function Tabs({ tabs, ink }: { tabs: Tab[]; ink: boolean }) {
  return (
    <>
      {tabs.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.end}
          className={({ isActive }) =>
            `flex shrink-0 items-center whitespace-nowrap border-b-2 px-4 no-underline ${
              isActive
                ? ink ? 'border-orange text-offwhite hover:text-offwhite' : 'border-ink text-ink hover:text-ink'
                : ink ? 'border-transparent text-ink-muted hover:text-offwhite' : 'border-transparent text-muted hover:text-ink'
            }`
          }>
          {t.label}
        </NavLink>
      ))}
    </>
  );
}
