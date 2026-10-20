import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { CompanyShell } from './CompanyShell';
import { SessionList } from '../../components/SessionList';
import { Notice } from '../../components/Notice';
import { Badge } from '../../components/Badge';
import { db } from '../../lib/db';
import { useDbQuery } from '../../lib/useDb';
import { useSession } from '../../App';
import { useSettings } from '../../lib/useSettings';
import { fairDay, fairInputToIso, fairTimeRange, tzLabel } from '../../lib/time';
import { fullName } from '../../lib/candidate';

export default function CompanyMeetings() {
  const companyId = useSession()!.companyId!;
  const CLUB_EMAIL = useSettings().club_email;
  const { data: sessions } = useDbQuery(() => db.listSessions());
  const [notice, setNotice] = useState<{ msg: string; tone?: 'green' | 'danger' } | null>(null);
  const say = (msg: string, tone?: 'green' | 'danger') => msg && setNotice({ msg, tone });
  const mine = (sessions ?? []).filter((s) => s.isOrganiser);

  return (
    <CompanyShell>
      <div className="mx-auto flex max-w-page flex-col gap-12 px-4 py-10 md:px-10">
        <section className="flex min-w-0 flex-col gap-5">
          <div className="flex flex-col gap-1">
            <h1 className="m-0 font-display text-[40px] tracking-display">Your sessions</h1>
            <div className="max-w-[75ch] text-[15px] text-muted">
              Sessions the IESE Africa Business Club scheduled with you. Open “Registrants” to see who signed up and who clicked
              “Join”. To add or change a session, write to <span className="select-all font-semibold text-ink">{CLUB_EMAIL}</span>.
              Students register from the <Link to="/sessions">public programme</Link>.
            </div>
          </div>
          {sessions ? (
            <SessionList sessions={mine} viewer="company" onNotice={say} profileLinkBase="/company/candidates"
              empty="No session scheduled with your company yet." />
          ) : (
            <p className="text-muted">Loading…</p>
          )}
        </section>
        <Slots companyId={companyId} onNotice={(msg, tone) => setNotice({ msg, tone })} />
      </div>
      <Notice message={notice?.msg ?? null} tone={notice?.tone} onDone={() => setNotice(null)} />
    </CompanyShell>
  );
}

function Slots({ companyId, onNotice }: { companyId: string; onNotice: (msg: string, tone?: 'green' | 'danger') => void }) {
  const { data: slots } = useDbQuery(() => db.listSlots(companyId), [companyId]);
  const { data: candidates = [] } = useDbQuery(() => db.listVisibleCandidates());
  const { data: requests = [] } = useDbQuery(() => db.listInterviewRequests(companyId), [companyId]);
  const [start, setStart] = useState('2027-02-17T15:00');
  const [duration, setDuration] = useState(30);
  const [count, setCount] = useState(1);
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const name = (id: string | null) => {
    const c = candidates.find((x) => x.id === id);
    return c ? fullName(c) : 'A candidate';
  };

  const add = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const first = Date.parse(fairInputToIso(start));
      // Back-to-back slots: count × duration from the start time. Times already taken are skipped.
      let added = 0;
      for (let i = 0; i < count; i++) {
        try {
          await db.addSlot(companyId, { startsAt: new Date(first + i * duration * 60_000).toISOString(), durationMin: duration, meetingUrl: link });
          added++;
        } catch (err) {
          if (!/already have a slot/.test((err as Error).message)) throw err;
        }
      }
      onNotice(
        added === count ? (count > 1 ? `${count} slots added` : 'Slot added')
          : added === 0 ? 'You already have slots at these times.' : `${added} slots added; ${count - added} skipped (time already taken).`,
        added === 0 ? 'danger' : 'green',
      );
    } catch (err) {
      onNotice((err as Error).message, 'danger');
    } finally {
      setBusy(false);
    }
  };

  const booked = (slots ?? []).filter((s) => s.candidateId).length;
  return (
    <div className="grid items-start gap-7 xl:grid-cols-12">
      <section className="flex min-w-0 flex-col gap-5 xl:col-span-8">
        <div className="flex flex-col gap-1">
          <h2 className="m-0 font-display text-[32px] tracking-display">Interview slots</h2>
          <div className="text-[15px] text-muted">
            Only candidates you requested an interview with ({requests.length}) can see and book these slots. {booked} booked.
          </div>
        </div>
        <ul className="m-0 flex list-none flex-col overflow-hidden rounded-2xl border border-line bg-surface p-0">
          {slots?.length === 0 && <li className="px-5 py-8 text-center text-[15px] text-muted">No slot yet. Add some with the form.</li>}
          {slots?.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 border-b border-line-soft px-5 py-4 text-sm last:border-b-0">
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-semibold">{fairDay(s.startsAt)}</span>
                <span className="tabular-nums text-muted">{fairTimeRange(s.startsAt, s.durationMin)}</span>
              </span>
              {s.candidateId ? (
                <Link to={`/company/candidates/${s.candidateId}`} className="font-semibold">{name(s.candidateId)}</Link>
              ) : (
                <Badge tone="neutral">Free</Badge>
              )}
              {!s.meetingUrl && <span className="text-[13px] text-danger">No video link</span>}
              <button type="button" className="btn-small" onClick={() => db.deleteSlot(s.id).then(() => onNotice('Slot removed'), (e: Error) => onNotice(e.message, 'danger'))}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      </section>
      <aside className="xl:col-span-4">
        <form onSubmit={add} className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-6">
          <h3 className="m-0 text-xl font-bold">Add interview slots</h3>
          <label className="label" htmlFor="sl-start">First slot (Barcelona time, {tzLabel(new Date(fairInputToIso(start)))})
            <input id="sl-start" type="datetime-local" required className="field text-[15px]" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="label" htmlFor="sl-dur">Length
              <select id="sl-dur" className="field text-[15px]" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                {[15, 20, 30, 45, 60].map((d) => <option key={d} value={d}>{d} min</option>)}
              </select>
            </label>
            <label className="label" htmlFor="sl-count">Back-to-back
              <select id="sl-count" className="field text-[15px]" value={count} onChange={(e) => setCount(Number(e.target.value))}>
                {[1, 2, 3, 4, 6, 8].map((n) => <option key={n} value={n}>{n} slot{n > 1 ? 's' : ''}</option>)}
              </select>
            </label>
          </div>
          <label className="label" htmlFor="sl-link">Video link (Zoom, Teams or Meet)
            <input id="sl-link" type="url" className="field text-[15px]" placeholder="https://…" value={link} onChange={(e) => setLink(e.target.value)} />
          </label>
          <button type="submit" disabled={busy} className="btn rounded-xl bg-ink text-[15px] text-offwhite hover:bg-green">Add slots</button>
        </form>
      </aside>
    </div>
  );
}
