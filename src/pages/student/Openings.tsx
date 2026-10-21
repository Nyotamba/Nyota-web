import { useState } from 'react';
import { Link } from 'react-router-dom';
import { StudentShell } from './StudentShell';
import { Badge } from '../../components/Badge';
import { Notice } from '../../components/Notice';
import { db, CONTRACTS, type Contract, type Opening } from '../../lib/db';
import { useDbQuery } from '../../lib/useDb';
import { useSession } from '../../App';
import { isVisible } from '../../lib/candidate';

export const applyByLabel = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const closed = (o: Opening) => Boolean(o.applyBy && o.applyBy < new Date().toISOString().slice(0, 10));

export default function StudentOpenings() {
  const cid = useSession()?.candidateId;
  const { data: openings, error } = useDbQuery(() => db.listOpenings());
  const { data: me } = useDbQuery(() => (cid ? db.getCandidate(cid) : Promise.resolve(null)), [cid]);
  const [contract, setContract] = useState<Contract | ''>('');
  const [q, setQ] = useState('');
  const [mine, setMine] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ msg: string; tone?: 'green' | 'danger' } | null>(null);
  const visible = me ? isVisible(me) : true;
  const have = new Set(me ? [...me.functions, ...me.sectors, ...me.pastSectors, ...me.languages].map((x) => x.toLowerCase()) : []);

  const needle = q.trim().toLowerCase();
  const list = (openings ?? []).filter((o) =>
    (!contract || o.contract === contract) && (!mine || o.isInterested) &&
    (!needle || [o.title, o.companyName, o.function, o.location, o.description].join(' ').toLowerCase().includes(needle)));
  const count = (openings ?? []).filter((o) => o.isInterested).length;

  const toggle = async (o: Opening) => {
    setBusy(o.id);
    try {
      await db.setOpeningInterest(o.id, !o.isInterested);
      setNotice({
        msg: o.isInterested ? 'Interest withdrawn'
          : visible ? `${o.companyName} can now see that you are interested.`
            : `Saved. ${o.companyName} will see it as soon as your profile is verified and shared.`,
      });
    } catch (err) {
      setNotice({ msg: (err as Error).message, tone: 'danger' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <StudentShell>
      <div className="mx-auto flex max-w-page flex-col gap-6 px-4 py-10 md:px-10 xl:px-20">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-1 flex-col gap-1">
            <h1 className="m-0 font-display text-[40px] tracking-display">Openings</h1>
            <div className="max-w-[70ch] text-[15px] text-muted">
              Roles the companies of the fair are hiring for. Click “I’m interested”: the company sees your verified profile and can
              request an interview.
            </div>
          </div>
          <div role="group" aria-label="Show" className="grid grid-cols-2 overflow-hidden rounded-field border border-line-strong">
            {[['All openings', false], [`My interests · ${count}`, true]].map(([label, value]) => (
              <button key={String(value)} type="button" aria-pressed={mine === value} onClick={() => setMine(value as boolean)}
                className={`min-h-[44px] px-4 text-sm font-semibold ${mine === value ? 'bg-ink text-offwhite' : 'bg-surface text-ink hover:bg-offwhite'}`}>
                {label as string}
              </button>
            ))}
          </div>
        </div>

        {!visible && (
          <p className="m-0 rounded-xl bg-sand px-5 py-4 text-sm leading-relaxed text-ink">
            You can already say “I’m interested”: companies will see it once your profile is verified and shared.
            Finish <Link to="/student/profile">your profile</Link> so it does not wait.
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <input type="search" aria-label="Search openings" placeholder="Search a role, company, country…" className="field max-w-[360px] flex-1 text-[15px]"
            value={q} onChange={(e) => setQ(e.target.value)} />
          <div role="group" aria-label="Contract" className="flex flex-wrap gap-2">
            {(['', ...CONTRACTS] as const).map((c) => (
              <button key={c || 'all'} type="button" aria-pressed={contract === c} onClick={() => setContract(c)}
                className={`min-h-[40px] rounded-full border px-4 text-sm font-semibold ${contract === c ? 'border-ink bg-ink text-offwhite' : 'border-line-strong bg-surface text-ink hover:border-ink'}`}>
                {c || 'All'}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="card m-0 p-6 text-danger">The openings could not load: {error.message}</p>}
        {!openings && !error && <p className="text-muted">Loading…</p>}
        {openings && list.length === 0 && (
          <p className="card m-0 p-7 text-[15px] text-muted">
            {openings.length === 0 ? 'Companies will publish their openings here before the fair.' : 'No opening matches your filters.'}
          </p>
        )}
        <div className="grid gap-4 lg:grid-cols-2">
          {list.map((o) => (
            <article key={o.id} className={`card flex flex-col gap-3 p-6 ${o.isInterested ? 'border-green' : ''}`}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={o.contract === 'Full-time' ? 'neutral' : 'orange'}>{o.contract}</Badge>
                {o.function && <span className="text-[13px] font-semibold text-muted">{o.function}</span>}
                {o.isInterested && <span className="ml-auto"><Badge tone="green" check>Interested</Badge></span>}
              </div>
              <div className="flex flex-col gap-0.5">
                <h2 className="m-0 text-xl font-bold leading-snug">{o.title}</h2>
                <span className="text-[15px] font-semibold text-muted">{o.companyName}</span>
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
                {o.location && <span>📍 {o.location}</span>}
                {o.applyBy && <span className={closed(o) ? 'text-danger' : ''}>{closed(o) ? 'Closed on' : 'Apply by'} {applyByLabel(o.applyBy)}</span>}
              </div>
              {o.description && <p className="m-0 line-clamp-4 text-[15px] leading-relaxed text-ink">{o.description}</p>}
              {o.skills.length > 0 && <Skills o={o} have={have} />}
              <div className="mt-auto flex flex-wrap items-center gap-3 pt-2">
                <button type="button" disabled={busy === o.id || (!o.isInterested && closed(o))} onClick={() => toggle(o)}
                  className={o.isInterested ? 'btn-small' : 'btn-primary text-[15px]'}>
                  {o.isInterested ? 'Withdraw interest' : 'I’m interested'}
                </button>
                {o.applyUrl && (
                  <a href={o.applyUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold">Apply on the company site ↗</a>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
      <Notice message={notice?.msg ?? null} tone={notice?.tone} onDone={() => setNotice(null)} />
    </StudentShell>
  );
}

function Skills({ o, have }: { o: Opening; have: Set<string> }) {
  const matched = o.skills.filter((s) => have.has(s.toLowerCase())).length;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12px] font-semibold text-muted">
        Skills wanted · <span className={matched > 0 ? 'text-green' : ''}>you have {matched} of {o.skills.length}</span>
      </span>
      <div className="flex flex-wrap gap-1.5">
        {o.skills.map((s) => {
          const ok = have.has(s.toLowerCase());
          return (
            <span key={s} className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${ok ? 'bg-green text-white' : 'bg-offwhite text-ink'}`}>
              {ok && '✓ '}{s}
            </span>
          );
        })}
      </div>
    </div>
  );
}
