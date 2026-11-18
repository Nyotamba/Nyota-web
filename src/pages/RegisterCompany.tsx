import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { db, type CompanyRegistrationInput } from '../lib/db';
import { COMPANY_DEADLINE, PROFILES_OPEN } from '../config/constants';

const EMPTY: CompanyRegistrationInput = { companyName: '', contactName: '', email: '', jobTitle: '', website: '', sector: '', hiringCountries: '', message: '' };

/** Public form. Nothing opens until we approve the company and send it an access code. */
export default function RegisterCompany() {
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof CompanyRegistrationInput, v: string) => setF((x) => ({ ...x, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await db.registerCompany(f);
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
      <main className="flex flex-1 justify-center px-4 py-12 md:py-16">
        <div className="flex w-full max-w-[600px] flex-col gap-8">
          {done ? (
            <section role="status" className="card flex flex-col items-start gap-4 p-7">
              <h1 className="m-0 font-display text-[40px] leading-[0.95] tracking-display">Thank you.</h1>
              <p className="m-0 text-base leading-relaxed text-muted">
                We review every company before it joins the fair. Once approved, you will receive an access code at{' '}
                <strong className="text-ink">{f.email.trim()}</strong> to create your account.
              </p>
              <Link to="/" className="btn-secondary text-[15px]">Back to the homepage</Link>
            </section>
          ) : (
            <>
              <div className="flex flex-col gap-3">
                <h1 className="m-0 font-display text-[40px] leading-[0.95] tracking-display md:text-[52px]">Register your company</h1>
                <p className="m-0 text-base leading-relaxed text-muted">
                  Free to take part. Register by {COMPANY_DEADLINE} to see candidate profiles from {PROFILES_OPEN}.
                </p>
              </div>
              <form onSubmit={submit} className="card flex flex-col gap-4 p-7">
                <label className="label" htmlFor="rc-company">Company name
                  <input id="rc-company" required minLength={2} maxLength={120} autoComplete="organization" className="field" value={f.companyName} onChange={(e) => set('companyName', e.target.value)} />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="label" htmlFor="rc-contact">Your name
                    <input id="rc-contact" required minLength={2} maxLength={120} autoComplete="name" className="field" value={f.contactName} onChange={(e) => set('contactName', e.target.value)} />
                  </label>
                  <label className="label" htmlFor="rc-title">Your role
                    <input id="rc-title" maxLength={120} autoComplete="organization-title" className="field" value={f.jobTitle} onChange={(e) => set('jobTitle', e.target.value)} />
                  </label>
                </div>
                <label className="label" htmlFor="rc-email">Work email
                  <input id="rc-email" type="email" required maxLength={200} autoComplete="email" placeholder="name@company.com" className="field" value={f.email} onChange={(e) => set('email', e.target.value)} />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="label" htmlFor="rc-web">Website
                    <input id="rc-web" maxLength={280} autoComplete="url" placeholder="company.com" className="field" value={f.website} onChange={(e) => set('website', e.target.value)} />
                  </label>
                  <label className="label" htmlFor="rc-sector">Sector
                    <input id="rc-sector" maxLength={80} className="field" value={f.sector} onChange={(e) => set('sector', e.target.value)} />
                  </label>
                </div>
                <label className="label" htmlFor="rc-countries">Countries you hire for
                  <input id="rc-countries" maxLength={300} placeholder="Kenya, Nigeria, Senegal" className="field" value={f.hiringCountries} onChange={(e) => set('hiringCountries', e.target.value)} />
                </label>
                <label className="label" htmlFor="rc-msg">Anything we should know? <span className="font-normal text-muted">(optional)</span>
                  <textarea id="rc-msg" rows={3} maxLength={1000} className="field" value={f.message} onChange={(e) => set('message', e.target.value)} />
                </label>
                <button type="submit" disabled={busy} className="btn-primary">{busy ? 'Sending…' : 'Register your company'}</button>
                {error && <p role="alert" className="m-0 rounded-field bg-sand px-4 py-3 text-sm text-danger">{error}</p>}
              </form>
              <p className="m-0 text-sm text-muted">Already registered? <Link to="/sign-in?as=company" className="font-semibold">Sign in</Link></p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
