import { useState, type FormEvent } from 'react';
import { AdminShell } from './AdminShell';
import { Badge } from '../../components/Badge';
import { CopyCode } from '../../components/CopyCode';
import { LogoEditor } from '../../components/LogoEditor';
import { SendCodeButton } from '../../components/SendCodeButton';
import { Notice } from '../../components/Notice';
import { db, type Company, type Invitation } from '../../lib/db';
import { useDbQuery } from '../../lib/useDb';

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
      setNotice({ msg: `${co.name} added. Invite its members below.` });
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
              Companies taking part in the fair: logos, invited members and the access codes to send them. Show a logo on the homepage
              only once the company has confirmed its participation in writing.
            </div>
          </div>
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
              Then invite its members: each gets an access code to create their account with their work e-mail.
            </p>
          </form>
        </aside>
      </div>
      <Notice message={notice?.msg ?? null} tone={notice?.tone} onDone={() => setNotice(null)} />
    </AdminShell>
  );
}

function CompanyCard({ company, members, onNotice }: {
  company: Company; members: Invitation[]; onNotice: (msg: string, tone?: 'green' | 'danger') => void;
}) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const invite = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const inv = await db.inviteCompanyMember({ companyId: company.id, email });
      setEmail('');
      onNotice(inv.accessCode ? `${inv.email} invited. Send them their access code ${inv.accessCode}.` : `${inv.email} invited.`);
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
        <span className="text-sm tabular-nums text-muted">{accepted} of {members.length} members signed in</span>
      </div>
      <LogoEditor target={{ kind: 'company', id: company.id }} name={company.name} logoUrl={company.logoUrl}
        showOnSite={company.showOnSite} onNotice={onNotice} />
      {members.length > 0 && (
        <ul className="m-0 flex list-none flex-col p-0">
          {members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-3 border-b border-line-soft py-2.5 text-sm last:border-b-0">
              <span className="min-w-0 flex-1 truncate font-semibold">{m.email}</span>
              {m.status === 'Invited' && m.accessCode && <CopyCode code={m.accessCode} />}
              {m.status === 'Invited' && m.accessCode && <SendCodeButton email={m.email} kind="company" onNotice={onNotice} />}
              <Badge tone={m.status === 'Accepted' ? 'green' : 'orange'}>{m.status === 'Accepted' ? 'Signed in' : 'Invited'}</Badge>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={invite} className="flex flex-wrap gap-2">
        <label htmlFor={`inv-${company.id}`} className="sr-only">Work e-mail to invite to {company.name}</label>
        <input id={`inv-${company.id}`} type="email" required placeholder="name@company.com" className="field min-w-0 flex-1 text-[15px]"
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <button type="submit" disabled={busy} className="btn-small">Invite member</button>
      </form>
    </article>
  );
}
