import { useEffect } from 'react';

/** Polite status message, announced to screen readers; clears itself. */
export function Notice({ message, onDone, tone = 'green' }: { message: string | null; onDone: () => void; tone?: 'green' | 'danger' }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, [message, onDone]);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      {message && (
        <div className={`pointer-events-auto rounded-full px-5 py-3 text-sm font-semibold shadow-lg ${tone === 'green' ? 'bg-ink text-offwhite' : 'bg-danger text-white'}`}>
          {message}
        </div>
      )}
    </div>
  );
}
