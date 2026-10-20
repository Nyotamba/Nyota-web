import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { StudentShell } from './StudentShell';
import { db } from '../../lib/db';
import { useSession } from '../../App';

const HOME = { student: '/student/profile', company: '/company/candidates', admin: '/admin' } as const;

/** Account settings. Company members and club team who signed up without their code can add it here. */
export default function StudentAccount() {
  const email = useSession()?.email;
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redeem = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const role = await db.redeemAccessCode(code);
      navigate(HOME[role], { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <StudentShell>
      <div className="mx-auto flex max-w-page flex-col gap-6 px-4 py-10 md:px-10 xl:px-20">
        <div className="flex flex-col gap-1">
          <h1 className="m-0 font-display text-[40px] tracking-display">Account</h1>
          <div className="text-[15px] text-muted">
            Signed in as <strong className="text-ink">{email}</strong> · <a href="#/set-password" className="font-semibold">Change my password</a>
          </div>
        </div>
        <form onSubmit={redeem} className="card flex max-w-[520px] flex-col gap-4 p-7">
          <h2 className="m-0 text-xl font-bold">I represent a company, or I am on the club team</h2>
          <p className="m-0 text-sm leading-relaxed text-muted">
            Enter the access code the IESE Africa Business Club sent you. It only works with the e-mail address you were invited with.
            Students do not need a code.
          </p>
          <label className="label" htmlFor="acc-code">Access code
            <input id="acc-code" required className="field uppercase tracking-[0.1em]" placeholder="XXXX-XXXX" autoComplete="off"
              value={code} onChange={(e) => setCode(e.target.value)} />
          </label>
          <button type="submit" disabled={busy} className="btn-primary">Use this code</button>
          {error && <p role="alert" className="m-0 rounded-field bg-sand px-4 py-3 text-sm text-danger">{error}</p>}
        </form>
      </div>
    </StudentShell>
  );
}
