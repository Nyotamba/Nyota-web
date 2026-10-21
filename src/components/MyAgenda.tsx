import { Link } from 'react-router-dom';
import type { FairSession, StudentInterview } from '../lib/db';
import { fairDayKey, isoToFairInput, joinWindow } from '../lib/time';
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
interface Placed extends Item {
  lane: number;
  lanes: number;
}

const HOUR_PX = 96;
const end = (i: Item) => Date.parse(i.startsAt) + i.durationMin * 60_000;
// Minutes since midnight, Barcelona time.
const minuteOfDay = (iso: string) => {
  const [h, m] = isoToFairInput(iso).slice(11, 16).split(':').map(Number);
  return h * 60 + m;
};
const hm = (iso: string) => isoToFairInput(iso).slice(11, 16);
const range = (i: Item) => `${hm(i.startsAt)}–${hm(new Date(end(i)).toISOString())}`;
const dayLabel = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(iso).toLocaleDateString('en-GB', { timeZone: 'Europe/Madrid', ...opts });

export function agendaItems(sessions: FairSession[], interviews: StudentInterview[]): Item[] {
  return [
    ...sessions.filter((s) => s.isRegistered).map((s) => ({
      key: s.id, kind: 'Session' as const, title: s.title, host: s.companyName ?? CLUB_NAME,
      startsAt: s.startsAt, durationMin: s.durationMin, sessionId: s.id, attended: s.hasAttended,
    })),
    ...interviews.filter((i) => i.booked).map((i) => ({
      key: i.booked!.slotId, kind: 'Interview' as const, title: `Interview with ${i.companyName}`, host: i.companyName,
      startsAt: i.booked!.startsAt, durationMin: i.booked!.durationMin,
    })),
  ].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/** Overlapping events of one day share the width, side by side (lanes). */
function placeDay(items: Item[]): Placed[] {
  const out: Placed[] = [];
  let group: Placed[] = [];
  let groupEnd = 0;
  const flush = () => {
    const lanes = Math.max(...group.map((g) => g.lane)) + 1;
    group.forEach((g) => out.push({ ...g, lanes }));
    group = [];
  };
  for (const it of items) {
    if (group.length && Date.parse(it.startsAt) >= groupEnd) flush();
    const busy = new Set(group.filter((g) => end(g) > Date.parse(it.startsAt)).map((g) => g.lane));
    let lane = 0;
    while (busy.has(lane)) lane++;
    group.push({ ...it, lane, lanes: 1 });
    groupEnd = Math.max(groupEnd, end(it));
  }
  if (group.length) flush();
  return out;
}

/** The student's own programme for the fair: registered sessions and booked interviews, day by day. */
export function MyAgenda({ sessions, interviews }: { sessions: FairSession[]; interviews: StudentInterview[] }) {
  const items = agendaItems(sessions, interviews);
  if (items.length === 0) {
    return (
      <div className="card flex flex-col items-start gap-2 p-7 text-[15px] text-muted">
        <span className="text-lg font-bold text-ink">Your agenda is empty</span>
        Register for sessions in “All sessions” and book your interviews: they all appear here, day by day.
      </div>
    );
  }

  const clashes = new Set<string>();
  const pairs: [Item, Item][] = [];
  items.forEach((a, n) => items.slice(n + 1).forEach((b) => {
    if (Date.parse(b.startsAt) < end(a)) {
      clashes.add(a.key).add(b.key);
      pairs.push([a, b]);
    }
  }));
  const days = [...new Set(items.map((i) => fairDayKey(i.startsAt)))];
  const firstHour = Math.floor(Math.min(...items.map((i) => minuteOfDay(i.startsAt))) / 60);
  const lastHour = Math.ceil(Math.max(...items.map((i) => minuteOfDay(i.startsAt) + i.durationMin)) / 60);
  const hours = Array.from({ length: lastHour - firstHour }, (_, n) => firstHour + n);
  const events: CalendarEvent[] = items.map((i) => ({
    title: i.title, startsAt: i.startsAt, durationMin: i.durationMin,
    pagePath: i.kind === 'Session' ? '/student/sessions' : '/student/interviews',
    details: `${i.kind} with ${i.host} at the Nyota Africa Career Fair.`,
  }));
  const minutes = items.reduce((t, i) => t + i.durationMin, 0);
  const cols = { gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))` };

  return (
    <section aria-label="Your agenda" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <dl className="m-0 flex flex-1 flex-wrap items-center gap-x-6 gap-y-1 text-sm text-muted">
          <div><dt className="inline">Events </dt><dd className="m-0 inline font-bold text-ink">{items.length}</dd></div>
          <div><dt className="inline">Days </dt><dd className="m-0 inline font-bold text-ink">{days.length}</dd></div>
          <div><dt className="inline">Total </dt><dd className="m-0 inline font-bold text-ink">{Math.floor(minutes / 60)} h {String(minutes % 60).padStart(2, '0')}</dd></div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-green" />Session</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-orange" />Interview</span>
          </div>
        </dl>
        <button type="button" className="btn-secondary flex items-center gap-2 text-sm" onClick={() => downloadIcs(events, 'nyota-agenda.ics')}>
          <Calendar size={16} />Add all to my calendar
        </button>
      </div>

      {pairs.map(([a, b]) => (
        <p key={a.key + b.key} role="alert" className="m-0 rounded-xl border border-danger bg-surface px-4 py-3 text-sm text-ink">
          <strong className="text-danger">Clash · </strong>
          <strong>{a.title}</strong> and <strong>{b.title}</strong> overlap
          from {hm(b.startsAt)} to {hm(new Date(Math.min(end(a), end(b))).toISOString())}.
          Cancel one, or ask the company to move the interview.
        </p>
      ))}

      {/* Desktop: a week-view grid, hours on the left, one column per day. */}
      <div className="card hidden overflow-hidden p-0 md:block">
        <div className="grid border-b border-line" style={cols}>
          <span />
          {days.map((d) => {
            const today = items.filter((i) => fairDayKey(i.startsAt) === d);
            return (
              <div key={d} className="flex items-center gap-3 border-l border-line px-4 py-3">
                <span className="font-display text-[30px] leading-none">{dayLabel(today[0].startsAt, { day: 'numeric' })}</span>
                <span className="flex flex-col">
                  <span className="text-sm font-bold leading-tight">{dayLabel(today[0].startsAt, { weekday: 'long' })}</span>
                  <span className="text-[12px] text-muted">{dayLabel(today[0].startsAt, { month: 'long' })} · {today.length} {today.length > 1 ? 'events' : 'event'}</span>
                </span>
              </div>
            );
          })}
        </div>
        <div className="grid py-2" style={cols}>
          <div className="relative" style={{ height: hours.length * HOUR_PX }}>
            {hours.map((h, n) => (
              <span key={h} className="absolute right-2 -translate-y-1/2 text-[11px] tabular-nums text-muted" style={{ top: n * HOUR_PX }}>
                {`${String(h).padStart(2, '0')}:00`}
              </span>
            ))}
          </div>
          {days.map((d) => (
            <div key={d} className="relative border-l border-line" style={{ height: hours.length * HOUR_PX }}>
              {hours.map((h, n) => (
                <span key={h} aria-hidden="true" className="absolute inset-x-0 border-t border-line-soft" style={{ top: n * HOUR_PX }} />
              ))}
              {placeDay(items.filter((i) => fairDayKey(i.startsAt) === d)).map((i) => {
                const top = ((minuteOfDay(i.startsAt) - firstHour * 60) / 60) * HOUR_PX;
                const height = Math.max(40, (i.durationMin / 60) * HOUR_PX - 4);
                return (
                  <div key={i.key} className="absolute px-1" style={{ top: top + 2, height, left: `${(i.lane / i.lanes) * 100}%`, width: `${100 / i.lanes}%` }}>
                    <Block item={i} clash={clashes.has(i.key)} compact={height < 90} />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Phone: one list per day. */}
      <div className="flex flex-col gap-5 md:hidden">
        {days.map((d) => {
          const today = items.filter((i) => fairDayKey(i.startsAt) === d);
          return (
            <div key={d} className="flex flex-col gap-2">
              <h3 className="overline m-0">{dayLabel(today[0].startsAt, { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
              {today.map((i) => <Block key={i.key} item={i} clash={clashes.has(i.key)} />)}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Block({ item: i, clash, compact = false }: { item: Item; clash: boolean; compact?: boolean }) {
  const w = joinWindow(i.startsAt, i.durationMin);
  const tone = i.kind === 'Interview' ? 'border-l-orange bg-[#FFF3E8]' : 'border-l-green bg-[#EAF2EC]';
  return (
    <div className={`flex h-full flex-col gap-0.5 overflow-hidden rounded-lg border border-l-4 px-3 py-2 ${tone}
      ${clash ? 'border-danger' : 'border-transparent'} ${w.over && !i.attended ? 'opacity-55' : ''} ${w.open ? 'ring-2 ring-green' : ''}`}>
      <span className="flex items-center gap-2 text-[12px] font-semibold tabular-nums text-muted">
        {range(i)}
        {i.attended && <Badge tone="green" check>Present</Badge>}
      </span>
      <span className={`font-semibold leading-snug text-ink ${compact ? 'line-clamp-2 text-[13px]' : 'line-clamp-3 text-[14px]'}`}>{i.title}</span>
      {!compact && <span className="truncate text-[12px] text-muted">{i.kind === 'Session' ? i.host : 'Interview'}</span>}
      {w.open && !i.attended && (
        <Link to={i.sessionId ? `/student/sessions/${i.sessionId}/live` : '/student/interviews'} className="text-[13px] font-bold">
          Live now → join
        </Link>
      )}
    </div>
  );
}
