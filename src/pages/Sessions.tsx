import { useState } from 'react';
import { PublicShell } from '../components/PublicShell';
import { SessionList } from '../components/SessionList';
import { Notice } from '../components/Notice';
import { db } from '../lib/db';
import { useDbQuery } from '../lib/useDb';
import { useSession } from '../App';
import { useSettings } from '../lib/useSettings';

/** Public fair programme: anyone can browse; students sign in to register. */
export default function PublicSessions() {
  const session = useSession();
  const S = useSettings();
  const { data: sessions } = useDbQuery(() => db.listSessions());
  const [notice, setNotice] = useState<{ msg: string; tone?: 'green' | 'danger' } | null>(null);
  return (
    <PublicShell>
      <div className="flex flex-col gap-8 px-4 py-10 md:px-10 xl:px-20">
        <div className="flex flex-col gap-3">
          <div className="self-start bg-orange px-3 py-1.5 font-display text-[15px] tracking-[0.04em] text-ink">{S.forum_name} · {S.forum_date} · {S.forum_venue}</div>
          <h1 className="m-0 font-display text-[44px] leading-[0.95] tracking-display md:text-[64px]">Programme</h1>
          <p className="m-0 max-w-[60ch] text-base leading-relaxed text-muted">
            Company presentations, panels and workshops, all online. The video link appears 15 minutes before each session starts.
          </p>
        </div>
        {sessions ? (
          <SessionList sessions={sessions} viewer={session?.role === 'student' ? 'student' : session ? session.role : null}
            onNotice={(msg, tone) => setNotice({ msg, tone })} empty="The programme will be published here soon." />
        ) : (
          <p className="text-muted">Loading the programme…</p>
        )}
      </div>
      <Notice message={notice?.msg ?? null} tone={notice?.tone} onDone={() => setNotice(null)} />
    </PublicShell>
  );
}
