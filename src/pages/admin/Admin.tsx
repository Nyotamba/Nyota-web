import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AdminShell } from './AdminShell';
import { Badge } from '../../components/Badge';
import { Notice } from '../../components/Notice';
import { CopyCode } from '../../components/CopyCode';
import { db } from '../../lib/db';
import { useDbQuery } from '../../lib/useDb';
import { formatDate, formatKb, fullName, shortSchool } from '../../lib/candidate';

const cols = 'md:grid-cols-[32px_2fr_1.6fr_1fr_1.2fr_190px]';
const NEW = '__new__';

export default function Admin() {
  const { data: queue } = useDbQuery(() => db.listVerificationQueue());
  const { data: companies = [] } = useDbQuery(() => db.listCompanies());
  const { data: invitations = [] } = useDbQuery(() => db.listInvitations());
  const [selected, setSelected] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState('co1');
  const [newCompany, setNewCompany] = useState('');
  const [email, setEmail] = useState('');

  const verifiable = (queue ?? []).filter((c) => c.cv).map((c) => c.id);
  const sel = selected.filter((id) => verifiable.includes(id));
  const allOn = verifiable.length > 0 && sel.length === verifiable.length;

  const verify = async (ids: string[]) => {
    await db.verifyCandidates(ids);
    setSelected([]);
    setNotice(ids.length === 1 ? 'Profile verified. It is now visible to companies.' : `${ids.length} profiles verified.`);
  };
  const invite = async (e: FormEvent) => {
    e.preventDefault();
    const isNew = companyId === NEW;
    const inv = await db.inviteCompanyMember({ companyId: isNew ? undefined : companyId, newCompanyName: isNew ? newCompany : undefined, email });
    if (isNew) setCompanyId(inv.companyId);
    setEmail('');
    setNewCompany('');
    setNotice(
      inv.accessCode
        ? `Invitation ready. Send ${inv.email} their access code ${inv.accessCode} (shown under Recent invitations).`
        : inv.emailSent
          ? `Invitation e-mailed to ${inv.email}`
          : `Invitation recorded for ${inv.email}. Tell them to create their account on the site with this address.`,
    );
  };
  const companyName = (id: string) => companies.find((c) => c.id === id)?.name ?? '—';

  return (
    <AdminShell>
      <div className="mx-auto grid max-w-page items-start gap-7 px-4 py-10 md:px-10 xl:grid-cols-12">
        <section className="flex min-w-0 flex-col gap-[18px] xl:col-span-8">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-1 flex-col gap-1">
              <h1 className="m-0 font-display text-[34px] font-normal tracking-display md:text-[40px]">Waiting for verification</h1>
              <div className="text-[15px] text-muted">Profiles with consent given, not yet visible to companies.</div>
            </div>
            <button type="button" className="btn-small" disabled={!sel.length} onClick={() => verify(sel)}>
              Verify selected{sel.length ? ` · ${sel.length}` : ''}
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-line bg-surface">
            <div className={`hidden items-center gap-4 border-b border-line px-[22px] py-3.5 text-xs font-bold uppercase tracking-[0.06em] text-muted md:grid ${cols}`}>
              <input type="checkbox" aria-label="Select all" className="m-0 size-[18px] accent-ink" checked={allOn}
                onChange={() => setSelected(allOn ? [] : verifiable)} />
              <span>Candidate</span><span>School</span><span>CV</span><span>Consent</span><span />
            </div>
            {queue?.length === 0 && <p className="m-0 px-6 py-10 text-center text-[15px] text-muted">Every consented profile has been verified.</p>}
            {queue?.map((c) => {
              const name = fullName(c);
              return (
                <div key={c.id} className={`grid grid-cols-[32px_1fr] items-center gap-x-4 gap-y-2 border-b border-line-soft px-4 py-4 text-sm last:border-b-0 md:px-[22px] md:grid ${cols}`}>
                  <input type="checkbox" aria-label={`Select ${name}`} className="m-0 size-[18px] accent-ink" disabled={!c.cv}
                    checked={sel.includes(c.id)} onChange={() => setSelected(sel.includes(c.id) ? sel.filter((x) => x !== c.id) : [...sel, c.id])} />
                  <span className="flex min-w-0 flex-col gap-0.5"><span className="text-[15px] font-bold">{name}</span><span className="truncate text-muted">{c.email}</span></span>
                  <span className="col-start-2 md:col-start-auto">{shortSchool(c.school)} · MBA {c.graduationYear}</span>
                  <span className={`col-start-2 font-semibold md:col-start-auto ${c.cv ? 'text-green' : 'text-danger'}`}>{c.cv ? `PDF · ${formatKb(c.cv.sizeBytes)}` : 'Missing'}</span>
                  <span className="col-start-2 text-muted md:col-start-auto">{c.consent!.version} · {formatDate(c.consent!.givenAt, { day: 'numeric', month: 'short' })}</span>
                  <span className="col-start-2 flex gap-2 md:col-start-auto md:justify-end">
                    <Link to={`/admin/review/${c.id}`} className="btn-small text-[13px]">Review</Link>
                    <button type="button" disabled={!c.cv} title={c.cv ? undefined : 'A CV is required before verification'}
                      onClick={() => verify([c.id])}
                      className="btn min-h-[44px] rounded-field bg-green px-3.5 text-[13px] text-white hover:bg-[#053129] disabled:bg-line disabled:text-muted">
                      Verify
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <aside className="flex flex-col gap-5 xl:col-span-4">
          <form onSubmit={invite} className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-6">
            <h2 className="m-0 text-xl font-bold">Invite a company member</h2>
            <label className="label" htmlFor="inv-company">Company
              <select id="inv-company" className="field text-[15px]" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                <option value={NEW}>+ New company</option>
              </select>
            </label>
            {companyId === NEW && (
              <label className="label" htmlFor="inv-newco">Company name
                <input id="inv-newco" required className="field text-[15px]" value={newCompany} onChange={(e) => setNewCompany(e.target.value)} />
              </label>
            )}
            <label className="label" htmlFor="inv-email">Work e-mail
              <input id="inv-email" type="email" required placeholder="name@company.com" className="field text-[15px]" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <button type="submit" className="btn rounded-xl bg-ink text-[15px] text-offwhite hover:bg-green">Send invitation</button>
            <p className="m-0 text-[13px] leading-normal text-muted">
              {db.mode === 'live'
                ? 'An access code appears under Recent invitations: send it to them with the site address. They create their account with their invited e-mail and this code.'
                : 'In this demo the invitation is recorded but no e-mail is sent.'}
            </p>
          </form>

          <section className="flex flex-col gap-1 rounded-2xl border border-line bg-surface px-6 py-5">
            <h2 className="overline m-0 mb-2">Recent invitations</h2>
            {invitations.slice(0, 6).map((i) => (
              <div key={i.id} className="flex flex-col gap-2 border-b border-line-soft py-3 text-sm last:border-b-0">
                <div className="flex items-center gap-3">
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5"><span className="truncate font-semibold">{i.email}</span><span className="text-muted">{companyName(i.companyId)}</span></span>
                  <Badge tone={i.status === 'Accepted' ? 'green' : 'orange'}>{i.status}</Badge>
                </div>
                {i.accessCode && i.status === 'Invited' && (
                  <span className="flex flex-wrap items-center gap-2 text-[13px] text-muted">Access code <CopyCode code={i.accessCode} /></span>
                )}
              </div>
            ))}
          </section>
        </aside>
      </div>
      <Notice message={notice} onDone={() => setNotice(null)} />
    </AdminShell>
  );
}
