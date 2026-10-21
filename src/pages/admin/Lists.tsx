import { useState, type FormEvent, Fragment } from 'react';
import { AdminShell } from './AdminShell';
import { SchoolsPanel } from './Schools';
import { Notice } from '../../components/Notice';
import { db, type OptionKind } from '../../lib/db';
import { useDbQuery } from '../../lib/useDb';

type Tab = 'school' | OptionKind;
const TABS: [Tab, string][] = [['school', 'Schools'], ['function', 'Roles'], ['sector', 'Sectors'], ['language', 'Languages']];
const HELP: Record<OptionKind, string> = {
  function: 'Roles students target, also used in the company filters (e.g. Strategy, Finance).',
  sector: 'Sectors / industries students worked in or target, also used in the company filters.',
  language: 'Languages students can pick.',
};

/** Admin-managed lists that feed the student profile and the company filters. */
export default function AdminLists({ embedded = false }: { embedded?: boolean }) {
  const Wrap = embedded ? Fragment : AdminShell;
  const [tab, setTab] = useState<Tab>('school');
  return (
    <Wrap>
      <div className="mx-auto flex max-w-page flex-col gap-6 px-4 py-10 md:px-10">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-1 flex-col gap-1">
            <h1 className="m-0 font-display text-[34px] tracking-display md:text-[40px]">Lists</h1>
            <div className="text-[15px] text-muted">What students can pick in their profile, and companies filter on.</div>
          </div>
          <div role="tablist" aria-label="List" className="grid grid-cols-4 overflow-hidden rounded-field border border-line-strong">
            {TABS.map(([t, label]) => (
              <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => setTab(t)}
                className={`min-h-[44px] px-4 text-sm font-semibold ${tab === t ? 'bg-ink text-offwhite' : 'bg-surface text-ink hover:bg-offwhite'}`}>{label}</button>
            ))}
          </div>
        </div>
        {tab === 'school' ? <SchoolsPanel /> : <OptionsPanel key={tab} kind={tab} />}
      </div>
    </Wrap>
  );
}

function OptionsPanel({ kind }: { kind: OptionKind }) {
  const { data: items = [] } = useDbQuery(() => db.listOptions(kind), [kind]);
  const [name, setName] = useState('');
  const [confirm, setConfirm] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ msg: string; tone?: 'green' | 'danger' } | null>(null);
  const label = TABS.find(([t]) => t === kind)![1].replace(/s$/, '').toLowerCase();
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
      await db.addOption(kind, n);
      setName('');
    }, `${n} added`);
  };
  return (
    <div className="grid items-start gap-7 xl:grid-cols-12">
      <section className="flex min-w-0 flex-col gap-3 xl:col-span-8">
        <p className="m-0 text-sm text-muted">{HELP[kind]} {items.length} in the list.</p>
        <ul className="m-0 grid list-none overflow-hidden rounded-2xl border border-line bg-surface p-0 sm:grid-cols-2">
          {items.map((it) => (
            <li key={it} className="flex items-center gap-2 border-b border-line-soft px-5 py-3 text-[15px] sm:odd:border-r">
              <span className="min-w-0 flex-1 truncate font-semibold">{it}</span>
              {confirm === it ? (
                <span className="flex gap-1.5">
                  <button type="button" className="btn-small border-danger text-[13px] text-danger hover:border-danger hover:text-danger"
                    onClick={() => run(() => db.removeOption(kind, it), `${it} removed`).then(() => setConfirm(null))}>Remove</button>
                  <button type="button" className="btn-small text-[13px]" onClick={() => setConfirm(null)}>Keep</button>
                </span>
              ) : (
                <button type="button" className="btn-small text-[13px]" aria-label={`Remove ${it}`} onClick={() => setConfirm(it)}>Remove</button>
              )}
            </li>
          ))}
        </ul>
      </section>
      <aside className="xl:col-span-4">
        <form onSubmit={add} className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-6">
          <h2 className="m-0 text-xl font-bold">Add a {label}</h2>
          <label className="label" htmlFor={`opt-${kind}`}>Name
            <input id={`opt-${kind}`} required minLength={2} maxLength={80} className="field text-[15px]" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <button type="submit" className="btn rounded-xl bg-ink text-[15px] text-offwhite hover:bg-green">Add</button>
          <p className="m-0 text-[13px] leading-normal text-muted">Removing an item only takes it out of the list: students keep it on their profile.</p>
        </form>
      </aside>
      <Notice message={notice?.msg ?? null} tone={notice?.tone} onDone={() => setNotice(null)} />
    </div>
  );
}
