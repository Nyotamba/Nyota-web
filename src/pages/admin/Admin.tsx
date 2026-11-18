import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminShell } from './AdminShell';
import { Notice } from '../../components/Notice';
import { db } from '../../lib/db';
import { useDbQuery } from '../../lib/useDb';
import { formatDate, formatKb, fullName, shortSchool } from '../../lib/candidate';

const cols = 'md:grid-cols-[32px_2fr_1.6fr_1fr_1.2fr_190px]';

export default function Admin() {
  const { data: queue } = useDbQuery(() => db.listVerificationQueue());
  const [selected, setSelected] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const verifiable = (queue ?? []).filter((c) => c.cv).map((c) => c.id);
  const sel = selected.filter((id) => verifiable.includes(id));
  const allOn = verifiable.length > 0 && sel.length === verifiable.length;

  const verify = async (ids: string[]) => {
    await db.verifyCandidates(ids);
    setSelected([]);
    setNotice(ids.length === 1 ? 'Profile verified. It is now visible to companies.' : `${ids.length} profiles verified.`);
  };

  return (
    <AdminShell>
      <div className="mx-auto max-w-page px-4 py-10 md:px-10">
        <section className="flex min-w-0 flex-col gap-[18px]">
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
      </div>
      <Notice message={notice} onDone={() => setNotice(null)} />
    </AdminShell>
  );
}
