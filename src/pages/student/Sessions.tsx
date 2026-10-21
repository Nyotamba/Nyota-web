import { useState } from 'react';
import { StudentShell } from './StudentShell';
import { SessionList } from '../../components/SessionList';
import { Notice } from '../../components/Notice';
import { MyAgenda, agendaItems } from '../../components/MyAgenda';
import { db } from '../../lib/db';
import { useDbQuery } from '../../lib/useDb';

export default function StudentSessions() {
  const { data: sessions } = useDbQuery(() => db.listSessions());
  const { data: interviews = [] } = useDbQuery(() => db.listStudentInterviews());
  const [agenda, setAgenda] = useState(false);
  const [notice, setNotice] = useState<{ msg: string; tone?: 'green' | 'danger' } | null>(null);
  const count = agendaItems(sessions ?? [], interviews).length;
  return (
    <StudentShell>
      <div className="mx-auto flex max-w-page flex-col gap-6 px-4 py-10 md:px-10 xl:px-20">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-1 flex-col gap-1">
            <h1 className="m-0 font-display text-[40px] tracking-display">{agenda ? 'My agenda' : 'Sessions'}</h1>
            <div className="text-[15px] text-muted">
              {agenda
                ? 'The sessions you registered for and the interviews you booked. Times are Barcelona time.'
                : 'Register for company presentations, panels and workshops. Times are Barcelona time.'}
            </div>
          </div>
          <div role="group" aria-label="Show" className="grid grid-cols-2 overflow-hidden rounded-field border border-line-strong">
            {[['All sessions', false], [`My agenda · ${count}`, true]].map(([label, value]) => (
              <button key={String(value)} type="button" aria-pressed={agenda === value} onClick={() => setAgenda(value as boolean)}
                className={`min-h-[44px] px-4 text-sm font-semibold ${agenda === value ? 'bg-ink text-offwhite' : 'bg-surface text-ink hover:bg-offwhite'}`}>
                {label as string}
              </button>
            ))}
          </div>
        </div>
        {!sessions ? (
          <p className="text-muted">Loading the programme…</p>
        ) : agenda ? (
          <MyAgenda sessions={sessions} interviews={interviews} />
        ) : (
          <SessionList sessions={sessions} viewer="student" onNotice={(msg, tone) => setNotice({ msg, tone })}
            empty="The programme will be published here soon." />
        )}
      </div>
      <Notice message={notice?.msg ?? null} tone={notice?.tone} onDone={() => setNotice(null)} />
    </StudentShell>
  );
}
