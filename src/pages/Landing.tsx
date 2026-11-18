import { Link } from 'react-router-dom';
import { PublicShell } from '../components/PublicShell';
import { AfricaOutline } from '../components/icons';
import { RibbonPattern } from '../components/RibbonPattern';
import { db } from '../lib/db';
import { useSettings } from '../lib/useSettings';
import { useDbQuery } from '../lib/useDb';
import { schoolList } from '../config/constants';

/** First screen: what Nyota is, then one choice. Each audience has its own page. */
export default function Landing() {
  const S = useSettings();
  const { data: partners } = useDbQuery(() => db.getPartners());
  // The last two words of the headline are highlighted (brand book T4: one highlight per headline).
  const words = S.hero_title.trim().split(/\s+/);
  const [lead, highlight] = [words.slice(0, -2).join(' '), words.slice(-2).join(' ')];
  const choices = [
    { to: '/students', title: 'For students', text: 'MBA students and alumni of European business schools.' },
    { to: '/companies', title: 'For companies', text: 'Companies hiring MBA graduates for roles in or linked to Africa.' },
  ];
  return (
    <PublicShell>
      <section className="relative isolate flex min-h-[calc(100vh-72px)] flex-col justify-center gap-8 overflow-hidden px-4 py-14 md:px-10 lg:min-h-screen xl:px-20">
        <RibbonPattern className="-z-10 text-sand" />
        <AfricaOutline size={420} strokeWidth={6} className="absolute -right-20 top-8 -z-10 hidden opacity-60 xl:block" />
        <div className="self-start bg-orange px-3.5 py-2 font-display text-[15px] uppercase tracking-[0.04em] text-ink sm:text-[17px]">
          {S.forum_name} · {S.forum_date} · {S.forum_venue}
        </div>
        <h1 className="m-0 max-w-[900px] font-display text-[48px] leading-[0.95] tracking-display sm:text-[72px] xl:text-[88px]">
          {lead}{' '}
          {/* Orange text only at display size (contrast rule); Ribbon Green on phones. */}
          <span className="text-green sm:text-orange">{highlight}</span>
        </h1>
        <p className="m-0 max-w-[640px] text-lg leading-[1.55] text-muted md:text-xl">
          {S.hero_text.replace('{schools}', schoolList((partners?.schools ?? []).map((s) => s.name)))}
        </p>
        <div className="grid max-w-[860px] gap-4 sm:grid-cols-2">
          {choices.map((c) => (
            <Link key={c.to} to={c.to} className="group flex flex-col gap-2 rounded-[20px] border-2 border-ink bg-surface p-6 text-ink no-underline hover:bg-ink hover:text-offwhite md:p-7">
              <span className="flex items-center justify-between font-display text-[34px] leading-none tracking-display">
                {c.title}<span aria-hidden="true" className="font-sans text-2xl">→</span>
              </span>
              <span className="text-[15px] leading-relaxed text-muted group-hover:text-ink-muted">{c.text}</span>
            </Link>
          ))}
        </div>
      </section>
    </PublicShell>
  );
}
