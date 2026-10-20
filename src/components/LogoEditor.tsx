import { useRef, useState, type ChangeEvent } from 'react';
import { db, type LogoTarget } from '../lib/db';

/** Admin control for one organisation's logo: preview, upload, and "show on homepage". */
export function LogoEditor({ target, name, logoUrl, showOnSite, onNotice }: {
  target: LogoTarget; name: string; logoUrl: string | null | undefined; showOnSite: boolean | undefined;
  onNotice: (msg: string, tone?: 'green' | 'danger') => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const id = `logo-${target.kind}-${target.kind === 'company' ? target.id : target.name}`.replace(/\W+/g, '-');

  const upload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      await db.uploadLogo(target, file);
      onNotice(`Logo of ${name} updated`);
    } catch (err) {
      onNotice((err as Error).message, 'danger');
    } finally {
      setBusy(false);
    }
  };
  const toggle = async (show: boolean) => {
    try {
      await db.setShowOnSite(target, show);
      onNotice(show ? `${name} now appears on the homepage` : `${name} removed from the homepage`);
    } catch (err) {
      onNotice((err as Error).message, 'danger');
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex h-12 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-surface">
        {logoUrl ? <img src={logoUrl} alt={`${name} logo`} className="max-h-10 max-w-[88px] object-contain" />
          : <span className="text-[11px] text-muted">No logo</span>}
      </div>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" id={id} onChange={upload} />
      <button type="button" disabled={busy} className="btn-small text-[13px]" onClick={() => input.current?.click()}>
        {busy ? 'Uploading…' : logoUrl ? 'Replace logo' : 'Upload logo'}
      </button>
      <label htmlFor={`${id}-show`} className={`flex min-h-[44px] items-center gap-2 text-[13px] font-semibold ${logoUrl ? '' : 'text-muted'}`}>
        <input id={`${id}-show`} type="checkbox" className="size-[18px] accent-ink" disabled={!logoUrl}
          checked={Boolean(showOnSite)} onChange={(e) => toggle(e.target.checked)} />
        Show on homepage
      </label>
    </div>
  );
}
