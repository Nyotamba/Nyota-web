import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Logo } from '../components/Logo';
import { useSettings } from '../lib/useSettings';

/** The full privacy notice. The homepage only carries one line and links here. */
export default function Privacy() {
  const S = useSettings();
  return (
    <div className="mx-auto flex min-h-full max-w-page flex-col">
      <header className="flex h-[72px] items-center border-b border-line px-4 md:px-10"><Logo /></header>
      <main className="mx-auto flex w-full max-w-[760px] flex-col gap-10 px-4 py-12 md:py-16">
        <div className="flex flex-col gap-3">
          <h1 className="m-0 font-display text-[44px] leading-[0.95] tracking-display md:text-[56px]">Privacy notice</h1>
          <p className="m-0 text-[17px] leading-relaxed text-muted">What we collect for the {S.forum_name}, who sees it, and how you stay in control.</p>
        </div>
        <Block title="Visible only with your consent">
          Companies see your profile only after you opt in and your club has verified it. Withdrawing your consent hides your profile
          from every company, immediately.
        </Block>
        <Block title="What companies see">
          Companies taking part can see verified, shared profiles. Companies whose sessions you register for, or whose openings you
          show interest in, also see your name, your profile and whether you attended.
        </Block>
        <Block title="Your CV">
          Each CV opens through a link that expires after five minutes, and every view is recorded. We do not send CVs to companies as
          a file or a CV book.
        </Block>
        <Block title="What we never ask">
          We never ask for ethnicity, religion, health, passport or immigration status. Please leave them out of your CV too.
        </Block>
        <Block title="Optional information">
          Gender and nationality are optional. We use them only as anonymous statistics about the talent pool. Companies never see
          them, and they are never used to filter profiles.
        </Block>
        <Block title="How we improve the fair">
          We record which profiles companies open and search for, and which companies students click on, sign up with or show interest
          in. We only look at these as anonymous statistics, never as “who viewed whom”, and delete them after 12 months.
        </Block>
        <Block title="Keeping or deleting your data">
          We keep your profile after the fair so you can take part in future editions. You can ask us to delete it at any time by
          writing to <a href={`mailto:${S.club_email}`} className="font-semibold">{S.club_email}</a>.
        </Block>
        <Link to="/" className="self-start text-sm font-semibold">← Back to the homepage</Link>
      </main>
    </div>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 border-t-2 border-ink pt-5">
      <h2 className="m-0 text-xl font-bold">{title}</h2>
      <p className="m-0 text-base leading-relaxed text-muted">{children}</p>
    </section>
  );
}
