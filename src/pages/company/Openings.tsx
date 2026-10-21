import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { CompanyShell } from './CompanyShell';
import { Badge } from '../../components/Badge';
import { Notice } from '../../components/Notice';
import { db, CONTRACTS, type Opening, type OpeningInput } from '../../lib/db';
import { useDbQuery } from '../../lib/useDb';
import { useSession } from '../../App';
import { applyByLabel } from '../student/Openings';
import { formatDate } from '../../lib/candidate';
import { useProfileOptions } from '../../lib/useOptions';

const EMPTY: OpeningInput = { title: '', contract: 'Full-time', function: '', location: '', description: '', applyUrl: '', applyBy: null, published: true, skills: [] };

export function OpeningsManager({ companyId }: { companyId: string }) {
  const { data: openings, error } = useDbQuery(() => db.listOpenings());
  const [editing, setEditing] = useState<string | null>(null);
  const [f, setF] = useState<OpeningInput>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ msg: string; tone?: 'green' | 'danger' } | null>(null);
  const mine = (openings ?? []).filter((o) => o.isMine && o.companyId === companyId);
  const set = <K extends keyof OpeningInput>(k: K, v: OpeningInput[K]) => setF((x) => ({ ...x, [k]: v }));

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
  const submit = (e: FormEvent) => {
    e.preventDefault();
    run(async () => {
      await db.saveOpening(companyId, f, editing ?? undefined);
      setF(EMPTY);
      setEditing(null);
    }, editing ? 'Opening updated' : 'Opening published: students can see it now');
  };
  const edit = (o: Opening) => {
    setEditing(o.id);
    setF({ title: o.title, contract: o.contract, function: o.function, location: o.location, description: o.description, applyUrl: o.applyUrl, applyBy: o.applyBy, published: o.published, skills: o.skills });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <div className="mx-auto grid max-w-page items-start gap-7 px-4 py-10 md:px-10 xl:grid-cols-12">
        <section className="flex min-w-0 flex-col gap-5 xl:col-span-8">
          <div className="flex flex-col gap-1">
            <h1 className="m-0 font-display text-[40px] tracking-display">Openings</h1>
            <div className="max-w-[75ch] text-[15px] text-muted">
              Post the roles you are hiring for. Students click “I’m interested”; you see their verified profiles here and can request
              an interview.
            </div>
          </div>
          {error && <p className="card m-0 p-6 text-danger">The openings could not load: {error.message}</p>}
          {openings && mine.length === 0 && <p className="card m-0 p-7 text-[15px] text-muted">No opening yet. Post your first one with the form.</p>}
          {mine.map((o) => (
            <OpeningRow key={o.id} o={o} busy={busy} onEdit={() => edit(o)}
              onToggle={() => run(() => db.saveOpening(companyId, { ...o, published: !o.published }, o.id), o.published ? 'Opening hidden from students' : 'Opening published')}
              onDelete={() => run(() => db.deleteOpening(o.id), 'Opening deleted')} />
          ))}
        </section>

        <aside className="xl:col-span-4">
          <form onSubmit={submit} className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-6">
            <h2 className="m-0 text-xl font-bold">{editing ? 'Edit the opening' : 'Post an opening'}</h2>
            <label className="label" htmlFor="op-title">Role
              <input id="op-title" required minLength={3} maxLength={120} className="field text-[15px]" placeholder="Investment associate"
                value={f.title} onChange={(e) => set('title', e.target.value)} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="label" htmlFor="op-contract">Contract
                <select id="op-contract" className="field text-[15px]" value={f.contract} onChange={(e) => set('contract', e.target.value as OpeningInput['contract'])}>
                  {CONTRACTS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
              <label className="label" htmlFor="op-function">Function
                <input id="op-function" maxLength={80} className="field text-[15px]" placeholder="Finance" value={f.function} onChange={(e) => set('function', e.target.value)} />
              </label>
            </div>
            <label className="label" htmlFor="op-location">Location
              <input id="op-location" maxLength={120} className="field text-[15px]" placeholder="Dakar, Senegal" value={f.location} onChange={(e) => set('location', e.target.value)} />
            </label>
            <label className="label" htmlFor="op-desc">Description
              <textarea id="op-desc" rows={5} maxLength={2000} className="field text-[15px]" value={f.description} onChange={(e) => set('description', e.target.value)} />
            </label>
            <SkillPicker value={f.skills} onChange={(v) => set('skills', v)} />
            <div className="grid grid-cols-2 gap-3">
              <label className="label" htmlFor="op-by">Apply by <span className="font-normal text-muted">(optional)</span>
                <input id="op-by" type="date" className="field text-[15px]" value={f.applyBy ?? ''} onChange={(e) => set('applyBy', e.target.value || null)} />
              </label>
              <label className="label" htmlFor="op-url">Job page <span className="font-normal text-muted">(optional)</span>
                <input id="op-url" type="url" className="field text-[15px]" placeholder="https://…" value={f.applyUrl} onChange={(e) => set('applyUrl', e.target.value)} />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={f.published} onChange={(e) => set('published', e.target.checked)} className="size-4" />
              Visible to students
            </label>
            <div className="flex gap-2">
              <button type="submit" disabled={busy} className="btn flex-1 rounded-xl bg-ink text-[15px] text-offwhite hover:bg-green">
                {editing ? 'Save changes' : 'Publish opening'}
              </button>
              {editing && <button type="button" className="btn-small" onClick={() => { setEditing(null); setF(EMPTY); }}>Cancel</button>}
            </div>
          </form>
        </aside>
      </div>
      <Notice message={notice?.msg ?? null} tone={notice?.tone} onDone={() => setNotice(null)} />
    </>
  );
}

