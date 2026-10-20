import type { ReactNode } from 'react';

export function ComingSoon({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-page flex-col gap-4 px-4 py-12 md:px-10 xl:px-20">
      <h1 className="m-0 font-display text-[40px] font-normal tracking-display">{title}</h1>
      <div className="card max-w-[640px] p-7 text-base leading-relaxed text-muted">{children}</div>
    </div>
  );
}
