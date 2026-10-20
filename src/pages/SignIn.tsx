import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { db, type OAuthProvider, type Role } from '../lib/db';
import { useDbQuery } from '../lib/useDb';

const HOME: Record<Role, string> = { student: '/student/profile', company: '/company/candidates', admin: '/admin' };
type Mode = 'signin' | 'create' | 'link';

export default function SignIn() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const as = params.get('as');
  const live = db.mode === 'live';
  const { data: providers = [] } = useDbQuery(() => db.enabledProviders());

  const [mode, setMode] = useState<Mode>(as === 'student' ? 'create' : 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>((location.state as { linkError?: string } | null)?.linkError ?? null);

  const goHome = async () => {
    const s = await db.getSession();
    if (s) navigate(HOME[s.role], { replace: true });
  };
  const run = async (fn: () => Promise<void>) => {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (mode === 'signin') return run(async () => { await db.signInWithPassword(email, password); await goHome(); });
    if (mode === 'create') {
      return run(async () => {
        const { needsConfirmation } = await db.signUpWithPassword(email, password, code);
        if (needsConfirmation) setInfo(`Account created. Confirm it with the e-mail we sent to ${email}, then sign in here.`);
        else await goHome();
      });
    }
    return run(async () => {
      try {
        await db.sendMagicLink(email);
        setInfo(`Check your inbox: we sent a sign-in link to ${email}. It can take a minute; check your spam folder too.`);
      } catch (err) {
        const msg = (err as Error).message;
        throw new Error(/rate limit/i.test(msg)
          ? 'Too many sign-in e-mails were sent in the last hour. Sign in with your password instead.'
          : `The link could not be sent: ${msg}`);
      }
    });
  };
  const withProvider = (p: OAuthProvider) => run(() => db.signInWithProvider(p));
  const enter = async (role: Role) => {
    await db.signInDemo(role);
    navigate(HOME[role]);
  };

  const demo: { role: Role; title: string; desc: string }[] = [
    { role: 'student', title: 'Student', desc: 'Amara Diallo · edit the profile, give consent' },
    { role: 'company', title: 'Company', desc: 'Kora Capital (demo) · filter, shortlist, open CVs' },
    { role: 'admin', title: 'Club admin', desc: 'Verify profiles, invite companies' },
  ];
  const tabs: [Mode, string][] = [['signin', 'I have an account'], ['create', 'Create my account']];

  return (
    <div className="mx-auto flex min-h-full max-w-page flex-col">
      <header className="flex h-[72px] items-center border-b border-line px-4 md:px-10"><Logo /></header>
      <main className="flex flex-1 justify-center px-4 py-12 md:py-20">
        <div className="flex w-full max-w-[480px] flex-col gap-8">
          <div className="flex flex-col gap-3">
            <h1 className="m-0 font-display text-[40px] font-normal tracking-display">Sign in or create your account</h1>
            <p className="m-0 text-base leading-relaxed text-muted">
              Students: create your account with your school e-mail. Companies and club team: use the e-mail you were invited with and
              the access code the club gave you.
            </p>
          </div>

          {live && (
            <>
              {providers.length > 0 && (
                <div className="flex flex-col gap-3">
                  {providers.map((p) => (
                    <button key={p} type="button" onClick={() => withProvider(p)} className="btn-secondary w-full text-[15px]">
                      Continue with {p === 'azure' ? 'Microsoft' : p === 'google' ? 'Google' : 'LinkedIn'}
                    </button>
                  ))}
                  <div className="flex items-center gap-3 text-[13px] text-muted">
                    <span className="h-px flex-1 bg-line" />or with your e-mail<span className="h-px flex-1 bg-line" />
                  </div>
                </div>
              )}

              <form onSubmit={submit} className="card flex flex-col gap-4 p-7">
                {mode !== 'link' && (
                  <div role="group" aria-label="Account" className="grid grid-cols-2 overflow-hidden rounded-field border border-line-strong">
                    {tabs.map(([m, label]) => (
                      <button key={m} type="button" aria-pressed={mode === m} onClick={() => { setMode(m); setError(null); setInfo(null); }}
                        className={`min-h-[44px] text-sm font-semibold ${mode === m ? 'bg-ink text-offwhite' : 'bg-surface text-ink hover:bg-offwhite'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                )}
                <label className="label" htmlFor="signin-email">E-mail
                  <input id="signin-email" type="email" required autoComplete="email" className="field" placeholder="name@school.edu"
                    value={email} onChange={(e) => setEmail(e.target.value)} />
                </label>
                {mode !== 'link' && (
                  <label className="label" htmlFor="signin-password">Password
                    <input id="signin-password" type="password" required minLength={8} className="field"
                      autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
                      value={password} onChange={(e) => setPassword(e.target.value)} />
                    {mode === 'create' && <span className="text-[13px] font-normal text-muted">At least 8 characters.</span>}
                  </label>
                )}
                {mode === 'create' && (
                  <label className="label" htmlFor="signin-code">Access code <span className="font-normal text-muted">(companies and club team only)</span>
                    <input id="signin-code" className="field uppercase tracking-[0.1em]" placeholder="XXXX-XXXX" autoComplete="off"
                      value={code} onChange={(e) => setCode(e.target.value)} />
                  </label>
                )}
                <button type="submit" className="btn-primary" disabled={busy}>
                  {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : mode === 'create' ? 'Create my account' : 'Send me a sign-in link'}
                </button>
                {info && <p role="status" className="m-0 rounded-field bg-sand px-4 py-3 text-sm leading-relaxed text-ink">{info}</p>}
                {error && <p role="alert" className="m-0 rounded-field bg-sand px-4 py-3 text-sm leading-relaxed text-danger">{error}</p>}
                <button type="button" className="self-start text-sm font-semibold text-accent underline hover:text-accent-hover"
                  onClick={() => { setMode(mode === 'link' ? 'signin' : 'link'); setError(null); setInfo(null); }}>
                  {mode === 'link' ? 'Use my password instead' : 'Forgot your password? Get a sign-in link by e-mail'}
                </button>
              </form>
            </>
          )}

          {!live && (
            <section aria-labelledby="demo-title" className="flex flex-col gap-3">
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
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
