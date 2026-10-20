import { useState } from 'react';

/** An access code shown to admins, with a copy button (falls back to selecting the text). */
export function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async (e: React.MouseEvent<HTMLButtonElement>) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      const el = e.currentTarget.previousElementSibling;
      if (el) window.getSelection()?.selectAllChildren(el);
    }
  };
  return (
    <span className="inline-flex items-center gap-2">
      <code className="select-all rounded-md bg-sand px-2 py-1 font-mono text-[13px] font-semibold tracking-[0.08em] text-ink">{code}</code>
      <button type="button" onClick={copy} className="btn-small px-3 text-[12px]">{copied ? 'Copied' : 'Copy'}</button>
    </span>
  );
}
