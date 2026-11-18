import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AdminShell } from './AdminShell';
import { Badge } from '../../components/Badge';
import { CopyCode } from '../../components/CopyCode';
import { LogoEditor } from '../../components/LogoEditor';
import { SendCodeButton } from '../../components/SendCodeButton';
import { Notice } from '../../components/Notice';
import { db, type Company, type CompanyRegistration, type Invitation } from '../../lib/db';
import { useDbQuery } from '../../lib/useDb';
import { useSession } from '../../App';

export default function AdminCompanies() {
  const { data: companies } = useDbQuery(() => db.listCompanies());
  const { data: invitations = [] } = useDbQuery(() => db.listInvitations());
  const [name, setName] = useState('');
  const [notice, setNotice] = useState<{ msg: string; tone?: 'green' | 'danger' } | null>(null);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const co = await db.addCompany(name);
      setName('');
      setNotice({ msg: `${co.name} added. Add its colleagues below.` });
    } catch (err) {
      setNotice({ msg: (err as Error).message, tone: 'danger' });
    }
  };

  return (
    <AdminShell>
      <div className="mx-auto grid max-w-page items-start gap-7 px-4 py-10 md:px-10 xl:grid-cols-12">
        <section className="flex min-w-0 flex-col gap-5 xl:col-span-8">
          <div className="flex flex-col gap-1">
            <h1 className="m-0 font-display text-[34px] tracking-display md:text-[40px]">Companies</h1>
            <div className="text-[15px] text-muted">
              Review new registrations, then manage the companies taking part: logos, colleagues and access codes. Show a logo on the
              homepage only once the company has confirmed its participation in writing.
            </div>
          </div>
          <NewRegistrations companies={companies ?? []} onNotice={(msg, tone) => setNotice({ msg, tone })} />
          {companies?.length === 0 && <div className="card p-7 text-[15px] text-muted">No company yet. Add the first one with the form.</div>}
          <ul className="m-0 flex list-none flex-col gap-4 p-0">
            {companies?.map((co) => (
              <li key={co.id}>
                <CompanyCard company={co} members={invitations.filter((i) => i.companyId === co.id)}
                  onNotice={(msg, tone) => setNotice({ msg, tone })} />
              </li>
            ))}
          </ul>
        </section>
        <aside className="xl:sticky xl:top-6 xl:col-span-4">
          <form onSubmit={add} className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-6">
            <h2 className="m-0 text-xl font-bold">Add a company</h2>
            <label className="label" htmlFor="co-name">Company name
              <input id="co-name" required minLength={2} className="field text-[15px]" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <button type="submit" className="btn rounded-xl bg-ink text-[15px] text-offwhite hover:bg-green">Add company</button>
            <p className="m-0 text-[13px] leading-normal text-muted">
              For a company that did not register itself. Each colleague you add gets an access code to create their account.
            </p>
          </form>
        </aside>
      </div>
      <Notice message={notice?.msg ?? null} tone={notice?.tone} onDone={() => setNotice(null)} />
    </AdminShell>
  );
}

