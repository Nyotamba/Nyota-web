import { Link } from 'react-router-dom';
import type { FairCompany } from '../lib/db';
import { isoToFairInput } from '../lib/time';
import { Badge } from './Badge';

const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { timeZone: 'Europe/Madrid', weekday: 'short', day: 'numeric', month: 'short' });
const hm = (iso: string) => isoToFairInput(iso).slice(11, 16);
const initials = (name: string) => name.replace(/\(.*?\)/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

/** One company of the fair, as students see it (also the company's own preview). */
export function CompanyCard({ c, links = true }: { c: FairCompany; links?: boolean }) {
  const interviews = c.interviewSlots > 0;
  return (
    <article className="card flex flex-col gap-5 p-6">
      <div className="flex items-start gap-4">
        {c.logoUrl
          ? <img src={c.logoUrl} alt="" className="size-14 shrink-0 rounded-xl border border-line bg-white object-contain p-1.5" />
          : <span aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-ink font-display text-xl text-offwhite">{initials(c.name)}</span>}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 className="m-0 text-xl font-bold leading-snug">{c.name}</h2>
          <span className="text-sm text-muted">{[c.sector, c.locations].filter(Boolean).join(' · ') || 'At the Nyota Africa Career Fair'}</span>
          {c.website && <a href={c.website} target="_blank" rel="noreferrer" className="self-start text-sm font-semibold">Website ↗</a>}
        </div>
      </div>
      {c.about && <p className="m-0 text-[15px] leading-relaxed text-ink">{c.about}</p>}

      <dl className="m-0 grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5 rounded-xl bg-offwhite p-4">
          <dt className="overline">Presentations</dt>
          <dd className="m-0 flex flex-col gap-1.5 text-sm">
            {c.sessions.length === 0 && <span className="text-muted">None planned yet</span>}
            {c.sessions.map((s) => (
              <span key={s.id} className="flex flex-col">
                <span className="font-semibold tabular-nums">{day(s.startsAt)} · {hm(s.startsAt)}</span>
                <span className="text-muted">{s.kind}: {s.title}</span>
              </span>
            ))}
            {links && c.sessions.length > 0 && <Link to="/student/sessions" className="text-[13px] font-semibold">Register →</Link>}
          </dd>
        </div>
        <div className="flex flex-col gap-1.5 rounded-xl bg-offwhite p-4">
          <dt className="overline">Interviews</dt>
          <dd className="m-0 flex flex-col gap-1.5 text-sm">
            {interviews ? <span className="self-start"><Badge tone="green" check>Yes</Badge></span> : <span className="text-muted">Not planned yet</span>}
            {c.interviewDays.map((d) => (
              <span key={d.day} className="font-semibold tabular-nums">{day(d.from)} · {hm(d.from)}–{hm(d.to)}</span>
            ))}
            {interviews && (
              <span className="text-[13px] leading-snug text-muted">
                {c.freeSlots} free slot{c.freeSlots === 1 ? '' : 's'}. On invitation: the company asks you after seeing your profile.
              </span>
            )}
          </dd>
        </div>
        <div className="flex flex-col gap-1.5 rounded-xl bg-offwhite p-4">
          <dt className="overline">Openings</dt>
          <dd className="m-0 flex flex-col gap-1.5 text-sm">
            <span className="font-semibold">{c.openings === 0 ? <span className="font-normal text-muted">None yet</span> : `${c.openings} role${c.openings > 1 ? 's' : ''}`}</span>
            {links && c.openings > 0 && <Link to={`/student/openings?company=${encodeURIComponent(c.name)}`} className="text-[13px] font-semibold">See the roles →</Link>}
          </dd>
        </div>
      </dl>
    </article>
  );
}
