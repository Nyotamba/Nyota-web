import type { ReactNode } from 'react';
import type { Candidate } from '../lib/db';
import { fullName, initials, formatMonth } from '../lib/candidate';
import { Badge } from './Badge';
import { CvViewer } from './CvViewer';
import { db } from '../lib/db';

/** Company-facing view of a candidate. Also used for the student's "Preview as a company". */
export function CandidateProfile({ c, top, actions, onOpenCv }: {
  c: Candidate; top?: ReactNode; actions?: ReactNode; onOpenCv?: () => void;
}) {
  const name = fullName(c);
  const facts: [string, string][] = [
    ['Target functions', c.functions.join(', ')],
    ['Sectors', c.sectors.join(', ')],
    ['Regions', c.regions.join(', ')],
    ['Countries', c.countries || '—'],
    ['Languages', c.languages.join(', ')],
    ['Position · availability', `${c.positionType} · ${formatMonth(c.availableFrom)}`],
  ];
  return (
    <div className="mx-auto grid max-w-page gap-7 px-4 py-8 md:px-10 lg:grid-cols-12">
      <div className="flex min-w-0 flex-col gap-5 lg:col-span-5">
        {top}
        <div className="flex items-center gap-4">
          <div className="flex size-[72px] shrink-0 items-center justify-center rounded-full bg-ink font-display text-[28px] text-offwhite">{initials(c)}</div>
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="m-0 text-[28px] font-extrabold leading-tight md:text-[34px]">{name}</h1>
            <div className="text-[15px] text-muted">{c.programme} · {c.school} · {c.graduationYear}</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {c.verifiedAt ? <Badge tone="green" check>Verified by the club</Badge> : <Badge tone="orange">Waiting for verification</Badge>}
          {c.linkedinUrl && <a href={c.linkedinUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold">LinkedIn profile</a>}
        </div>
        {actions}
        {c.story && (
          <section className="flex flex-col gap-2.5 rounded-2xl border border-line bg-surface p-6">
            <h2 className="overline m-0">Story</h2>
            <p className="m-0 max-w-[65ch] text-base leading-relaxed">{c.story}</p>
          </section>
        )}
        <section className="grid gap-5 rounded-2xl border border-line bg-surface p-6 text-[15px] sm:grid-cols-2">
          {facts.map(([k, v]) => (
            <div key={k} className="flex flex-col gap-1">
              <span className="text-[13px] text-muted">{k}</span>
              <span className="font-semibold">{v || '—'}</span>
            </div>
          ))}
        </section>
      </div>
      <div className="min-w-0 lg:col-span-7">
        <CvViewer name={name} cv={c.cv} onOpen={onOpenCv} loadUrl={() => db.getCvUrl(c.id)} />
      </div>
    </div>
  );
}
