import { useState, type FormEvent } from 'react';
import { AdminShell } from './AdminShell';
import { Badge } from '../../components/Badge';
import { Notice } from '../../components/Notice';
import { CopyCode } from '../../components/CopyCode';
import { SendCodeButton } from '../../components/SendCodeButton';
import { db } from '../../lib/db';
import { useDbQuery } from '../../lib/useDb';
import { useSession } from '../../App';

export default function AdminAdmins() {
  const me = useSession()?.email;
  const { data: admins, error } = useDbQuery(() => db.listAdmins());
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ msg: string; tone: 'green' | 'danger' } | null>(null);

  const run = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      setNotice({ msg: ok, tone: 'green' });
    } catch (err) {
      setNotice({ msg: (err as Error).message, tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };
  const add = (e: FormEvent) => {
    e.preventDefault();
    const em = email.trim().toLowerCase();
    run(async () => {
      await db.addAdmin(em);
      setEmail('');
    }, `${em} is now an admin`);
  };

  return (
    <AdminShell>
      <div className="mx-auto grid max-w-page items-start gap-7 px-4 py-10 md:px-10 xl:grid-cols-12">
        <section className="flex min-w-0 flex-col gap-[18px] xl:col-span-8">
          <div className="flex flex-col gap-1">
            <h1 className="m-0 font-display text-[34px] tracking-display md:text-[40px]">Admins</h1>
            <div className="text-[15px] text-muted">Club members who can verify profiles, invite companies and see the dashboard.</div>
          </div>
          {error && <p className="card m-0 p-6 text-danger">The list could not load: {error.message}</p>}
          <ul className="m-0 list-none overflow-hidden rounded-2xl border border-line bg-surface p-0">
            {admins?.map((a) => (
              <li key={a.email} className="flex flex-wrap items-center gap-3 border-b border-line-soft px-5 py-4 text-sm last:border-b-0">
                <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">
                  {a.email}
                  {a.email === me && <span className="ml-2 font-normal text-muted">(you)</span>}
                </span>
                {a.signedIn ? <Badge tone="green">Signed in</Badge> : <Badge tone="orange">Not signed in yet</Badge>}
                {!a.signedIn && a.accessCode && <CopyCode code={a.accessCode} />}
                {!a.signedIn && a.accessCode && <SendCodeButton email={a.email} kind="admin" onNotice={(msg, tone) => setNotice({ msg, tone: tone ?? 'green' })} />}
                {a.email !== me &&
                  (confirming === a.email ? (
                    <span className="flex gap-2">
                      <button type="button" disabled={busy} className="btn-small border-danger text-danger hover:border-danger hover:text-danger"
                        onClick={() => run(() => db.removeAdmin(a.email), `${a.email} is no longer an admin`).then(() => setConfirming(null))}>
                        Remove admin
                      </button>
                      <button type="button" className="btn-small" onClick={() => setConfirming(null)}>Keep</button>
                    </span>
                  ) : (
                    <button type="button" className="btn-small" onClick={() => setConfirming(a.email)}>Remove</button>
                  ))}
              </li>
            ))}
          </ul>
        </section>

        <aside className="flex flex-col gap-5 xl:col-span-4">
          <form onSubmit={add} className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-6">
            <h2 className="m-0 text-xl font-bold">Add an admin</h2>
            <label className="label" htmlFor="adm-email">E-mail
              <input id="adm-email" type="email" required placeholder="first.last@iese.net" className="field text-[15px]"
                value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <button type="submit" disabled={busy} className="btn rounded-xl bg-ink text-[15px] text-offwhite hover:bg-green">Add admin</button>
            <p className="m-0 text-[13px] leading-normal text-muted">
              Send them the access code that appears next to their address. They create their account with this e-mail and the code (or
              sign in with an e-mail link). If they already have an account, it becomes an admin account right away.
            </p>
          </form>
        </aside>
      </div>
      <Notice message={notice?.msg ?? null} tone={notice?.tone} onDone={() => setNotice(null)} />
    </AdminShell>
  );
}
