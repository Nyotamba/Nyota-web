import { useState } from 'react';
import { db } from '../lib/db';

export function SendCodeButton({ email, kind, onNotice }: {
  email: string; kind: 'admin' | 'company'; onNotice: (msg: string, tone?: 'green' | 'danger') => void;
}) {
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    try {
      await db.sendAccessCode(email, kind);
      onNotice(`Access code e-mailed to ${email}`);
    } catch (err) {
      onNotice((err as Error).message, 'danger');
    } finally {
      setBusy(false);
    }
  };
  return (
    <button type="button" disabled={busy} onClick={send} className="btn-small px-3 text-[12px]">
      {busy ? 'Sending…' : 'Send by e-mail'}
    </button>
  );
}
