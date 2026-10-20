import { Link } from 'react-router-dom';
import type { Candidate } from '../lib/db';
import { experienceLine, formatMonth, fullName, initials, shortSchool } from '../lib/candidate';
import { Star } from './icons';

const cols = 'xl:grid-cols-[2.2fr_1.8fr_1.3fr_1fr_1fr_150px]';

export function CandidateTable({ rows, shortlisted, onToggle }: {
  rows: Candidate[]; shortlisted: string[]; onToggle: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface" role="table" aria-label="Candidates">
      <div role="row" className={`hidden gap-4 border-b border-line px-6 py-3.5 text-xs font-bold uppercase tracking-[0.06em] text-muted xl:grid ${cols}`}>
        <span role="columnheader">Candidate</span><span role="columnheader">Targets</span><span role="columnheader">Experience · languages</span>
        <span role="columnheader">Type</span><span role="columnheader">Available</span><span role="columnheader"><span className="sr-only">Actions</span></span>
      </div>
      {rows.length === 0 && <p className="m-0 px-6 py-10 text-center text-[15px] text-muted">No candidate matches these filters.</p>}
      {rows.map((c) => {
        const on = shortlisted.includes(c.id);
        const name = fullName(c);
        return (
          <div role="row" key={c.id} className={`grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-3 border-b border-line-soft px-4 py-[18px] text-sm last:border-b-0 sm:px-6 xl:grid ${cols}`}>
            <Link role="cell" to={`/company/candidates/${c.id}`} className="flex min-w-0 items-center gap-3 text-ink no-underline hover:text-ink">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-line bg-offwhite font-display text-[15px]">{initials(c)}</span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[15px] font-bold hover:underline">{name}</span>
                <span className="text-muted">{shortSchool(c.school)} · MBA {c.graduationYear}</span>
              </span>
            </Link>
            <span role="cell" className="col-span-2 flex flex-col gap-0.5 xl:col-span-1">
              <span className="font-semibold">{c.functions.join(', ')}</span><span className="text-muted">{c.sectors.join(', ')}</span>
            </span>
            <span role="cell" className="col-span-2 flex flex-col gap-0.5 xl:col-span-1">
              <span className="font-semibold">{experienceLine(c) || '—'}</span><span className="text-muted">{c.languages.join(', ')}</span>
            </span>
            <span role="cell" className="hidden xl:block">{c.positionType}</span>
            <span role="cell" className="hidden xl:block">{formatMonth(c.availableFrom, true)}</span>
            <span role="cell" className="col-span-2 flex items-center justify-end gap-2 xl:col-span-1 xl:row-start-auto">
              <span className="mr-auto text-muted xl:hidden">{c.positionType} · {formatMonth(c.availableFrom, true)}</span>
              <button type="button" aria-pressed={on} aria-label={on ? `Remove ${name} from shortlist` : `Shortlist ${name}`}
                onClick={() => onToggle(c.id)}
                className={`flex size-11 items-center justify-center rounded-field border ${on ? 'border-ink bg-ink text-orange' : 'border-line-strong bg-surface text-ink hover:border-ink'}`}>
                <Star fill={on ? '#FD790C' : 'none'} />
              </button>
              <Link to={`/company/candidates/${c.id}`} className="btn-small text-[13px]">Open</Link>
            </span>
          </div>
        );
      })}
    </div>
  );
}
