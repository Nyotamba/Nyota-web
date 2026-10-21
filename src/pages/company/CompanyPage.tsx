import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { CompanyShell } from './CompanyShell';
import { CompanyCard } from '../../components/CompanyCard';
import { ChipGroup } from '../../components/Chip';
import { Notice } from '../../components/Notice';
import { db, type CompanyPage as Page } from '../../lib/db';
import { useDbQuery } from '../../lib/useDb';
import { useSession } from '../../App';
import { useProfileOptions } from '../../lib/useOptions';

const SIZES = ['1–50', '50–200', '200–1,000', '1,000–10,000', '10,000+'];

/** First tab of the company side: the company profile students see in "Companies", with a live preview. */
export function CompanyProfileEditor({ companyId }: { companyId: string }) {
  const { data: companies } = useDbQuery(() => db.listFairCompanies());
  const { functions } = useProfileOptions();
  const me = companies?.find((c) => c.id === companyId);
  const [f, setF] = useState<Page | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ msg: string; tone?: 'green' | 'danger' } | null>(null);
  const logoInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (me && !f) {
      setF({ about: me.about, website: me.website, sector: me.sector, locations: me.locations, hiringFor: me.hiringFor, hiringCountries: me.hiringCountries, size: me.size });
    }
  }, [me, f]);
  const set = <K extends keyof Page>(k: K, v: Page[K]) => setF((x) => (x ? { ...x, [k]: v } : x));

  const run = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      setNotice({ msg: ok });
    } catch (err) {
      setNotice({ msg: (err as Error).message, tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };
  const save = (e: FormEvent) => {
    e.preventDefault();
    if (f) run(() => db.saveCompanyPage(companyId, f), 'Your profile is updated');
  };
  const upload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) run(() => db.uploadLogo({ kind: 'company', id: companyId }, file), 'Logo updated');
  };
  const missing = f ? [!me?.logoUrl && 'logo', !f.about && 'presentation', !f.hiringFor.length && 'roles you hire for'].filter(Boolean) : [];

  return (
    <>
      <div className="mx-auto grid max-w-page items-start gap-7 px-4 py-10 md:px-10 xl:grid-cols-12">
        <section className="flex min-w-0 flex-col gap-5 xl:col-span-7">
          <div className="flex flex-col gap-1">
            <h1 className="m-0 font-display text-[40px] tracking-display">Company profile</h1>
            <div className="max-w-[70ch] text-[15px] text-muted">
              This is how students see you in “Companies”. Your presentations, interview days and openings are added on their own.
            </div>
          </div>
          {missing.length > 0 && (
            <p className="m-0 rounded-xl bg-sand px-5 py-4 text-sm text-ink">
              <strong>To complete:</strong> {missing.join(', ')}. Complete profiles get more interest from students.
            </p>
          )}
          {me && f ? <CompanyCard c={{ ...me, ...f }} links={false} /> : <p className="text-muted">Loading…</p>}
        </section>

        <aside className="xl:col-span-5">
          {f && (
            <form onSubmit={save} className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-6">
              <div className="flex items-center gap-4">
                <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-white">
                  {me?.logoUrl ? <img src={me.logoUrl} alt="Your logo" className="max-h-14 max-w-14 object-contain" /> : <span className="text-[11px] text-muted">No logo</span>}
                </div>
                <div className="flex flex-col gap-1">
                  <button type="button" disabled={busy} className="btn-small self-start" onClick={() => logoInput.current?.click()}>
                    {me?.logoUrl ? 'Change the logo' : 'Upload your logo'}
                  </button>
                  <span className="text-[12px] text-muted">PNG, JPEG or WebP, under 1 MB. Square works best.</span>
                  <input ref={logoInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={upload} />
                </div>
              </div>
              <label className="label" htmlFor="cp-about">What you do
                <textarea id="cp-about" rows={5} maxLength={1200} className="field text-[15px]" value={f.about} onChange={(e) => set('about', e.target.value)}
                  placeholder="Who you are, where you work in Africa, what MBAs do with you." />
                <span className="text-[12px] font-normal text-muted">{f.about.length}/1200</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="label" htmlFor="cp-sector">Sector
                  <input id="cp-sector" maxLength={80} className="field text-[15px]" placeholder="Energy" value={f.sector} onChange={(e) => set('sector', e.target.value)} />
                </label>
                <label className="label" htmlFor="cp-size">Size
                  <select id="cp-size" className="field text-[15px]" value={f.size} onChange={(e) => set('size', e.target.value)}>
                    <option value="">Choose…</option>
                    {SIZES.map((s) => <option key={s} value={s}>{s} employees</option>)}
                  </select>
                </label>
              </div>
              <label className="label" htmlFor="cp-loc">Offices
                <input id="cp-loc" maxLength={200} className="field text-[15px]" placeholder="Nairobi · Lagos · London" value={f.locations} onChange={(e) => set('locations', e.target.value)} />
              </label>
              <ChipGroup size="sm" label="Roles you hire MBAs into" options={functions} value={f.hiringFor} onChange={(v) => set('hiringFor', v)} />
              <label className="label" htmlFor="cp-countries">Countries you hire for
                <input id="cp-countries" maxLength={300} className="field text-[15px]" placeholder="Kenya, Nigeria, Senegal" value={f.hiringCountries} onChange={(e) => set('hiringCountries', e.target.value)} />
              </label>
              <label className="label" htmlFor="cp-web">Website
                <input id="cp-web" type="url" maxLength={300} className="field text-[15px]" placeholder="https://…" value={f.website} onChange={(e) => set('website', e.target.value)} />
              </label>
              <button type="submit" disabled={busy} className="btn rounded-xl bg-ink text-[15px] text-offwhite hover:bg-green">Save my profile</button>
            </form>
          )}
        </aside>
      </div>
      <Notice message={notice?.msg ?? null} tone={notice?.tone} onDone={() => setNotice(null)} />
    </>
  );
}

export default function CompanyPage() {
  const companyId = useSession()!.companyId!;
  return <CompanyShell><CompanyProfileEditor companyId={companyId} /></CompanyShell>;
}
