import type { ReactNode } from 'react';
import { Check } from './icons';

const tones = {
  green: 'bg-green text-white',
  orange: 'bg-orange text-ink',
  neutral: 'bg-offwhite text-muted',
};
export function Badge({ tone, children, check }: { tone: keyof typeof tones; children: ReactNode; check?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${tones[tone]}`}>
      {check && <Check size={12} />}
      {children}
    </span>
  );
}
