import { useEffect, useState, type FormEvent } from 'react';
import { CompanyShell } from './CompanyShell';
import { CompanyCard } from '../../components/CompanyCard';
import { Notice } from '../../components/Notice';
import { db, type CompanyPage as Page } from '../../lib/db';
import { useDbQuery } from '../../lib/useDb';
import { useSession } from '../../App';

/** The company writes the presentation students see in "Companies"; the preview updates as it types. */
export default function CompanyPage() {
  const companyId = useSession()!.companyId!;
  const { data: companies } = useDbQuery(() => db.listFairCompanies());
  const me = companies?.find((c) => c.id === companyId);
  const [f, setF] = useState<Page | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ msg: string; tone?: 'green' | 'danger' } | null>(null);
  useEffect(() => {
    if (me && !f) setF({ about: me.about, website: me.website, sector: me.sector, locations: me.locations });
  }, [me, f]);
  const set = (k: keyof Page, v: string) => setF((x) => (x ? { ...x, [k]: v } : x));

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!f) return;
    setBusy(true);
    try {
      await db.saveCompanyPage(companyId, f);
      setNotice({ msg: 'Your page is updated' });
    } catch (err) {
      setNotice({ msg: (err as Error).message, tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <CompanyShell>
      <div className="mx-auto grid max-w-page items-start gap-7 px-4 py-10 md:px-10 xl:grid-cols-12">
        <section className="flex min-w-0 flex-col gap-5 xl:col-span-7">
          <div className="flex flex-col gap-1">
            <h1 className="m-0 font-display text-[40px] tracking-display">Your page</h1>
            <div className="max-w-[70ch] text-[15px] text-muted">
              This is how students see your company in “Companies”. Presentations, interview days and openings fill in on their own
              from your sessions, slots and openings.
            </div>
          </div>
          {me && f ? <CompanyCard c={{ ...me, ...f }} links={false} /> : <p className="text-muted">Loading…</p>}
        </section>
        <aside className="xl:col-span-5">
          {f && (
            <form onSubmit={save} className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-6">
              <h2 className="m-0 text-xl font-bold">Presentation</h2>
              <label className="label" htmlFor="cp-about">What you do
                <textarea id="cp-about" rows={6} maxLength={1200} className="field text-[15px]" value={f.about} onChange={(e) => set('about', e.target.value)}
                  placeholder="Who you are, where you work in Africa, what MBAs do with you." />
                <span className="text-[12px] font-normal text-muted">{f.about.length}/1200</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="label" htmlFor="cp-sector">Sector
                  <input id="cp-sector" maxLength={80} className="field text-[15px]" placeholder="Energy" value={f.sector} onChange={(e) => set('sector', e.target.value)} />
                </label>
                <label className="label" htmlFor="cp-loc">Offices
                  <input id="cp-loc" maxLength={200} className="field text-[15px]" placeholder="Nairobi · Lagos" value={f.locations} onChange={(e) => set('locations', e.target.value)} />
                </label>
              </div>
              <label className="label" htmlFor="cp-web">Website
                <input id="cp-web" type="url" maxLength={300} className="field text-[15px]" placeholder="https://…" value={f.website} onChange={(e) => set('website', e.target.value)} />
              </label>
              <button type="submit" disabled={busy} className="btn rounded-xl bg-ink text-[15px] text-offwhite hover:bg-green">Save my page</button>
              <p className="m-0 text-[12px] text-muted">Your logo is added by the club. Write to them to change it.</p>
            </form>
          )}
        </aside>
      </div>
      <Notice message={notice?.msg ?? null} tone={notice?.tone} onDone={() => setNotice(null)} />
    </CompanyShell>
  );
}
