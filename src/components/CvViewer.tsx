import { useEffect, useState } from 'react';
import { Lock, FileIcon } from './icons';
import { CV_LINK_TTL_SECONDS } from '../config/constants';
import type { CvFile } from '../lib/db';

/**
 * Secure CV viewer. Opening it creates a short-lived link (300 s) and records the view.
 * In the demo there is no stored PDF, so the page body is a placeholder.
 */
export function CvViewer({ name, cv, onOpen, loadUrl }: {
  name: string; cv: CvFile | null; onOpen?: () => void; loadUrl?: () => Promise<string | null>;
}) {
  const [left, setLeft] = useState<number | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  const open = async () => {
    onOpen?.();
    setUrl(loadUrl ? await loadUrl() : null);
    setLeft(CV_LINK_TTL_SECONDS);
  };
  useEffect(() => {
    if (left === null || left <= 0) return;
    const t = setTimeout(() => setLeft((s) => (s === null ? s : s - 1)), 1000);
    return () => clearTimeout(t);
  }, [left]);

  useEffect(() => {
    if (left === 0) setUrl(null);
  }, [left]);

  const mmss = left !== null ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : '';
  const expired = left === 0;

  return (
    <section aria-label="CV" className="flex min-h-[560px] flex-col overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
        <Lock />
        <span className="flex-1 text-[15px] font-bold">CV — {name}</span>
        {left !== null && (
          <span className="rounded-full bg-offwhite px-2.5 py-1.5 text-[13px] font-semibold tabular-nums text-muted" aria-live="off">
            {expired ? 'Link expired' : `Link expires in ${mmss}`}
          </span>
        )}
      </div>

      <div className="flex flex-1 items-center justify-center bg-sand p-4 sm:p-8">
        {!cv ? (
          <p className="text-[15px] font-semibold text-danger">No CV uploaded yet.</p>
        ) : left === null || expired ? (
          <div className="flex max-w-sm flex-col items-center gap-4 text-center">
            <FileIcon size={36} />
            <p className="m-0 text-[15px] leading-relaxed text-muted">
              {expired
                ? 'This link has expired. Open the CV again to get a new five-minute link.'
                : 'CVs open through a link that expires after five minutes. Opening it records your view.'}
            </p>
            <button type="button" className="btn-primary" onClick={open}>{expired ? 'Open again' : 'Open CV'}</button>
          </div>
        ) : url ? (
          <iframe title={`CV of ${name}`} src={url} className="h-[70vh] min-h-[480px] w-full rounded bg-surface" />
        ) : (
          <div className="flex w-full max-w-[520px] flex-col gap-3.5 bg-surface px-6 py-10 shadow-[0_8px_24px_-12px_rgba(5,49,41,0.3)] sm:px-11 sm:py-12" aria-label={`${cv.name}, placeholder preview`}>
            <Bar w="55%" h={18} dark />
            <Bar w="35%" h={10} mid />
            <div className="my-2.5 h-px bg-[#EAE2CD]" />
            {[0, 1, 2].map((s) => (
              <div key={s} className="flex flex-col gap-3.5 pt-2">
                <Bar w="30%" h={12} dark />
                <Bar w="100%" /> <Bar w="92%" /> <Bar w={s === 1 ? '70%' : '96%'} />
              </div>
            ))}
            <div className="mt-5 text-center text-[13px] text-muted">[PDF viewer] · {cv.name}</div>
          </div>
        )}
      </div>
      <div className="border-t border-line px-5 py-3.5 text-[13px] text-muted">
        This view is recorded and shared with the club. Please do not forward or store the CV outside Nyota.
      </div>
    </section>
  );
}

function Bar({ w, h = 9, dark, mid }: { w: string; h?: number; dark?: boolean; mid?: boolean }) {
  return <div style={{ width: w, height: h }} className={`rounded-[3px] ${dark ? 'bg-[#D9CFB4]' : mid ? 'bg-[#EAE2CD]' : 'bg-[#F1ECDF]'}`} />;
}
