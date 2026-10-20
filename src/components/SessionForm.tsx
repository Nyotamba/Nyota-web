import { useEffect, useState, type FormEvent } from 'react';
import { db, type Company, type FairSession, type SessionKind } from '../lib/db';
import { fairInputToIso, isoToFairInput, tzLabel } from '../lib/time';
import { CLUB_NAME } from '../config/constants';

const KINDS: SessionKind[] = ['Presentation', 'Panel', 'Workshop', 'Networking'];
const DURATIONS = [30, 45, 60, 90, 120];

/**
 * Create or edit a group session. Companies always organise for themselves;
 * admins choose the organiser (the club or any company).
 */
export function SessionForm({ editing, companyId, companies, onDone }: {
  editing: FairSession | null;
  companyId?: string; // set for company members
  companies?: Company[]; // set for admins
  onDone: (msg: string, tone?: 'green' | 'danger') => void;
}) {
  const blank = { organiser: companyId ?? '', title: '', kind: 'Presentation' as SessionKind, description: '', start: '2027-02-16T18:00', duration: 45, capacity: '', link: '' };
  const [f, setF] = useState(blank);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!editing) return setF(blank);
    setF({
      organiser: editing.companyId ?? '', title: editing.title, kind: editing.kind, description: editing.description,
      start: isoToFairInput(editing.startsAt), duration: editing.durationMin, capacity: editing.capacity ? String(editing.capacity) : '', link: '',
    });
    db.getSessionLink(editing.id).then((link) => setF((x) => ({ ...x, link: link ?? '' })), () => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing?.id]);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF({ ...f, [k]: v });
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await db.saveSession(editing?.id ?? null, {
        companyId: companyId ?? (f.organiser || null), title: f.title, kind: f.kind, description: f.description,
        startsAt: fairInputToIso(f.start), durationMin: f.duration, capacity: f.capacity ? Number(f.capacity) : null, meetingUrl: f.link,
      });
      onDone(editing ? 'Session updated' : 'Session published');
      if (!editing) setF(blank);
    } catch (err) {
      onDone((err as Error).message, 'danger');
    } finally {
      setBusy(false);
    }
  };
  const tz = tzLabel(new Date(fairInputToIso(f.start || blank.start)));

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-6">
      <h2 className="m-0 text-xl font-bold">{editing ? 'Edit session' : 'New session'}</h2>
      {companies && (
        <label className="label" htmlFor="ses-org">Organised by
          <select id="ses-org" className="field text-[15px]" value={f.organiser} onChange={(e) => set('organiser', e.target.value)}>
            <option value="">{CLUB_NAME}</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
      )}
      <label className="label" htmlFor="ses-title">Title
        <input id="ses-title" required minLength={3} maxLength={120} className="field text-[15px]" value={f.title}
          placeholder="Investing in West African fintech" onChange={(e) => set('title', e.target.value)} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="label" htmlFor="ses-kind">Format
          <select id="ses-kind" className="field text-[15px]" value={f.kind} onChange={(e) => set('kind', e.target.value as SessionKind)}>
            {KINDS.map((k) => <option key={k}>{k}</option>)}
          </select>
        </label>
        <label className="label" htmlFor="ses-dur">Duration
          <select id="ses-dur" className="field text-[15px]" value={f.duration} onChange={(e) => set('duration', Number(e.target.value))}>
            {DURATIONS.map((d) => <option key={d} value={d}>{d} min</option>)}
          </select>
        </label>
      </div>
      <label className="label" htmlFor="ses-start">Start (Barcelona time, {tz})
        <input id="ses-start" type="datetime-local" required className="field text-[15px]" value={f.start} onChange={(e) => set('start', e.target.value)} />
      </label>
      <label className="label" htmlFor="ses-cap">Seats (leave empty for unlimited)
        <input id="ses-cap" type="number" min={1} className="field text-[15px]" value={f.capacity} onChange={(e) => set('capacity', e.target.value)} />
      </label>
      <label className="label" htmlFor="ses-desc">Description
        <textarea id="ses-desc" rows={3} maxLength={1000} className="field resize-y text-[15px] leading-relaxed" value={f.description}
          placeholder="What attendees will learn, who will speak." onChange={(e) => set('description', e.target.value)} />
      </label>
      <label className="label" htmlFor="ses-link">Video link (Zoom, Teams or Meet)
        <input id="ses-link" type="url" className="field text-[15px]" value={f.link} placeholder="https://…"
          onChange={(e) => set('link', e.target.value)} />
        <span className="text-[13px] font-normal text-muted">Only registered students see it, from 15 minutes before the start.</span>
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className="btn flex-1 rounded-xl bg-ink px-5 text-[15px] text-offwhite hover:bg-green">
          {editing ? 'Save changes' : 'Publish session'}
        </button>
        {editing && <button type="button" className="btn-small" onClick={() => onDone('')}>Cancel</button>}
      </div>
    </form>
  );
}
