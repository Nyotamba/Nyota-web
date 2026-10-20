import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { db, type OAuthProvider, type Role } from '../lib/db';
import { useDbQuery } from '../lib/useDb';

const HOME: Record<Role, string> = { student: '/student/profile', company: '/company/candidates', admin: '/admin' };

export default function SignIn() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const location = useLocation();
  const [error, setError] = useState<string | null>((location.state as { linkError?: string } | null)?.linkError ?? null);
  const { data: providers = [] } = useDbQuery(() => db.enabledProviders());
  const [sending, setSending] = useState(false);
  const as = params.get('as');
  const live = db.mode === 'live';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!live) return setSent(true);
    setSending(true);
    try {
      await db.sendMagicLink(email);
      setSent(true);
    } catch (err) {
      const msg = (err as Error).message;
      setError(
        /rate limit/i.test(msg)
          ? 'Too many sign-in e-mails were sent in the last hour. Use the last link you received, or try again later.'
          : `The link could not be sent: ${msg}`,
      );
    } finally {
      setSending(false);
    }
  };
  const withProvider = async (p: OAuthProvider) => {
    setError(null);
    try {
      await db.signInWithProvider(p);
    } catch (err) {
      setError((err as Error).message);
    }
  };
  const enter = async (role: Role) => {
    await db.signInDemo(role);
    navigate(HOME[role]);
  };

  const demo: { role: Role; title: string; desc: string }[] = [
    { role: 'student', title: 'Student', desc: 'Amara Diallo · edit the profile, give consent' },
    { role: 'company', title: 'Company', desc: 'Kora Capital (demo) · filter, shortlist, open CVs' },
    { role: 'admin', title: 'Club admin', desc: 'Verify profiles, invite companies' },
  ];

  return (
    <div className="mx-auto flex min-h-full max-w-page flex-col">
      <header className="flex h-[72px] items-center border-b border-line px-4 md:px-10"><Logo /></header>
      <main className="flex flex-1 justify-center px-4 py-12 md:py-20">
        <div className="flex w-full max-w-[480px] flex-col gap-8">
          <div className="flex flex-col gap-3">
            <h1 className="m-0 font-display text-[40px] font-normal tracking-display">{as === 'company' ? 'Sign in' : 'Sign in or create your profile'}</h1>
            <p className="m-0 text-base leading-relaxed text-muted">
              {as === 'company'
                ? 'Company access is by invitation. Use the work e-mail your invitation was sent to.'
                : 'Students: enter your school e-mail. First time here? Your profile is created when you click the link we send you. No password needed.'}
            </p>
          </div>

          {providers.length > 0 && (
            <div className="flex flex-col gap-3">
              {providers.map((p) => (
                <button key={p} type="button" onClick={() => withProvider(p)} className="btn-secondary w-full text-[15px]">
                  Continue with {p === 'azure' ? 'Microsoft' : p === 'google' ? 'Google' : 'LinkedIn'}
                </button>
              ))}
              <div className="flex items-center gap-3 text-[13px] text-muted">
                <span className="h-px flex-1 bg-line" />or get a sign-in link by e-mail<span className="h-px flex-1 bg-line" />
              </div>
            </div>
          )}

          <form onSubmit={submit} className="card flex flex-col gap-4 p-7">
            <label className="label" htmlFor="signin-email">E-mail
              <input id="signin-email" type="email" required autoComplete="email" className="field" placeholder="name@school.edu"
                value={email} onChange={(e) => { setEmail(e.target.value); setSent(false); }} />
            </label>
            <button type="submit" className="btn-primary" disabled={sending}>{sending ? 'Sending…' : 'Send me a sign-in link'}</button>
            {sent && (
              <p role="status" className="m-0 rounded-field bg-sand px-4 py-3 text-sm leading-relaxed text-ink">
                {live
                  ? `Check your inbox: we sent a sign-in link to ${email}. It can take a minute; check your spam folder too.`
                  : 'This is the demo: no e-mail is sent. Use a demo account below.'}
              </p>
            )}
            {error && (
              <p role="alert" className="m-0 rounded-field bg-sand px-4 py-3 text-sm leading-relaxed text-danger">
                {error}
              </p>
            )}
          </form>

          {!live && <section aria-labelledby="demo-title" className="flex flex-col gap-3">
            <h2 id="demo-title" className="overline m-0">Demo accounts</h2>
            {demo.map((d) => (
              <button key={d.role} type="button" onClick={() => enter(d.role)}
                className={`flex min-h-[64px] items-center justify-between gap-4 rounded-2xl border bg-surface px-5 py-4 text-left hover:border-ink ${as === d.role ? 'border-ink' : 'border-line'}`}>
                <span className="flex flex-col gap-0.5">
                  <span className="text-base font-bold">{d.title}</span>
                  <span className="text-sm text-muted">{d.desc}</span>
                </span>
                <span aria-hidden="true" className="text-xl">→</span>
              </button>
            ))}
          </section>}
        </div>
      </main>
    </div>
  );
}
