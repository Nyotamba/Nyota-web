import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { db, type FairSession, type Registrant, type Role } from '../lib/db';
import { fairDay, fairDayKey, fairTimeRange, joinWindow } from '../lib/time';
import { CLUB_NAME } from '../config/constants';
import { Badge } from './Badge';
import { Calendar } from './icons';

/**
 * The fair programme. What each card offers depends on who is looking:
 * visitors are sent to sign in, students register and join, organisers edit and see registrants.
 */
export function SessionList({ sessions, viewer, onEdit, onNotice, empty, profileLinkBase }: {
  sessions: FairSession[];
  viewer: Role | null;
  /** Where a registrant's name links to (company: candidate page, admin: review page). */
  profileLinkBase?: string;
  onEdit?: (s: FairSession) => void;
  onNotice?: (msg: string, tone?: 'green' | 'danger') => void;
  empty?: ReactNode;
}) {
  if (!sessions.length) return <div className="card p-7 text-[15px] text-muted">{empty ?? 'No session scheduled yet.'}</div>;
  const days = new Map<string, FairSession[]>();
  sessions.forEach((s) => days.set(fairDayKey(s.startsAt), [...(days.get(fairDayKey(s.startsAt)) ?? []), s]));
  return (
    <div className="flex flex-col gap-8">
      {[...days.values()].map((list) => (
        <section key={list[0].startsAt} className="flex flex-col gap-3">
          <h2 className="m-0 flex items-center gap-2 text-lg font-bold"><Calendar size={20} />{fairDay(list[0].startsAt)}</h2>
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {list.map((s) => (
              <li key={s.id}><SessionCard s={s} viewer={viewer} onEdit={onEdit} onNotice={onNotice} profileLinkBase={profileLinkBase} /></li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function SessionCard({ s, viewer, onEdit, onNotice, profileLinkBase }: {
  s: FairSession; viewer: Role | null; onEdit?: (s: FairSession) => void; onNotice?: (msg: string, tone?: 'green' | 'danger') => void;
  profileLinkBase?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [showRegistrants, setShowRegistrants] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const full = s.capacity !== null && s.registered >= s.capacity;
  const w = joinWindow(s.startsAt, s.durationMin);

  const act = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      onNotice?.(ok);
    } catch (err) {
      onNotice?.((err as Error).message, 'danger');
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="card flex flex-col gap-4 p-5 md:flex-row md:items-start md:gap-6">
      <div className="flex shrink-0 flex-col gap-1 md:w-44">
        <span className="text-[15px] font-bold tabular-nums">{fairTimeRange(s.startsAt, s.durationMin)}</span>
        <span className="text-[13px] text-muted">{s.durationMin} min · online</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{s.kind}</Badge>
          {s.isRegistered && <Badge tone="green" check>Registered</Badge>}
          {full && !s.isRegistered && <Badge tone="orange">Full</Badge>}
        </div>
        <h3 className="m-0 text-lg font-bold leading-snug">{s.title}</h3>
        <div className="text-sm font-semibold text-muted">{s.companyName ?? CLUB_NAME}</div>
        {s.description && <p className="m-0 max-w-[65ch] text-[15px] leading-relaxed text-muted">{s.description}</p>}
        <div className="text-[13px] tabular-nums text-muted">
          {s.registered} registered{s.capacity !== null ? ` · ${Math.max(0, s.capacity - s.registered)} of ${s.capacity} seats left` : ''}
        </div>
        {s.isOrganiser && showRegistrants && <Registrants sessionId={s.id} profileLinkBase={profileLinkBase} />}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 md:w-52 md:flex-col md:items-stretch">
        {/* Visitors */}
        {viewer === null && !w.over && (
          <Link to="/sign-in?as=student" className="btn-primary text-[15px]">Register</Link>
        )}
        {/* Students */}
        {viewer === 'student' && !w.over && !s.isRegistered && (
          <button type="button" className="btn-primary text-[15px]" disabled={busy || full}
            onClick={() => act(() => db.registerSession(s.id), `You are registered for “${s.title}”`)}>
            {full ? 'Full' : 'Register'}
          </button>
        )}
        {viewer === 'student' && s.isRegistered && <JoinButton s={s} />}
        {viewer === 'student' && s.isRegistered && !w.over && (
          <button type="button" className="btn-small" disabled={busy}
            onClick={() => act(() => db.unregisterSession(s.id), 'Registration cancelled')}>
            Cancel registration
          </button>
        )}
        {/* Organisers (the company that runs it, or the club) */}
        {s.isOrganiser && (
          <>
            <JoinButton s={s} organiser />
            <button type="button" className="btn-small" aria-expanded={showRegistrants} onClick={() => setShowRegistrants((v) => !v)}>
              {showRegistrants ? 'Hide registrants' : `Registrants (${s.registered})`}
            </button>
            {onEdit && <button type="button" className="btn-small" onClick={() => onEdit(s)}>Edit</button>}
            {confirmDelete ? (
              <span className="flex gap-2">
                <button type="button" disabled={busy} className="btn-small border-danger text-danger hover:border-danger hover:text-danger"
                  onClick={() => act(() => db.deleteSession(s.id), 'Session deleted')}>Delete</button>
                <button type="button" className="btn-small" onClick={() => setConfirmDelete(false)}>Keep</button>
              </span>
            ) : (
              <button type="button" className="btn-small text-danger hover:text-danger" onClick={() => setConfirmDelete(true)}>Delete…</button>
            )}
          </>
        )}
      </div>
    </article>
  );
}

/** The video link is only handed out inside the join window (organisers: any time). */
function JoinButton({ s, organiser = false }: { s: FairSession; organiser?: boolean }) {
  const [now, setNow] = useState(Date.now());
  const [url, setUrl] = useState<string | null>(null);
  const w = joinWindow(s.startsAt, s.durationMin, now);
  const available = organiser || w.open;

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (available) db.getSessionLink(s.id).then(setUrl, () => setUrl(null));
  }, [available, s.id]);

  if (!organiser && w.over) return <span className="text-[13px] text-muted">This session has ended.</span>;
  if (available && url) {
    return <a href={url} target="_blank" rel="noreferrer" className="btn rounded-full bg-green px-5 text-[15px] text-white hover:bg-ink hover:text-white">{organiser ? 'Open video link' : 'Join now'}</a>;
  }
  if (organiser) return <span className="text-[13px] text-danger">No video link yet. Edit the session to add it.</span>;
  return (
    <span className="text-[13px] leading-snug text-muted">
      The “Join” button appears here 15 minutes before the start.
    </span>
  );
}

function Registrants({ sessionId, profileLinkBase }: { sessionId: string; profileLinkBase?: string }) {
  const [list, setList] = useState<Registrant[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    db.listRegistrants(sessionId).then(setList, (e: Error) => setError(e.message));
  }, [sessionId]);
  if (error) return <p className="m-0 text-sm text-danger">{error}</p>;
  if (!list) return <p className="m-0 text-sm text-muted">Loading…</p>;
  if (!list.length) return <p className="m-0 text-sm text-muted">Nobody has registered yet.</p>;
  const hidden = list.filter((r) => !r.name).length;
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-offwhite p-4 text-sm">
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
        {list.filter((r) => r.name).map((r) => (
          <li key={r.candidateId} className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{r.name}</span>
            <span className="text-muted">{r.school}</span>
            {profileLinkBase && (r.visible || profileLinkBase.startsWith('/admin')) && <Link to={`${profileLinkBase}/${r.candidateId}`} className="text-[13px] font-semibold">Profile</Link>}
          </li>
        ))}
      </ul>
      {hidden > 0 && (
        <p className="m-0 text-[13px] text-muted">
          + {hidden} student{hidden > 1 ? 's' : ''} who have not shared a verified profile yet (names hidden).
        </p>
      )}
    </div>
  );
}
