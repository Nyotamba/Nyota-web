import { useState } from 'react';
import { StudentShell } from './StudentShell';
import { SessionList } from '../../components/SessionList';
import { Notice } from '../../components/Notice';
import { MyAgenda } from '../../components/MyAgenda';
import { db } from '../../lib/db';
import { useDbQuery } from '../../lib/useDb';

export default function StudentSessions() {
  const { data: sessions } = useDbQuery(() => db.listSessions());
  const { data: interviews = [] } = useDbQuery(() => db.listStudentInterviews());
  const [mine, setMine] = useState(false);
  const [notice, setNotice] = useState<{ msg: string; tone?: 'green' | 'danger' } | null>(null);
  const list = (sessions ?? []).filter((s) => !mine || s.isRegistered);
  const count = (sessions ?? []).filter((s) => s.isRegistered).length;
  return (
    <StudentShell>
      <div className="mx-auto flex max-w-page flex-col gap-6 px-4 py-10 md:px-10 xl:px-20">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-1 flex-col gap-1">
            <h1 className="m-0 font-display text-[40px] tracking-display">Sessions</h1>
            <div className="text-[15px] text-muted">Register for company presentations, panels and workshops. Times are Barcelona time.</div>
          </div>
          <div role="group" aria-label="Show" className="grid grid-cols-2 overflow-hidden rounded-field border border-line-strong">
            {[['All sessions', false], [`My sessions · ${count}`, true]].map(([label, value]) => (
              <button key={String(value)} type="button" aria-pressed={mine === value} onClick={() => setMine(value as boolean)}
                className={`min-h-[44px] px-4 text-sm font-semibold ${mine === value ? 'bg-ink text-offwhite' : 'bg-surface text-ink hover:bg-offwhite'}`}>
                {label as string}
              </button>
            ))}
          </div>
        </div>
        {sessions && <MyAgenda sessions={sessions} interviews={interviews} />}
        {sessions ? (
          <SessionList sessions={list} viewer="student" onNotice={(msg, tone) => setNotice({ msg, tone })}
            empty={mine ? 'You have not registered for a session yet.' : 'The programme will be published here soon.'} />
        ) : (
          <p className="text-muted">Loading the programme…</p>
        )}
      </div>
      <Notice message={notice?.msg ?? null} tone={notice?.tone} onDone={() => setNotice(null)} />
    </StudentShell>
  );
}
