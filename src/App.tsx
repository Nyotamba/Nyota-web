import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { BrowserRouter, HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { db, type Role, type Session } from './lib/db';
import { useDbQuery } from './lib/useDb';
import Landing from './pages/Landing';
import SignIn from './pages/SignIn';
import StudentProfile from './pages/student/Profile';
import StudentPreview from './pages/student/Preview';
import { StudentShell } from './pages/student/StudentShell';
import CompanyCandidates from './pages/company/Candidates';
import CompanyCandidateDetail from './pages/company/CandidateDetail';
import CompanyShortlist from './pages/company/Shortlist';
import { CompanyShell } from './pages/company/CompanyShell';
import Admin from './pages/admin/Admin';
import AdminReview from './pages/admin/Review';
import { AdminShell } from './pages/admin/AdminShell';
import { ComingSoon } from './pages/ComingSoon';

const SessionContext = createContext<Session | null>(null);
export const useSession = () => useContext(SessionContext);

// Hash routing works on any static host; set VITE_ROUTER=browser when the host rewrites to index.html.
const Router = import.meta.env.VITE_ROUTER === 'browser' ? BrowserRouter : HashRouter;

function Guard({ role, children }: { role: Role; children: ReactNode }) {
  const session = useSession();
  if (!session || session.role !== role) return <Navigate to={`/sign-in?as=${role}`} replace />;
  return <>{children}</>;
}

const later = 'This part of Nyota comes in a later phase. It will use the same profiles and database as the rest of the platform.';

export default function App() {
  const { data: session, loading } = useDbQuery(() => db.getSession());
  if (loading) return null;
  return (
    <SessionContext.Provider value={session ?? null}>
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/sign-in" element={<SignIn />} />

          <Route path="/student/profile" element={<Guard role="student"><StudentProfile /></Guard>} />
          <Route path="/student/preview" element={<Guard role="student"><StudentPreview /></Guard>} />
          <Route path="/student/openings" element={<Guard role="student"><StudentShell><ComingSoon title="Openings">{later}</ComingSoon></StudentShell></Guard>} />
          <Route path="/student/meetings" element={<Guard role="student"><StudentShell><ComingSoon title="Meetings">{later}</ComingSoon></StudentShell></Guard>} />
          <Route path="/student/account" element={<Guard role="student"><StudentShell><ComingSoon title="Account">{later}</ComingSoon></StudentShell></Guard>} />

          <Route path="/company/candidates" element={<Guard role="company"><CompanyCandidates /></Guard>} />
          <Route path="/company/candidates/:id" element={<Guard role="company"><CompanyCandidateDetail /></Guard>} />
          <Route path="/company/shortlist" element={<Guard role="company"><CompanyShortlist /></Guard>} />
          <Route path="/company/openings" element={<Guard role="company"><CompanyShell><ComingSoon title="Openings">{later}</ComingSoon></CompanyShell></Guard>} />
          <Route path="/company/meetings" element={<Guard role="company"><CompanyShell><ComingSoon title="Slots & meetings">{later}</ComingSoon></CompanyShell></Guard>} />
          <Route path="/company/dashboard" element={<Guard role="company"><CompanyShell><ComingSoon title="Dashboard">{later}</ComingSoon></CompanyShell></Guard>} />

          <Route path="/admin" element={<Guard role="admin"><Admin /></Guard>} />
          <Route path="/admin/review/:id" element={<Guard role="admin"><AdminReview /></Guard>} />
          <Route path="/admin/companies" element={<Guard role="admin"><AdminShell><ComingSoon title="Companies">{later}</ComingSoon></AdminShell></Guard>} />
          <Route path="/admin/consents" element={<Guard role="admin"><AdminShell><ComingSoon title="Consents">{later}</ComingSoon></AdminShell></Guard>} />
          <Route path="/admin/dashboard" element={<Guard role="admin"><AdminShell><ComingSoon title="Dashboard">{later}</ComingSoon></AdminShell></Guard>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ScrollToTop />
        <AfterSignIn session={session ?? null} />
        {db.mode === 'demo' && <DemoBar />}
      </Router>
    </SessionContext.Provider>
  );
}

const HOME: Record<Role, string> = { student: '/student/profile', company: '/company/candidates', admin: '/admin' };

/** After a sign-in link, send people to their own area. */
function AfterSignIn({ session }: { session: Session | null }) {
  const navigate = useNavigate();
  useEffect(() => {
    if (session && db.consumeSignInRedirect()) navigate(HOME[session.role], { replace: true });
  }, [session, navigate]);
  return null;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

/** Floating switcher so reviewers can move between the three sides of the demo. */
function DemoBar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  if (pathname === '/sign-in') return null;
  const go = async (role: Role, to: string) => {
    await db.signInDemo(role);
    setOpen(false);
    navigate(to);
  };
  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2" style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      {open && (
        <div id="demo-menu" className="flex w-64 flex-col gap-1 rounded-2xl border border-line bg-surface p-2 text-sm shadow-[0_24px_60px_-30px_rgba(5,49,41,0.45)]">
          <div className="px-3 pb-1 pt-2 text-xs font-bold uppercase tracking-overline text-muted">View the demo as</div>
          <button type="button" className="min-h-[44px] rounded-field px-3 text-left font-semibold hover:bg-offwhite" onClick={() => go('student', '/student/profile')}>Student · Amara Diallo</button>
          <button type="button" className="min-h-[44px] rounded-field px-3 text-left font-semibold hover:bg-offwhite" onClick={() => go('company', '/company/candidates')}>Company · Kora Capital</button>
          <button type="button" className="min-h-[44px] rounded-field px-3 text-left font-semibold hover:bg-offwhite" onClick={() => go('admin', '/admin')}>Club admin</button>
          <div className="my-1 h-px bg-line" />
          <button type="button" className="min-h-[44px] rounded-field px-3 text-left font-semibold text-danger hover:bg-offwhite" onClick={async () => { await db.resetDemo(); setOpen(false); }}>Reset demo data</button>
        </div>
      )}
      <button type="button" aria-expanded={open} aria-controls="demo-menu" onClick={() => setOpen((o) => !o)}
        className="min-h-[44px] rounded-full bg-ink px-4 text-sm font-semibold text-offwhite shadow-lg hover:bg-green">
        {open ? 'Close' : 'Demo · switch view'}
      </button>
    </div>
  );
}
