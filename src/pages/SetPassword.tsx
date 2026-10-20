import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { db } from '../lib/db';
import { useSession } from '../App';

const HOME = { student: '/student/profile', company: '/company/candidates', admin: '/admin' } as const;

/** Choose a new password: after a reset e-mail, or any time from the account. */
export default function SetPassword() {
  const session = useSession();
  const navigate = useNavigate();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (pw !== pw2) return setError('The two passwords do not match.');
    setBusy(true);
    try {
      await db.updatePassword(pw);
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-full max-w-page flex-col">
      <header className="flex h-[72px] items-center border-b border-line px-4 md:px-10"><Logo /></header>
      <main className="flex flex-1 justify-center px-4 py-12 md:py-20">
        <div className="flex w-full max-w-[480px] flex-col gap-6">
          <h1 className="m-0 font-display text-[40px] tracking-display">Choose a new password</h1>
          {!session ? (
            <p className="card m-0 p-7 text-[15px] text-muted">This link has expired. Ask for a new one from the sign-in page.</p>
          ) : done ? (
            <div className="card flex flex-col gap-4 p-7">
              <p className="m-0 text-[15px]">Your password is saved. Next time, sign in with {session.email} and this password.</p>
              <button type="button" className="btn-primary" onClick={() => navigate(HOME[session.role], { replace: true })}>Continue</button>
            </div>
          ) : (
            <form onSubmit={submit} className="card flex flex-col gap-4 p-7">
              <p className="m-0 text-sm text-muted">For {session.email}.</p>
              <label className="label" htmlFor="np-1">New password
                <input id="np-1" type="password" required minLength={8} autoComplete="new-password" className="field" value={pw} onChange={(e) => setPw(e.target.value)} />
                <span className="text-[13px] font-normal text-muted">At least 8 characters.</span>
              </label>
              <label className="label" htmlFor="np-2">Type it again
                <input id="np-2" type="password" required minLength={8} autoComplete="new-password" className="field" value={pw2} onChange={(e) => setPw2(e.target.value)} />
              </label>
              <button type="submit" disabled={busy} className="btn-primary">{busy ? 'Saving…' : 'Save my password'}</button>
              {error && <p role="alert" className="m-0 rounded-field bg-sand px-4 py-3 text-sm text-danger">{error}</p>}
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
