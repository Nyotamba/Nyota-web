import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { BrowserRouter, HashRouter, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { db, isPreview, type Role, type Session } from './lib/db';
import { exitPreview, previewRole, startPreview } from './lib/preview';
import { useDbQuery } from './lib/useDb';
import Landing from './pages/Landing';
import SignIn from './pages/SignIn';
import StudentProfile from './pages/student/Profile';
import StudentPreview from './pages/student/Preview';
import CompanyCandidates from './pages/company/Candidates';
import CompanyCandidateDetail from './pages/company/CandidateDetail';
import Admin from './pages/admin/Admin';
import AdminReview from './pages/admin/Review';
import AdminDashboard from './pages/admin/Dashboard';
import AdminAdmins from './pages/admin/Admins';
import AdminSessions from './pages/admin/Sessions';
import AdminCompanies from './pages/admin/Companies';
import AdminLists from './pages/admin/Lists';
import AdminCandidates from './pages/admin/Candidates';
import OwnerSettings from './pages/admin/Settings';
import AdminCompanySpace from './pages/admin/CompanySpace';
import AdminInsights from './pages/admin/Insights';
import { ProfileEditor } from './pages/student/Profile';
import SetPassword from './pages/SetPassword';
import PublicSessions from './pages/Sessions';
import StudentSessions from './pages/student/Sessions';
import StudentInterviews from './pages/student/Interviews';
import StudentAccount from './pages/student/Account';
import SessionRoom from './pages/student/SessionRoom';
import CompanyMeetings from './pages/company/Meetings';
import CompanyOpenings from './pages/company/Openings';
import StudentOpenings from './pages/student/Openings';
import StudentCompanies from './pages/student/Companies';
import CompanyPageEditor from './pages/company/CompanyPage';
import CompanyDashboard from './pages/company/Dashboard';
import { AdminShell } from './pages/admin/AdminShell';
import { ComingSoon } from './pages/ComingSoon';

const SessionContext = createContext<Session | null>(null);
export const useSession = () => useContext(SessionContext);

// Hash routing works on any static host; set VITE_ROUTER=browser when the host rewrites to index.html.
const Router = import.meta.env.VITE_ROUTER === 'browser' ? BrowserRouter : HashRouter;

function AdminEditCandidate() {
  const { id = '' } = useParams();
  return <ProfileEditor id={id} admin />;
}

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
          <Route path="/sessions" element={<PublicSessions />} />
          <Route path="/set-password" element={<SetPassword />} />

          <Route path="/student/profile" element={<Guard role="student"><StudentProfile /></Guard>} />
          <Route path="/student/preview" element={<Guard role="student"><StudentPreview /></Guard>} />
          <Route path="/student/companies" element={<Guard role="student"><StudentCompanies /></Guard>} />
          <Route path="/student/openings" element={<Guard role="student"><StudentOpenings /></Guard>} />
          <Route path="/student/sessions" element={<Guard role="student"><StudentSessions /></Guard>} />
          <Route path="/student/sessions/:id/live" element={<Guard role="student"><SessionRoom /></Guard>} />
          <Route path="/student/meetings" element={<Guard role="student"><StudentInterviews /></Guard>} />
          <Route path="/student/account" element={<Guard role="student"><StudentAccount /></Guard>} />

          <Route path="/company/candidates" element={<Guard role="company"><CompanyCandidates /></Guard>} />
          <Route path="/company/candidates/:id" element={<Guard role="company"><CompanyCandidateDetail /></Guard>} />
          <Route path="/company/shortlist" element={<Navigate to="/company/candidates?view=shortlist" replace />} />
          <Route path="/company/page" element={<Guard role="company"><CompanyPageEditor /></Guard>} />
          <Route path="/company/openings" element={<Guard role="company"><CompanyOpenings /></Guard>} />
          <Route path="/company/meetings" element={<Guard role="company"><CompanyMeetings /></Guard>} />
          <Route path="/company/dashboard" element={<Guard role="company"><CompanyDashboard /></Guard>} />

          <Route path="/admin" element={<Guard role="admin"><Admin /></Guard>} />
          <Route path="/admin/review/:id" element={<Guard role="admin"><AdminReview /></Guard>} />
          <Route path="/admin/companies" element={<Guard role="admin"><AdminCompanies /></Guard>} />
          <Route path="/admin/lists" element={<Guard role="admin"><AdminLists /></Guard>} />
          <Route path="/admin/schools" element={<Navigate to="/admin/lists" replace />} />
          <Route path="/admin/candidates/:id/edit" element={<Guard role="admin"><AdminEditCandidate /></Guard>} />
          <Route path="/admin/companies/:id" element={<Guard role="admin"><AdminCompanySpace /></Guard>} />
          <Route path="/admin/insights" element={<Guard role="admin"><AdminInsights /></Guard>} />
          <Route path="/admin/candidates" element={<Guard role="admin"><AdminCandidates /></Guard>} />
          <Route path="/admin/settings" element={<Guard role="admin"><OwnerSettings /></Guard>} />
          <Route path="/admin/consents" element={<Guard role="admin"><AdminShell><ComingSoon title="Consents">{later}</ComingSoon></AdminShell></Guard>} />
          <Route path="/admin/dashboard" element={<Guard role="admin"><AdminDashboard /></Guard>} />
          <Route path="/admin/admins" element={<Guard role="admin"><AdminAdmins /></Guard>} />
          <Route path="/admin/sessions" element={<Guard role="admin"><AdminSessions /></Guard>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ScrollToTop />
        <AfterSignIn session={session ?? null} />
        {isPreview ? <PreviewBar /> : db.mode === 'demo' && <DemoBar />}
      </Router>
    </SessionContext.Provider>
  );
}

const HOME: Record<Role, string> = { student: '/student/profile', company: '/company/page', admin: '/admin' };

/** After a sign-in link, send people to their own area. */
function AfterSignIn({ session }: { session: Session | null }) {
  const navigate = useNavigate();
  useEffect(() => {
    if (session && db.consumeSignInRedirect()) {
      navigate(db.takePasswordReset() ? '/set-password' : HOME[session.role], { replace: true });
    }
    const linkError = !session ? db.takeLinkError() : null;
    if (linkError) navigate('/sign-in', { replace: true, state: { linkError } });
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

/** Admin preview of the student / company side (sample data). */
function PreviewBar() {
  const role = previewRole();
  const other = role === 'student' ? 'company' : 'student';
  return (
    <div role="region" aria-label="Preview" className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-line bg-ink text-offwhite"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="mx-auto flex max-w-page flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 md:px-10">
        <span className="flex-1 text-sm">
          <strong>Preview · what a {role} sees.</strong> <span className="text-ink-muted">Sample data: nothing you do here is saved or sent.</span>
        </span>
        <button type="button" onClick={() => startPreview(other)}
          className="min-h-[40px] rounded-full border border-ink-border px-4 text-sm font-semibold hover:border-offwhite">
          See the {other} side
        </button>
        <button type="button" onClick={exitPreview} className="min-h-[40px] rounded-full bg-orange px-4 text-sm font-bold text-ink hover:bg-offwhite">
          Back to admin
        </button>
      </div>
    </div>
  );
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
          <button type="button" className="min-h-[44px] rounded-field px-3 text-left font-semibold hover:bg-offwhite" onClick={() => go('company', '/company/page')}>Company · Kora Capital</button>
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
