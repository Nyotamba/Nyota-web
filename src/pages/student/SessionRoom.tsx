import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { StudentShell } from './StudentShell';
import { Notice } from '../../components/Notice';
import { db } from '../../lib/db';
import { useDbQuery } from '../../lib/useDb';
import { fairDay, fairTimeRange, joinWindow } from '../../lib/time';
import { CLUB_NAME } from '../../config/constants';

const BEAT_MS = 60_000;

/**
 * The gate between Nyota and the video call. Free Zoom / Meet / Teams cannot send people back to a site,
 * so this tab stays open during the session: it records arrival, a heartbeat every minute, and departure.
 */
export default function SessionRoom() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: sessions } = useDbQuery(() => db.listSessions());
  const s = sessions?.find((x) => x.id === id);
  const [link, setLink] = useState<string | null>(null);
  const [arrived] = useState(() => Date.now());
  const [now, setNow] = useState(Date.now());
  const [notice, setNotice] = useState<{ msg: string; tone?: 'green' | 'danger' } | null>(null);
  const left = useRef(false);
  const [back, setBack] = useState(false);
  const w = s ? joinWindow(s.startsAt, s.durationMin, now) : null;
  const live = Boolean(s?.isRegistered && w?.open);

  // Arrival + heartbeat while the room is open; departure when the tab closes.
  useEffect(() => {
    if (!live) return;
    db.sessionHeartbeat(id);
    db.getSessionLink(id).then(setLink, () => setLink(null));
    const beat = setInterval(() => db.sessionHeartbeat(id), BEAT_MS);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const onClose = () => {
      if (!left.current) db.leaveSession(id, { keepalive: true });
    };
    // Coming back from the video tab: invite the student to confirm they finished.
    let wasHidden = false;
    const onVisibility = () => {
      if (document.hidden) wasHidden = true;
      else if (wasHidden) setBack(true);
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onClose);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      clearInterval(beat);
      clearInterval(tick);
      window.removeEventListener('pagehide', onClose);
    };
  }, [id, live]);

  const leave = async () => {
    left.current = true;
    await db.leaveSession(id);
    setNotice({ msg: 'Thank you! Your attendance is recorded.' });
    setTimeout(() => navigate('/student/sessions'), 1200);
  };
  const mins = Math.floor((now - arrived) / 60_000);
  const secs = Math.floor(((now - arrived) % 60_000) / 1000);

  return (
    <StudentShell>
      <div className="mx-auto flex max-w-[720px] flex-col gap-6 px-4 py-10">
        <Link to="/student/sessions" className="self-start text-sm font-semibold no-underline">← All sessions</Link>
        {!sessions && <p className="text-muted">Loading…</p>}
        {sessions && !s && <p className="card m-0 p-7 text-muted">This session no longer exists.</p>}
        {s && (
          <>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-muted">{s.companyName ?? CLUB_NAME} · {s.kind}</span>
              <h1 className="m-0 font-display text-[36px] leading-[0.95] tracking-display md:text-[44px]">{s.title}</h1>
              <span className="text-[15px] tabular-nums text-muted">{fairDay(s.startsAt)} · {fairTimeRange(s.startsAt, s.durationMin)}</span>
            </div>

            {!s.isRegistered ? (
              <p className="card m-0 p-7 text-[15px] text-muted">Register for this session from the programme first.</p>
            ) : w?.upcoming ? (
              <p className="card m-0 p-7 text-[15px] text-muted">The room opens 15 minutes before the start. Come back then.</p>
            ) : w?.over ? (
              <p className="card m-0 p-7 text-[15px] text-muted">This session has ended. Thank you for taking part!</p>
            ) : (
              <>
                <section className="card flex flex-col gap-5 p-7">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="relative flex size-3"><span className="absolute inline-flex size-full animate-ping rounded-full bg-green opacity-60 motion-reduce:animate-none" /><span className="relative inline-flex size-3 rounded-full bg-green" /></span>
                    <span className="text-[15px] font-bold">You are in the session</span>
                    <span className="ml-auto text-sm tabular-nums text-muted">{mins}:{String(secs).padStart(2, '0')}</span>
                  </div>
                  {link ? (
                    <a href={link} target="_blank" rel="noreferrer" onClick={() => db.markSessionJoined(id)}
                      className="btn min-h-[56px] rounded-full bg-green px-6 text-[17px] text-white hover:bg-ink hover:text-white">
                      Open the video call
                    </a>
                  ) : (
                    <p className="m-0 text-sm text-danger">The video link is not available yet. The organiser will add it.</p>
                  )}
                  <p className="m-0 rounded-xl bg-offwhite px-4 py-3 text-sm leading-relaxed text-muted">
                    The call opens in another tab. <strong className="text-ink">When the session ends, come back to this tab</strong> and click
                    “I’ve finished the session”: that is how your attendance is counted.
                  </p>
                </section>


                {back && (
                  <p role="status" className="m-0 rounded-xl bg-green px-4 py-3 text-[15px] font-semibold text-white">
                    Welcome back! Finished? Confirm below so your attendance counts.
                  </p>
                )}
                <button type="button" onClick={leave} className="btn-primary self-start text-[15px]">I’ve finished the session</button>
              </>
            )}
          </>
        )}
      </div>
      <Notice message={notice?.msg ?? null} tone={notice?.tone} onDone={() => setNotice(null)} />
    </StudentShell>
  );
}
