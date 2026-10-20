import type { ReactNode } from 'react';

/** Multi-select toggle: on = deep green / off-white, off = white with line-strong border. */
export function Chip({ on, onToggle, children, size = 'md' }: { on: boolean; onToggle: () => void; children: ReactNode; size?: 'sm' | 'md' }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onToggle}
      className={`min-h-[44px] rounded-full border font-semibold transition-colors ${
        size === 'sm' ? 'px-3 text-[13px]' : 'px-4 text-sm'
      } ${on ? 'border-ink bg-ink text-offwhite' : 'border-line-strong bg-surface text-ink hover:border-ink'}`}
    >
      {children}
    </button>
  );
}

export function ChipGroup({ label, options, value, onChange, size }: {
  label: string; options: readonly string[]; value: string[]; onChange: (v: string[]) => void; size?: 'sm' | 'md';
}) {
  const toggle = (o: string) => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-2.5">
      <div className="text-sm font-semibold">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <Chip key={o} on={value.includes(o)} onToggle={() => toggle(o)} size={size}>{o}</Chip>
        ))}
      </div>
    </div>
  );
}
