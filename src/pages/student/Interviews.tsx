import { useState } from 'react';
import { StudentShell } from './StudentShell';
import { Badge } from '../../components/Badge';
import { Notice } from '../../components/Notice';
import { AddToCalendar } from '../../components/AddToCalendar';
import { db } from '../../lib/db';
import { useDbQuery } from '../../lib/useDb';
import { fairDay, fairTimeRange, joinWindow } from '../../lib/time';
import { formatDate } from '../../lib/candidate';

export default function StudentInterviews() {
  const { data: interviews, error } = useDbQuery(() => db.listStudentInterviews());
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ msg: string; tone?: 'green' | 'danger' } | null>(null);
  const act = async (fn: () => Promise<void>, ok: string) => {
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

  return (
    <StudentShell>
      <div className="mx-auto flex max-w-page flex-col gap-6 px-4 py-10 md:px-10 xl:px-20">
        <div className="flex flex-col gap-1">
          <h1 className="m-0 font-display text-[40px] tracking-display">Interviews</h1>
          <div className="max-w-[65ch] text-[15px] text-muted">
            Companies that want to meet you appear here. Pick one of their slots; the video link shows up on this page.
          </div>
        </div>
        {error && <p className="card m-0 p-6 text-danger">Your interviews could not load: {error.message}</p>}
        {interviews?.length === 0 && (
          <div className="card p-7 text-[15px] leading-relaxed text-muted">
            No interview request yet. Companies can request an interview once your profile is verified and visible to them.
          </div>
        )}
        <ul className="m-0 flex list-none flex-col gap-4 p-0">
          {interviews?.map((iv) => (
            <li key={iv.companyId} className="card flex flex-col gap-4 p-6">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="m-0 flex-1 text-lg font-bold">{iv.companyName}</h2>
                {iv.booked ? <Badge tone="green" check>Booked</Badge> : <Badge tone="orange">Pick a slot</Badge>}
              </div>
              <p className="m-0 text-[13px] text-muted">Interview requested on {formatDate(iv.requestedAt)}.</p>

              {iv.booked && (
                <div className="flex flex-wrap items-center gap-3 rounded-xl bg-offwhite p-4">
                  <div className="flex flex-1 flex-col gap-0.5">
                    <span className="text-[15px] font-bold">{fairDay(iv.booked.startsAt)}</span>
                    <span className="text-sm tabular-nums text-muted">{fairTimeRange(iv.booked.startsAt, iv.booked.durationMin)}</span>
                  </div>
                  {iv.booked.meetingUrl && joinWindow(iv.booked.startsAt, iv.booked.durationMin).open ? (
                    <a href={iv.booked.meetingUrl} target="_blank" rel="noreferrer" className="btn rounded-full bg-green px-5 text-[15px] text-white hover:bg-ink hover:text-white">Join now</a>
                  ) : (
                    <span className="text-[13px] text-muted">The “Join” button appears 15 minutes before.</span>
                  )}
                  <button type="button" disabled={busy} className="btn-small"
                    onClick={() => act(() => db.cancelBooking(iv.booked!.slotId), 'Booking cancelled')}>Cancel booking</button>
                  <div className="w-full">
                    <AddToCalendar event={{
                      title: `Interview with ${iv.companyName}`, startsAt: iv.booked.startsAt, durationMin: iv.booked.durationMin,
                      pagePath: '/student/meetings', details: `Interview with ${iv.companyName} at the Nyota Africa Career Fair.`,
                    }} />
                  </div>
                </div>
              )}

              {iv.freeSlots.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-semibold">{iv.booked ? 'Move to another slot' : 'Available slots'}</span>
                  <div className="flex flex-wrap gap-2">
                    {iv.freeSlots.map((s) => (
                      <button key={s.id} type="button" disabled={busy} className="btn-small flex-col items-start gap-0 py-2 text-left"
                        onClick={() => act(() => db.bookSlot(s.id), `Interview booked with ${iv.companyName}`)}>
                        <span className="text-[13px] font-bold">{fairDay(s.startsAt)}</span>
                        <span className="text-[13px] font-normal tabular-nums text-muted">{fairTimeRange(s.startsAt, s.durationMin)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {!iv.booked && iv.freeSlots.length === 0 && (
                <p className="m-0 text-sm text-muted">The company has not opened slots yet. Check back soon.</p>
              )}
            </li>
          ))}
        </ul>
      </div>
      <Notice message={notice?.msg ?? null} tone={notice?.tone} onDone={() => setNotice(null)} />
    </StudentShell>
  );
}
