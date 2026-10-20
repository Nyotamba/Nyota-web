import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminShell } from './AdminShell';
import { SessionList } from '../../components/SessionList';
import { SessionForm } from '../../components/SessionForm';
import { Notice } from '../../components/Notice';
import { db, type FairSession } from '../../lib/db';
import { useDbQuery } from '../../lib/useDb';

export default function AdminSessions() {
  const { data: sessions } = useDbQuery(() => db.listSessions());
  const { data: companies = [] } = useDbQuery(() => db.listCompanies());
  const [editing, setEditing] = useState<FairSession | null>(null);
  const [notice, setNotice] = useState<{ msg: string; tone?: 'green' | 'danger' } | null>(null);
  const say = (msg: string, tone?: 'green' | 'danger') => {
    if (msg) setNotice({ msg, tone });
    if (tone !== 'danger') setEditing(null);
  };
  const registrations = (sessions ?? []).reduce((n, s) => n + s.registered, 0);
  return (
    <AdminShell>
      <div className="mx-auto grid max-w-page items-start gap-7 px-4 py-10 md:px-10 xl:grid-cols-12">
        <section className="flex min-w-0 flex-col gap-5 xl:col-span-8">
          <div className="flex flex-col gap-1">
            <h1 className="m-0 font-display text-[34px] tracking-display md:text-[40px]">Sessions</h1>
            <div className="text-[15px] text-muted">
              {(sessions ?? []).length} sessions · {registrations} registrations. Students see them on the{' '}
              <Link to="/sessions">public programme</Link>; companies can publish their own.
            </div>
          </div>
          {sessions ? (
            <SessionList sessions={sessions} viewer="admin" onEdit={setEditing} onNotice={say} profileLinkBase="/admin/review"
              empty="No session yet. Create the first one with the form." />
          ) : (
            <p className="text-muted">Loading…</p>
          )}
        </section>
        <aside className="xl:sticky xl:top-6 xl:col-span-4">
          <SessionForm editing={editing} companies={companies} onDone={say} />
        </aside>
      </div>
      <Notice message={notice?.msg ?? null} tone={notice?.tone} onDone={() => setNotice(null)} />
    </AdminShell>
  );
}
