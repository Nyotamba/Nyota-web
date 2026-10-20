import { useState, type FormEvent } from 'react';
import { AdminShell } from './AdminShell';
import { Notice } from '../../components/Notice';
import { LogoEditor } from '../../components/LogoEditor';
import { db } from '../../lib/db';
import { useDbQuery } from '../../lib/useDb';

export default function AdminSchools() {
  const { data: schools } = useDbQuery(() => db.listSchoolEntries());
  const [name, setName] = useState('');
  const [confirm, setConfirm] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ msg: string; tone?: 'green' | 'danger' } | null>(null);
  const run = async (fn: () => Promise<void>, ok: string) => {
    try {
      await fn();
      setNotice({ msg: ok });
    } catch (err) {
      setNotice({ msg: (err as Error).message, tone: 'danger' });
    }
  };
  const add = (e: FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    run(async () => {
      await db.addSchool(n);
      setName('');
    }, `${n} added to the list`);
  };

  return (
    <AdminShell>
      <div className="mx-auto grid max-w-page items-start gap-7 px-4 py-10 md:px-10 xl:grid-cols-12">
        <section className="flex min-w-0 flex-col gap-5 xl:col-span-8">
          <div className="flex flex-col gap-1">
            <h1 className="m-0 font-display text-[34px] tracking-display md:text-[40px]">Schools</h1>
            <div className="text-[15px] text-muted">
              The business schools students pick from in their profile ({schools?.length ?? 0}). Students can still type a school that is
              not listed.
            </div>
          </div>
          <ul className="m-0 flex list-none flex-col overflow-hidden rounded-2xl border border-line bg-surface p-0">
            {schools?.map(({ name: s, logoUrl, showOnSite }) => (
              <li key={s} className="flex flex-wrap items-center gap-3 border-b border-line-soft px-5 py-3 text-[15px] last:border-b-0">
                <span className="min-w-[180px] flex-1 font-semibold">{s}</span>
                <LogoEditor target={{ kind: 'school', name: s }} name={s} logoUrl={logoUrl} showOnSite={showOnSite}
                  onNotice={(msg, tone) => setNotice({ msg, tone })} />
                {confirm === s ? (
                  <span className="flex gap-1.5">
                    <button type="button" className="btn-small border-danger text-[13px] text-danger hover:border-danger hover:text-danger"
                      onClick={() => run(() => db.removeSchool(s), `${s} removed`).then(() => setConfirm(null))}>Remove</button>
                    <button type="button" className="btn-small text-[13px]" onClick={() => setConfirm(null)}>Keep</button>
                  </span>
                ) : (
                  <button type="button" className="btn-small text-[13px]" aria-label={`Remove ${s}`} onClick={() => setConfirm(s)}>Remove</button>
                )}
              </li>
            ))}
          </ul>
        </section>
        <aside className="xl:sticky xl:top-6 xl:col-span-4">
          <form onSubmit={add} className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-6">
            <h2 className="m-0 text-xl font-bold">Add a school</h2>
            <label className="label" htmlFor="sch-name">School name
              <input id="sch-name" required minLength={2} maxLength={120} className="field text-[15px]" placeholder="Copenhagen Business School"
                value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <button type="submit" className="btn rounded-xl bg-ink text-[15px] text-offwhite hover:bg-green">Add school</button>
            <p className="m-0 text-[13px] leading-normal text-muted">
              Removing a school only takes it out of the list: students who already chose it keep it on their profile.
            </p>
          </form>
        </aside>
      </div>
      <Notice message={notice?.msg ?? null} tone={notice?.tone} onDone={() => setNotice(null)} />
    </AdminShell>
  );
}
