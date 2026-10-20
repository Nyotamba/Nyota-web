import { useMemo, useState } from 'react';
import { CompanyShell } from './CompanyShell';
import { CandidateTable } from '../../components/CandidateTable';
import { ChipGroup } from '../../components/Chip';
import { Search, Filter, Close } from '../../components/icons';
import { db, type CandidateFilters } from '../../lib/db';
import { useDbQuery } from '../../lib/useDb';
import { useSession } from '../../App';
import { applyFilters, emptyFilters } from '../../lib/candidate';
import { FUNCTIONS, LANGUAGES, PAGE_SIZE, SECTORS } from '../../config/constants';

export default function CompanyCandidates() {
  const companyId = useSession()!.companyId!;
  const { data: all } = useDbQuery(() => db.listVisibleCandidates());
  const { data: shortlist = [] } = useDbQuery(() => db.listShortlist(companyId), [companyId]);
  const [f, setF] = useState<CandidateFilters>(emptyFilters);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const update = (patch: Partial<CandidateFilters>) => { setF({ ...f, ...patch }); setPage(1); };
  const rows = useMemo(() => applyFilters(all ?? [], f), [all, f]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const activeCount = f.functions.length + (f.minYears ? 1 : 0) + [f.search, f.sector, f.language, f.availableBy].filter(Boolean).length + (f.positionType !== 'Any' ? 1 : 0);

  return (
    <CompanyShell>
      <div className="flex flex-col lg:min-h-[calc(100vh-72px)] lg:flex-row">
        <aside aria-label="Filters" className={`${showFilters ? 'flex' : 'hidden'} shrink-0 flex-col gap-6 border-b border-line bg-surface px-4 py-8 sm:px-7 lg:flex lg:w-[320px] lg:border-b-0 lg:border-r`}>
          <div className="flex items-center justify-between lg:hidden">
            <span className="text-lg font-bold">Filters</span>
            <button type="button" className="btn-small" aria-label="Hide filters" onClick={() => setShowFilters(false)}><Close /></button>
          </div>
          <label className="label" htmlFor="f-search">Search
            <span className="flex items-center gap-2.5 rounded-field border border-line-strong px-3.5 focus-within:border-ink">
              <Search className="text-muted" />
              <input id="f-search" type="search" placeholder="Name, school, keyword" value={f.search} onChange={(e) => update({ search: e.target.value })}
                className="min-h-[44px] min-w-0 flex-1 border-none bg-transparent text-[15px] font-normal outline-none" />
            </span>
          </label>
          <ChipGroup size="sm" label="Function" options={FUNCTIONS} value={f.functions} onChange={(v) => update({ functions: v })} />
          <div role="group" aria-label="Work experience" className="flex flex-col gap-2.5">
            <div className="text-sm font-semibold">Work experience</div>
            <div className="grid grid-cols-4 overflow-hidden rounded-field border border-line-strong">
              {([[0, 'Any'], [3, '3+'], [5, '5+'], [8, '8+']] as const).map(([y, label]) => (
                <button key={y} type="button" aria-pressed={f.minYears === y} onClick={() => update({ minYears: y })}
                  className={`min-h-[44px] text-[13px] font-semibold ${f.minYears === y ? 'bg-ink text-offwhite' : 'bg-surface text-ink hover:bg-offwhite'}`}>{label}</button>
              ))}
            </div>
          </div>
          <label className="label" htmlFor="f-sector">Sector
            <select id="f-sector" className="field text-[15px]" value={f.sector} onChange={(e) => update({ sector: e.target.value })}>
              <option value="">Any sector</option>{SECTORS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label className="label" htmlFor="f-lang">Language
            <select id="f-lang" className="field text-[15px]" value={f.language} onChange={(e) => update({ language: e.target.value })}>
              <option value="">Any language</option>{LANGUAGES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <div role="group" aria-label="Position type" className="flex flex-col gap-2.5">
            <div className="text-sm font-semibold">Position type</div>
            <div className="grid grid-cols-3 overflow-hidden rounded-field border border-line-strong">
              {(['Internship', 'Full-time', 'Any'] as const).map((t) => (
                <button key={t} type="button" aria-pressed={f.positionType === t} onClick={() => update({ positionType: t })}
                  className={`min-h-[44px] text-[13px] font-semibold ${f.positionType === t ? 'bg-ink text-offwhite' : 'bg-surface text-ink hover:bg-offwhite'}`}>{t}</button>
              ))}
            </div>
          </div>
          <label className="label" htmlFor="f-avail">Available by
            <input id="f-avail" type="month" className="field text-[15px]" value={f.availableBy} onChange={(e) => update({ availableBy: e.target.value })} />
          </label>
          <button type="button" className="btn-small mt-auto" onClick={() => { setF(emptyFilters); setPage(1); }}>Clear all filters</button>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-5 px-4 py-9 md:px-10">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-1 flex-col gap-1">
              <h1 className="m-0 font-display text-[40px] font-normal tracking-display">Candidates</h1>
              <div className="text-[15px] text-muted" aria-live="polite">Showing {visible.length} of {rows.length} verified profiles{rows.length !== (all?.length ?? 0) ? ` (${all?.length} in total)` : ''}</div>
            </div>
            <button type="button" className="btn-small lg:hidden" aria-expanded={showFilters} onClick={() => setShowFilters((s) => !s)}>
              <Filter />Filters{activeCount ? ` · ${activeCount}` : ''}
            </button>
            <label htmlFor="f-sort" className="flex items-center gap-2 text-sm font-semibold">Sort
              <select id="f-sort" className="min-h-[44px] rounded-field border border-line-strong bg-surface px-3 text-sm font-normal" value={f.sort} onChange={(e) => update({ sort: e.target.value as CandidateFilters['sort'] })}>
                <option value="updated">Recently updated</option><option value="graduation">Graduation year</option><option value="availability">Availability</option>
              </select>
            </label>
          </div>

          {all ? <CandidateTable rows={visible} shortlisted={shortlist} onToggle={(id) => db.toggleShortlist(companyId, id)} />
            : <p className="text-muted">Loading candidates…</p>}

          <nav aria-label="Pagination" className="flex items-center justify-between text-sm text-muted">
            <span>Page {current} of {pages}</span>
            <span className="flex gap-2">
              <button type="button" className="btn-small disabled:border-line disabled:text-[#7F948E]" disabled={current <= 1} onClick={() => setPage(current - 1)}>Previous</button>
              <button type="button" className="btn-small disabled:border-line disabled:text-[#7F948E]" disabled={current >= pages} onClick={() => setPage(current + 1)}>Next</button>
            </span>
          </nav>
        </div>
      </div>
    </CompanyShell>
  );
}
