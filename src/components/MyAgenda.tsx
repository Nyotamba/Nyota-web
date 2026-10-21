import { Link } from 'react-router-dom';
import type { FairSession, StudentInterview } from '../lib/db';
import { fairDay, fairDayKey, fairTimeRange, joinWindow } from '../lib/time';
import { downloadIcs, type CalendarEvent } from '../lib/calendar';
import { CLUB_NAME } from '../config/constants';
import { Badge } from './Badge';
import { Calendar } from './icons';

interface Item {
  key: string;
  kind: 'Session' | 'Interview';
  title: string;
  host: string;
  startsAt: string;
  durationMin: number;
  sessionId?: string;
  attended?: boolean;
}

/** The student's own programme for the fair: registered sessions and booked interviews, day by day. */
export function MyAgenda({ sessions, interviews }: { sessions: FairSession[]; interviews: StudentInterview[] }) {
  const items: Item[] = [
    ...sessions.filter((s) => s.isRegistered).map((s) => ({
      key: s.id, kind: 'Session' as const, title: s.title, host: s.companyName ?? CLUB_NAME,
      startsAt: s.startsAt, durationMin: s.durationMin, sessionId: s.id, attended: s.hasAttended,
    })),
    ...interviews.filter((i) => i.booked).map((i) => ({
      key: i.booked!.slotId, kind: 'Interview' as const, title: `Interview with ${i.companyName}`, host: i.companyName,
      startsAt: i.booked!.startsAt, durationMin: i.booked!.durationMin,
    })),
  ].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  if (items.length === 0) return null;

  const end = (i: Item) => Date.parse(i.startsAt) + i.durationMin * 60_000;
  const clashes = new Set<string>();
  const pairs: [Item, Item][] = [];
  items.forEach((a, n) => items.slice(n + 1).forEach((b) => {
    if (Date.parse(b.startsAt) < end(a)) {
      clashes.add(a.key).add(b.key);
      pairs.push([a, b]);
    }
  }));
  const days = [...new Set(items.map((i) => fairDayKey(i.startsAt)))];
  const events: CalendarEvent[] = items.map((i) => ({
    title: i.title, startsAt: i.startsAt, durationMin: i.durationMin,
    pagePath: i.kind === 'Session' ? '/student/sessions' : '/student/interviews',
    details: `${i.kind} with ${i.host} at the Nyota Africa Career Fair.`,
  }));

  return (
    <section aria-labelledby="agenda-title" className="card flex flex-col gap-5 p-6 md:p-7">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <h2 id="agenda-title" className="m-0 text-xl font-bold">Your agenda</h2>
          <span className="text-sm text-muted">
            {items.length} {items.length > 1 ? 'events' : 'event'} · sessions you registered for and interviews you booked. Barcelona time.
          </span>
        </div>
        <button type="button" className="btn-small flex items-center gap-1.5 text-[13px]" onClick={() => downloadIcs(events, 'nyota-agenda.ics')}>
          <Calendar size={14} />Add all to my calendar
        </button>
      </div>
      {pairs.map(([a, b]) => (
        <p key={a.key + b.key} role="alert" className="m-0 rounded-xl bg-sand px-4 py-3 text-sm text-ink">
          <strong>“{a.title}”</strong> and <strong>“{b.title}”</strong> overlap ({fairTimeRange(b.startsAt, Math.round((Math.min(end(a), end(b)) - Date.parse(b.startsAt)) / 60_000))}).
          Cancel one of them, or ask the company to move the interview.
        </p>
      ))}
      <div className="grid gap-4 md:grid-cols-3">
        {days.map((d) => {
          const today = items.filter((i) => fairDayKey(i.startsAt) === d);
          return (
            <div key={d} className="flex min-w-0 flex-col gap-2">
              <h3 className="overline m-0">{fairDay(today[0].startsAt).replace(/, \d{4}$/, '').replace(/ \d{4}$/, '')}</h3>
              <ol className="m-0 flex list-none flex-col gap-2 p-0">
                {today.map((i) => {
                  const w = joinWindow(i.startsAt, i.durationMin);
                  return (
                    <li key={i.key} className={`flex flex-col gap-1 rounded-xl border px-4 py-3 ${clashes.has(i.key) ? 'border-danger' : 'border-line'} ${w.over ? 'opacity-60' : ''}`}>
                      <span className="flex items-center gap-2 text-[13px] tabular-nums text-muted">
                        {fairTimeRange(i.startsAt, i.durationMin)}
                        <Badge tone={i.kind === 'Interview' ? 'orange' : 'neutral'}>{i.kind}</Badge>
                      </span>
                      <span className="text-[15px] font-semibold leading-snug">{i.title}</span>
                      {i.kind === 'Session' && <span className="text-[13px] text-muted">{i.host}</span>}
                      {i.attended ? <Badge tone="green" check>Present</Badge>
                        : w.open && (
                          <Link to={i.sessionId ? `/student/sessions/${i.sessionId}/live` : '/student/interviews'}
                            className="self-start text-sm font-semibold">Live now → join</Link>
                        )}
                    </li>
                  );
                })}
              </ol>
            </div>
          );
        })}
      </div>
    </section>
  );
}
