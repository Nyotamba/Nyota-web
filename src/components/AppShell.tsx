import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from './Logo';
import { db, isPreview } from '../lib/db';
import { exitPreview } from '../lib/preview';

export interface Tab {
  to: string;
  label: string;
  end?: boolean;
  /** Sub-sections, shown under the tab while it is open. The first one is the tab's default view. */
  children?: { to: string; label: string }[];
}

/** The site's frame: a vertical menu on the left. On phones it folds behind a Menu button. */
export function SideLayout({ ink = false, badge, tabs, footer, children }: {
  ink?: boolean; badge?: string; tabs: Tab[]; footer?: ReactNode; children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { pathname, search } = useLocation();
  useEffect(() => setOpen(false), [pathname, search]);
  return (
    <div className={`flex min-h-full flex-col lg:flex-row ${isPreview ? 'pt-7' : ''}`}>
      <aside className={`z-30 flex shrink-0 flex-col border-b lg:sticky lg:top-0 lg:h-screen lg:w-[248px] lg:overflow-y-auto lg:border-b-0 lg:border-r ${ink ? 'on-ink border-ink bg-ink text-offwhite' : 'border-line bg-surface'}`}>
        <div className="flex h-[72px] shrink-0 items-center gap-3 px-4 lg:px-5">
          <Logo dark={ink} />
          {badge && <span className="rounded-md bg-ink px-2 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-offwhite">{badge}</span>}
          <button type="button" aria-expanded={open} aria-controls="site-menu" onClick={() => setOpen((v) => !v)}
            className={`ml-auto min-h-[44px] rounded-full border px-4 text-sm font-semibold lg:hidden ${ink ? 'border-ink-border text-offwhite' : 'border-line-strong text-ink'}`}>
            {open ? 'Close' : 'Menu'}
          </button>
        </div>
        <div id="site-menu" className={`${open ? 'flex' : 'hidden'} flex-1 flex-col gap-6 px-3 pb-5 lg:flex`}>
          <nav aria-label="Main" className="flex flex-col gap-1">
            {tabs.map((t) => <MenuItem key={t.to} tab={t} ink={ink} />)}
          </nav>
          {footer && <div className="mt-auto flex flex-col gap-2 px-2 text-sm">{footer}</div>}
        </div>
      </aside>
      <main className={`min-w-0 flex-1 ${isPreview ? 'pb-24' : ''}`}>{children}</main>
    </div>
  );
}

function MenuItem({ tab, ink }: { tab: Tab; ink: boolean }) {
  const { pathname, search } = useLocation();
  const base = 'flex min-h-[44px] items-center rounded-lg px-3 text-[15px] font-semibold no-underline';
  const on = ink ? 'bg-orange text-ink hover:text-ink' : 'bg-ink text-offwhite hover:text-offwhite';
  const off = ink ? 'text-ink-muted hover:bg-ink-line hover:text-offwhite' : 'text-muted hover:bg-offwhite hover:text-ink';
  const inside = pathname === tab.to || pathname.startsWith(`${tab.to}/`);
  return (
    <>
      <NavLink to={tab.to} end={tab.end} className={({ isActive }) => `${base} ${isActive ? on : off}`}>{tab.label}</NavLink>
      {inside && tab.children && tab.children.length > 1 && (
        <div className="ml-3 flex flex-col gap-0.5 border-l border-line py-1 pl-2">
          {tab.children.map((c, n) => {
            const active = `${pathname}${search}` === c.to || (n === 0 && pathname === c.to.split('?')[0] && !search);
            return (
              <Link key={c.to} to={c.to} aria-current={active ? 'page' : undefined}
                className={`flex min-h-[38px] items-center rounded-md px-2.5 text-sm font-semibold no-underline ${active ? 'bg-sand text-ink hover:text-ink' : 'text-muted hover:text-ink'}`}>
                {c.label}
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}

/** Signed-in areas. Student and admin = light menu, company = ink. */
export function AppShell({ variant, tabs, who, badge, extra, children }: {
  variant: 'light' | 'ink'; tabs: Tab[]; who?: string; badge?: string; extra?: ReactNode; children: ReactNode;
}) {
  const navigate = useNavigate();
  const ink = variant === 'ink';
  const signOut = async () => {
    if (isPreview) return exitPreview();
    await db.signOut();
    navigate('/');
  };
  return (
    <SideLayout ink={ink} badge={badge} tabs={tabs} footer={
      <>
        {extra}
        {who && <span className={`truncate text-[13px] ${ink ? 'text-ink-muted' : 'text-muted'}`} title={who}>{who}</span>}
        <button type="button" onClick={signOut}
          className={`min-h-[44px] rounded-full border px-4 text-sm font-semibold ${ink ? 'border-ink-border text-offwhite hover:border-offwhite' : 'border-line-strong text-ink hover:border-ink'}`}>
          Sign out
        </button>
      </>
    }>
      {children}
    </SideLayout>
  );
}