function OpeningRow({ o, busy, onEdit, onToggle, onDelete }: { o: Opening; busy: boolean; onEdit: () => void; onToggle: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const { data: people } = useDbQuery(() => (open ? db.listOpeningInterest(o.id) : Promise.resolve(null)), [open, o.id]);
  return (
    <article className={`card flex flex-col gap-3 p-6 ${o.published ? '' : 'opacity-70'}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={o.contract === 'Full-time' ? 'neutral' : 'orange'}>{o.contract}</Badge>
        {!o.published && <Badge tone="neutral">Hidden</Badge>}
        <span className="text-sm text-muted">{[o.function, o.location, o.applyBy && `apply by ${applyByLabel(o.applyBy)}`].filter(Boolean).join(' · ')}</span>
      </div>
      <h2 className="m-0 text-xl font-bold leading-snug">{o.title}</h2>
      {o.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {o.skills.map((s) => <span key={s} className="rounded-full bg-offwhite px-2.5 py-1 text-[12px] font-semibold text-ink">{s}</span>)}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)}
          className="btn rounded-full bg-green px-5 text-[15px] text-white hover:bg-ink hover:text-white">
          {o.interested ?? 0} interested {open ? '▲' : '▼'}
        </button>
        <button type="button" className="btn-small" onClick={onEdit}>Edit</button>
        <button type="button" className="btn-small" disabled={busy} onClick={onToggle}>{o.published ? 'Hide' : 'Publish'}</button>
        {confirm ? (
          <>
            <button type="button" disabled={busy} className="btn-small border-danger text-danger hover:border-danger hover:text-danger" onClick={onDelete}>Delete</button>
            <button type="button" className="btn-small" onClick={() => setConfirm(false)}>Keep</button>
          </>
        ) : (
          <button type="button" className="btn-small text-danger hover:text-danger" onClick={() => setConfirm(true)}>Delete…</button>
        )}
      </div>
      {open && (
        <ul className="m-0 flex list-none flex-col overflow-hidden rounded-xl border border-line p-0">
          {!people && <li className="px-4 py-3 text-sm text-muted">Loading…</li>}
          {people?.length === 0 && <li className="px-4 py-3 text-sm text-muted">No student has shown interest yet.</li>}
          {people?.map((p) => (
            <li key={p.candidateId} className="flex flex-col gap-2 border-b border-line-soft px-4 py-3 text-sm last:border-b-0">
              <div className="flex flex-wrap items-center gap-3">
                <Link to={`/company/candidates/${p.candidateId}`} className="font-semibold">{p.name}</Link>
                <span className="text-muted">{[p.school, p.programme, p.graduationYear].filter(Boolean).join(' · ')}</span>
                {o.skills.length > 0 && (
                  <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-bold ${p.matched === o.skills.length ? 'bg-green text-white' : 'bg-offwhite text-ink'}`}>
                    {p.matched}/{o.skills.length} skills
                  </span>
                )}
                <span className="ml-auto text-[12px] text-muted">{formatDate(p.interestedAt)}</span>
              </div>
              {o.skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5" aria-label="Skills">
                  {o.skills.map((s) => {
                    const ok = p.matchedSkills.some((m) => m.toLowerCase() === s.toLowerCase());
                    return (
                      <span key={s} className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${ok ? 'bg-green text-white' : 'border border-line-strong text-muted line-through decoration-1'}`}>
                        {ok ? '✓ ' : ''}{s}<span className="sr-only">{ok ? ' (has it)' : ' (missing)'}</span>
                      </span>
                    );
                  })}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

/** Skills the company wants: chips from the club lists (matched against profiles) plus free text. */
function SkillPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const { functions, sectors, languages } = useProfileOptions();
  const [other, setOther] = useState('');
  const has = (s: string) => value.some((v) => v.toLowerCase() === s.toLowerCase());
  const toggle = (s: string) => onChange(has(s) ? value.filter((v) => v.toLowerCase() !== s.toLowerCase()) : [...value, s]);
  const known = new Set([...functions, ...sectors, ...languages].map((x) => x.toLowerCase()));
  const free = value.filter((v) => !known.has(v.toLowerCase()));
  const add = () => {
    const s = other.trim();
    if (s && !has(s) && value.length < 15) onChange([...value, s]);
    setOther('');
  };
  const groups: [string, readonly string[]][] = [['Roles', functions], ['Sectors', sectors], ['Languages', languages]];
  return (
    <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
      <legend className="mb-1 text-sm font-bold">Skills you want to see <span className="font-normal text-muted">({value.length} chosen)</span></legend>
      {groups.map(([label, list]) => (
        <div key={label} className="flex flex-col gap-1.5">
          <span className="text-[12px] font-semibold uppercase tracking-overline text-muted">{label}</span>
          <div className="flex flex-wrap gap-1.5">
            {list.map((s) => (
              <button key={s} type="button" aria-pressed={has(s)} onClick={() => toggle(s)}
                className={`min-h-[32px] rounded-full border px-3 text-[13px] font-semibold ${has(s) ? 'border-ink bg-ink text-offwhite' : 'border-line-strong bg-surface text-ink hover:border-ink'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
      ))}
      <div className="flex flex-col gap-1.5">
        <span className="text-[12px] font-semibold uppercase tracking-overline text-muted">Other skills</span>
        <div className="flex gap-2">
          <input aria-label="Other skill" className="field flex-1 text-[14px]" placeholder="Financial modelling" maxLength={40} value={other}
            onChange={(e) => setOther(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
          <button type="button" className="btn-small" onClick={add}>Add</button>
        </div>
        {free.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {free.map((s) => (
              <button key={s} type="button" onClick={() => toggle(s)} aria-label={`Remove ${s}`}
                className="min-h-[32px] rounded-full border border-ink bg-ink px-3 text-[13px] font-semibold text-offwhite">{s} ×</button>
            ))}
          </div>
        )}
        <span className="text-[12px] text-muted">Roles, sectors and languages are matched with student profiles. Other skills are shown to students.</span>
      </div>
    </fieldset>
  );
}

export default function CompanyOpenings() {
  const companyId = useSession()!.companyId!;
  return <CompanyShell><OpeningsManager companyId={companyId} /></CompanyShell>;
}
