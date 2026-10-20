import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { SessionList } from '../components/SessionList';
import { Notice } from '../components/Notice';
import { db } from '../lib/db';
import { useDbQuery } from '../lib/useDb';
import { useSession } from '../App';
import { FORUM_DATE, FORUM_NAME } from '../config/constants';

const HOME = { student: '/student/sessions', company: '/company/meetings', admin: '/admin/sessions' } as const;

/** Public fair programme: anyone can browse; students sign in to register. */
export default function PublicSessions() {
  const session = useSession();
  const { data: sessions } = useDbQuery(() => db.listSessions());
  const [notice, setNotice] = useState<{ msg: string; tone?: 'green' | 'danger' } | null>(null);
  return (
    <div className="mx-auto flex min-h-full max-w-page flex-col">
      <header className="flex h-[72px] items-center gap-4 border-b border-line px-4 md:px-10">
        <Logo />
        <div className="ml-auto flex items-center gap-2">
          {session ? (
            <Link to={HOME[session.role]} className="btn-primary text-[15px]">My space</Link>
          ) : (
            <Link to="/sign-in?as=student" className="btn-primary text-[15px]">Sign in to register</Link>
          )}
        </div>
      </header>
      <main className="flex flex-col gap-8 px-4 py-10 md:px-10 xl:px-20">
        <div className="flex flex-col gap-3">
          <div className="self-start bg-orange px-3 py-1.5 font-display text-[15px] tracking-[0.04em] text-ink">{FORUM_NAME} · {FORUM_DATE} · Online</div>
          <h1 className="m-0 font-display text-[44px] leading-[0.95] tracking-display md:text-[64px]">Programme</h1>
          <p className="m-0 max-w-[60ch] text-base leading-relaxed text-muted">
            Company presentations, panels and workshops, all online. Register in one click; the video link appears 15 minutes before
            each session starts.
          </p>
        </div>
        {sessions ? (
          <SessionList sessions={sessions} viewer={session?.role === 'student' ? 'student' : session ? session.role : null}
            onNotice={(msg, tone) => setNotice({ msg, tone })} empty="The programme will be published here soon." />
        ) : (
          <p className="text-muted">Loading the programme…</p>
        )}
      </main>
      <Notice message={notice?.msg ?? null} tone={notice?.tone} onDone={() => setNotice(null)} />
    </div>
  );
}
