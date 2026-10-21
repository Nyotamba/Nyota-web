import { useState } from 'react';
import { StudentShell } from './StudentShell';
import { CompanyCard } from '../../components/CompanyCard';
import { db } from '../../lib/db';
import { useDbQuery } from '../../lib/useDb';

type Filter = 'all' | 'interviews' | 'openings' | 'sessions';

export default function StudentCompanies() {
  const { data: companies, error } = useDbQuery(() => db.listFairCompanies());
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const all = companies ?? [];
  const needle = q.trim().toLowerCase();
  const list = all.filter((c) =>
    (filter === 'all' || (filter === 'interviews' ? c.interviewSlots > 0 : filter === 'openings' ? c.openings > 0 : c.sessions.length > 0)) &&
    (!needle || [c.name, c.sector, c.locations, c.about].join(' ').toLowerCase().includes(needle)));
  const filters: [Filter, string][] = [
    ['all', `All · ${all.length}`],
    ['sessions', `Presenting · ${all.filter((c) => c.sessions.length > 0).length}`],
    ['interviews', `Interviewing · ${all.filter((c) => c.interviewSlots > 0).length}`],
    ['openings', `Hiring · ${all.filter((c) => c.openings > 0).length}`],
  ];

  return (
    <StudentShell>
      <div className="mx-auto flex max-w-page flex-col gap-6 px-4 py-10 md:px-10 xl:px-20">
        <div className="flex flex-col gap-1">
          <h1 className="m-0 font-display text-[40px] tracking-display">Companies</h1>
          <div className="max-w-[70ch] text-[15px] text-muted">
            The companies at the Nyota Africa Career Fair: what they do, when they present, whether they run interviews, and the
            roles they are hiring for. Times are Barcelona time.
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input type="search" aria-label="Search companies" placeholder="Search a company, sector, country…" className="field max-w-[340px] flex-1 text-[15px]"
            value={q} onChange={(e) => setQ(e.target.value)} />
          <div role="group" aria-label="Filter" className="flex flex-wrap gap-2">
            {filters.map(([f, label]) => (
              <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}
                className={`min-h-[40px] rounded-full border px-4 text-sm font-semibold ${filter === f ? 'border-ink bg-ink text-offwhite' : 'border-line-strong bg-surface text-ink hover:border-ink'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {error && <p className="card m-0 p-6 text-danger">The companies could not load: {error.message}</p>}
        {!companies && !error && <p className="text-muted">Loading…</p>}
        {companies && list.length === 0 && (
          <p className="card m-0 p-7 text-[15px] text-muted">
            {all.length === 0 ? 'The companies of the fair will be announced here.' : 'No company matches your filters.'}
          </p>
        )}
        <div className="grid gap-5 xl:grid-cols-2">
          {list.map((c) => <CompanyCard key={c.id} c={c} />)}
        </div>
      </div>
    </StudentShell>
  );
}