/** Companies that signed up on the site. Nothing opens for them until an admin approves. */
function NewRegistrations({ companies, onNotice }: { companies: Company[]; onNotice: (msg: string, tone?: 'green' | 'danger') => void }) {
  const { data: rows = [] } = useDbQuery(() => db.listCompanyRegistrations());
  const [busy, setBusy] = useState<string | null>(null);
  const pending = rows.filter((r) => r.status === 'pending');
  const decide = async (id: string, fn: () => Promise<void>) => {
    setBusy(id);
    try {
      await fn();
    } catch (err) {
      onNotice((err as Error).message, 'danger');
    } finally {
      setBusy(null);
    }
  };
  const approve = (r: CompanyRegistration) => decide(r.id, async () => {
    const { email, emailSent } = await db.approveCompanyRegistration(r.id);
    onNotice(emailSent ? `${r.companyName} approved. Access code sent to ${email}.` : `${r.companyName} approved, but the email failed. Send the access code from its card below.`, emailSent ? 'green' : 'danger');
  });
  return (
    <section aria-labelledby="new-reg" className="flex flex-col gap-3">
      <h2 id="new-reg" className="m-0 text-xl font-bold">New registrations · {pending.length}</h2>
      {pending.length === 0 && <p className="card m-0 p-5 text-[15px] text-muted">No registration waiting for review.</p>}
      {pending.map((r) => {
        const known = companies.some((c) => c.name.toLowerCase() === r.companyName.toLowerCase());
        return (
          <article key={r.id} className="card flex flex-col gap-3 border-orange p-5">
            <div className="flex flex-col gap-0.5">
              <h3 className="m-0 text-lg font-bold">{r.companyName}</h3>
              <span className="text-sm text-muted">{[r.contactName, r.jobTitle].filter(Boolean).join(' · ')} · <span className="select-all">{r.email}</span></span>
              <span className="text-sm text-muted">{[r.sector, r.hiringCountries].filter(Boolean).join(' · ')}</span>
              {r.website && <a href={r.website} target="_blank" rel="noreferrer noopener" className="self-start text-sm font-semibold">{r.website}</a>}
            </div>
            {r.message && <p className="m-0 rounded-xl bg-offwhite px-4 py-3 text-sm leading-relaxed">{r.message}</p>}
            {known && <p className="m-0 text-sm font-semibold text-danger">This company is already on Nyota. Approving adds this person to it: check the email address first.</p>}
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={busy === r.id} className="btn rounded-xl bg-green px-4 text-[15px] text-white hover:bg-ink hover:text-white" onClick={() => approve(r)}>Approve and send access code</button>
              <button type="button" disabled={busy === r.id} className="btn-small" onClick={() => decide(r.id, () => db.rejectCompanyRegistration(r.id))}>Decline</button>
            </div>
          </article>
        );
      })}
    </section>
  );
}

function CompanyCard({ company, members, onNotice }: {
  company: Company; members: Invitation[]; onNotice: (msg: string, tone?: 'green' | 'danger') => void;
}) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const isOwner = Boolean(useSession()?.isOwner);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const invite = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const inv = await db.inviteCompanyMember({ companyId: company.id, email });
      setEmail('');
      onNotice(inv.accessCode ? `${inv.email} added. Send them their access code ${inv.accessCode}.` : `${inv.email} added.`);
    } catch (err) {
      onNotice((err as Error).message, 'danger');
    } finally {
      setBusy(false);
    }
  };
  const accepted = members.filter((m) => m.status === 'Accepted').length;
  return (
    <article className="card flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 className="m-0 flex-1 text-lg font-bold">{company.name}</h2>
        <Link to={`/admin/companies/${company.id}`} className="btn-small text-[13px]">Open company space</Link>
        <span className="text-sm tabular-nums text-muted">{accepted} of {members.length} members signed in</span>
        {isOwner && (confirmDelete ? (
          <span className="flex gap-2">
            <button type="button" className="btn-small border-danger text-[13px] text-danger hover:border-danger hover:text-danger"
              onClick={() => db.deleteCompany(company.id).then(() => onNotice(`${company.name} deleted`), (e: Error) => onNotice(e.message, 'danger'))}>
              Delete company and its data
            </button>
            <button type="button" className="btn-small text-[13px]" onClick={() => setConfirmDelete(false)}>Keep</button>
          </span>
        ) : (
          <button type="button" className="btn-small text-[13px] text-danger hover:text-danger" onClick={() => setConfirmDelete(true)}>Delete…</button>
        ))}
      </div>
      <LogoEditor target={{ kind: 'company', id: company.id }} name={company.name} logoUrl={company.logoUrl}
        showOnSite={company.showOnSite} onNotice={onNotice} />
      {members.length > 0 && (
        <ul className="m-0 flex list-none flex-col p-0">
          {members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-3 border-b border-line-soft py-2.5 text-sm last:border-b-0">
              <span className="min-w-0 flex-1 truncate font-semibold">{m.email}</span>
              {(m.status === 'Invited' || isOwner) && m.accessCode && <CopyCode code={m.accessCode} />}
              {(m.status === 'Invited' || isOwner) && m.accessCode && <SendCodeButton email={m.email} kind="company" onNotice={onNotice} />}
              <Badge tone={m.status === 'Accepted' ? 'green' : 'orange'}>{m.status === 'Accepted' ? 'Signed in' : 'Invited'}</Badge>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={invite} className="flex flex-wrap gap-2">
        <label htmlFor={`inv-${company.id}`} className="sr-only">Work email of a colleague at {company.name}</label>
        <input id={`inv-${company.id}`} type="email" required placeholder="name@company.com" className="field min-w-0 flex-1 text-[15px]"
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <button type="submit" disabled={busy} className="btn-small">Add colleague</button>
      </form>
    </article>
  );
}
