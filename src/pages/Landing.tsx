import { Link } from 'react-router-dom';
import type { MouseEvent, ReactNode } from 'react';
import { Logo } from '../components/Logo';
import { NyotaMark, AfricaOutline, Filter, Star, Calendar } from '../components/icons';
import { RibbonPattern } from '../components/RibbonPattern';
import { db } from '../lib/db';
import { useSettings } from '../lib/useSettings';
import { useDbQuery } from '../lib/useDb';
import { fairDay, fairTimeRange } from '../lib/time';
import { COMPANY_DEADLINE, EDITION_2026, NYOTA_LINKEDIN, ORGANISER_NAME, PAST_EMPLOYERS, PROFILES_OPEN, schoolList } from '../config/constants';

// Section anchors scroll in place (the router owns the URL hash).
const jump = (id: string) => (e: MouseEvent) => {
  e.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

export default function Landing() {
  const S = useSettings();
  const { data: partners } = useDbQuery(() => db.getPartners());
  const schools = partners?.schools ?? [];
  const clubs = schoolList(schools.map((s) => s.name));
  const emailHref = S.club_email.includes('@') ? `mailto:${S.club_email}` : undefined;
  // The last two words of the headline are highlighted (brand book T4: one highlight per headline).
  const words = S.hero_title.trim().split(/\s+/);
  const [lead, highlight] = [words.slice(0, -2).join(' '), words.slice(-2).join(' ')];
  const navLink = 'text-ink no-underline hover:text-accent';
  return (
    <div className="mx-auto flex max-w-page flex-col">
      <header className="flex h-[72px] items-center gap-6 border-b border-line px-4 md:h-[88px] md:gap-12 md:px-10 xl:px-20">
        <Logo size="lg" />
        <nav aria-label="Main" className="hidden flex-1 gap-8 text-[15px] font-medium lg:flex">
          <Link to="/sessions" className={navLink}>Programme</Link>
          <a href="#how" onClick={jump('how')} className={navLink}>How it works</a>
          <a href="#companies" onClick={jump('companies')} className={navLink}>For companies</a>
          <a href="#about" onClick={jump('about')} className={navLink}>About</a>
        </nav>
        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <Link to="/sign-in" className="btn-secondary text-[15px]">Sign in</Link>
          <Link to="/sign-in?as=student" className="btn-primary hidden text-[15px] sm:inline-flex">Join the fair</Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative isolate grid items-center gap-16 overflow-hidden px-4 pb-20 pt-14 md:px-10 md:pb-[104px] md:pt-24 lg:grid-cols-12 lg:gap-6 xl:px-20">
        <RibbonPattern className="-z-10 text-sand" />
        <div className="flex flex-col gap-7 lg:col-span-8">
          <div className="self-start bg-orange px-3.5 py-2 font-display text-[15px] uppercase tracking-[0.04em] text-ink sm:text-[17px]">
            {S.forum_name} · {S.forum_date} · {S.forum_venue}
          </div>
          <h1 className="m-0 font-display text-[48px] leading-[0.95] tracking-display sm:text-[72px] xl:text-[88px]">
            {lead}{' '}
            {/* Orange text only at display size (contrast rule); Ribbon Green on phones. */}
            <span className="text-green sm:text-orange">{highlight}</span>
          </h1>
          <p className="m-0 max-w-[640px] text-lg leading-[1.55] text-muted md:text-xl">
            {S.hero_text.replace('{schools}', clubs)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3.5">
            <Link to="/sign-in?as=student" className="btn-primary min-h-[56px] px-7 text-[17px]">Join as a student</Link>
            <Link to="/register-company" className="btn-secondary min-h-[56px] px-6 text-[17px]">Join as a company</Link>
          </div>
          <p className="m-0 text-sm text-muted">Your profile stays private until you choose to share it.</p>
        </div>
        <AfricaOutline size={420} strokeWidth={6} className="absolute -right-16 top-10 -z-10 hidden opacity-90 lg:block" />
      </section>

      <RunBy schools={schools} />
      <LastEdition />

      {/* What happens */}
      <section className="flex flex-col gap-12 px-4 py-20 md:px-10 md:py-[120px] xl:px-20">
        <H2>Two days. Every room worth entering.</H2>
        <ul className="m-0 grid list-none gap-6 p-0 md:grid-cols-3">
          {[
            ['Employer sessions', 'Companies present what they’re building across Africa and the roles they’re hiring for.'],
            ['Open conversations', 'Ask the questions an application form never lets you ask.'],
            ['Interviews', 'Companies shortlist you before the fair. You choose the time.'],
          ].map(([t, d]) => (
            <li key={t} className="flex flex-col gap-2.5 border-t-2 border-ink pt-5">
              <h3 className="m-0 text-2xl font-bold">{t}</h3>
              <p className="m-0 text-base leading-relaxed text-muted">{d}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* How it works */}
      <section id="how" className="flex scroll-mt-4 flex-col gap-14 px-4 pb-20 md:px-10 md:pb-[120px] xl:px-20">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:gap-10">
          <H2 className="flex-1">Three steps to the fair.</H2>
          <p className="m-0 text-[17px] leading-[1.55] text-muted lg:w-[420px]">
            For MBA students and alumni of European business schools, whatever your nationality or background. Free, and on your terms.
          </p>
        </div>
        <ol className="m-0 grid list-none gap-6 p-0 md:grid-cols-3">
          {[
            ['Sign up', 'Tell us your background, the roles you want and where you want to work. You’ll upload your CV as part of registration.'],
            ['Get verified', 'Your club confirms you’re a student or alumnus. Your profile goes live only when you say so.'],
            ['Meet at the fair', 'Companies shortlist you and request interviews. You pick the slot.'],
          ].map(([t, d], i) => (
            <li key={t} className="flex flex-col gap-4 rounded-[20px] border border-line bg-surface p-8 md:min-h-[300px] md:p-9">
              <div className="font-display text-[64px] text-orange" aria-hidden="true">0{i + 1}</div>
              <h3 className="m-0 text-2xl font-bold">{t}</h3>
              <p className="m-0 text-base leading-relaxed text-muted">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <UpcomingSessions />

      {/* Companies */}
      <section id="companies" className="on-ink relative isolate mx-2 grid scroll-mt-4 items-start gap-12 overflow-hidden rounded-[32px] bg-ink px-6 py-16 text-offwhite sm:mx-4 md:px-12 md:py-[104px] lg:grid-cols-12 lg:gap-6 xl:mx-10 xl:px-20">
        <RibbonPattern className="-z-10 text-ink-line" seed={3} lines={6} />
        <div className="flex flex-col gap-6 lg:col-span-6">
          <div className="text-[13px] font-bold uppercase tracking-overline text-orange">For companies</div>
          <H2>Find the people who will build your Africa strategy.</H2>
          <p className="m-0 text-lg leading-relaxed text-ink-muted">
            Meet experienced MBA professionals with real ties to Africa, from Europe’s leading business schools, through one
            registration. Search verified profiles, shortlist candidates and book interviews before and after the fair.
          </p>
          <div className="mt-2 flex flex-wrap gap-3.5">
            <Link to="/register-company" className="btn min-h-[56px] rounded-full bg-orange px-7 text-[17px] text-ink hover:bg-[#FE9640] hover:text-ink">
              Register your company
            </Link>
            <Link to="/sign-in?as=company" className="btn min-h-[56px] rounded-full border border-ink-border px-6 text-[17px] text-offwhite hover:border-offwhite hover:text-offwhite">
              Already registered? Sign in
            </Link>
          </div>
          <p className="m-0 text-sm text-ink-muted">
            Free to take part. Register by {COMPANY_DEADLINE} to see candidate profiles from {PROFILES_OPEN}.
          </p>
        </div>
        <ul className="m-0 flex list-none flex-col p-0 lg:col-span-5 lg:col-start-8">
          <Feature icon={<Filter size={24} />} title="Search by what matters">Function, sector, country, language and availability.</Feature>
          <Feature icon={<Star size={24} />} title="Shortlist with your team">Share candidates and send interview requests together.</Feature>
          <Feature icon={<Calendar size={24} />} title="Schedule without the email chain">Open your slots. Candidates book. Invites land in your calendar.</Feature>
          <Feature icon={<Calendar size={24} />} title="Two to three hours in total" last>Afternoon sessions, timed for African and European time zones.</Feature>
        </ul>
      </section>

      {/* Privacy, in one line */}
      <section className="flex flex-col gap-5 px-4 pt-20 md:px-10 md:pt-[120px] xl:px-20">
        <H2>Your data, your call.</H2>
        <p className="m-0 max-w-[70ch] text-[17px] leading-[1.6] text-muted">
          Companies see your profile only after you opt in and your club verifies it. Withdraw at any time.{' '}
          <Link to="/privacy" className="font-semibold">Read the privacy notice</Link>
        </p>
      </section>

      {/* About */}
      <section id="about" className="flex scroll-mt-4 flex-col gap-5 px-4 py-20 md:px-10 md:py-[120px] xl:px-20">
        <H2>About Nyota.</H2>
        <p className="m-0 max-w-[70ch] text-[17px] leading-[1.6] text-muted">
          Nyota means “star” in Swahili. It gives a name to a community that was already there: MBA professionals with real ties to
          Africa, and the employers looking for them. Started by the IESE Africa Business Club, the fair is now run jointly by the
          Black and African business clubs of {clubs}.
        </p>
      </section>

      <footer id="contact" className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line px-4 py-8 text-sm text-muted md:px-10 xl:px-20">
        <span className="flex items-center gap-2 text-ink"><NyotaMark size={24} /><span className="font-display text-lg">Nyota</span></span>
        <a href={NYOTA_LINKEDIN} target="_blank" rel="noreferrer">LinkedIn</a>
        {S.instagram_url && <a href={S.instagram_url} target="_blank" rel="noreferrer">Instagram</a>}
        <Link to="/privacy">Privacy notice</Link>
        {emailHref ? <a href={emailHref}>{S.club_email}</a> : <span className="select-all">{S.club_email}</span>}
      </footer>
    </div>
  );
}

/** The organising clubs. Logos appear as soon as they are uploaded (Settings > Lists > Schools). */
function RunBy({ schools }: { schools: { name: string; logoUrl: string | null }[] }) {
  const { data } = useDbQuery(() => db.getPartners());
  const companies = data?.companies ?? [];
  if (!schools.length && !companies.length) return null;
  return (
    <section className="flex flex-col gap-10 border-y border-line px-4 py-10 md:px-10 xl:px-20">
      {schools.length > 0 && <LogoStrip title="Run by the clubs of" list={schools} />}
      {companies.length > 0 && <LogoStrip title="Companies joining in 2027" list={companies} />}
    </section>
  );
}

function LogoStrip({ title, list }: { title: string; list: { name: string; logoUrl: string | null }[] }) {
  return (
    <div className="flex flex-col gap-5">
      <h2 className="overline m-0">{title}</h2>
      <ul className="m-0 grid list-none grid-cols-2 gap-4 p-0 sm:grid-cols-3 lg:grid-cols-6">
        {list.map((p) => (
          <li key={p.name} className="flex h-[72px] items-center justify-center rounded-xl border border-line bg-surface px-4 text-center text-sm font-bold" title={p.name}>
            {p.logoUrl ? <img src={p.logoUrl} alt={p.name} className="max-h-10 max-w-full object-contain" loading="lazy" /> : p.name}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Proof from 2026. Employer logos only show once each employer has agreed (see PAST_EMPLOYERS). */
function LastEdition() {
  return (
    <section className="flex flex-col gap-10 px-4 pt-20 md:px-10 md:pt-[120px] xl:px-20">
      <div className="flex flex-col gap-6">
        <h2 className="overline m-0">Our first edition, 2026</h2>
        <dl className="m-0 grid grid-cols-2 gap-6 lg:grid-cols-4">
          {EDITION_2026.map(([n, label]) => (
            <div key={label} className="flex flex-col gap-1 border-t-2 border-ink pt-4">
              <dd className="m-0 font-display text-[56px] leading-none tabular-nums">{n}</dd>
              <dt className="text-[15px] font-semibold text-muted">{label}</dt>
            </div>
          ))}
        </dl>
      </div>
      {PAST_EMPLOYERS.length > 0 && <LogoStrip title="Employers at our first edition" list={PAST_EMPLOYERS} />}
    </section>
  );
}

/** The next sessions of the programme, so visitors see the fair is live. Hidden until there is one. */
function UpcomingSessions() {
  const { data: sessions = [] } = useDbQuery(() => db.listSessions());
  const next = sessions.filter((s) => Date.parse(s.startsAt) + s.durationMin * 60_000 > Date.now()).slice(0, 3);
  if (!next.length) return null;
  return (
    <section id="programme" className="flex flex-col gap-10 px-4 pb-20 md:px-10 md:pb-[120px] xl:px-20">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:gap-10">
        <H2 className="flex-1">On the programme.</H2>
        <Link to="/sessions" className="btn-secondary self-start text-[15px] lg:self-auto">See the full programme</Link>
      </div>
      <ul className="m-0 grid list-none gap-6 p-0 md:grid-cols-3">
        {next.map((s) => (
          <li key={s.id} className="flex flex-col gap-3 rounded-[20px] border border-line bg-surface p-7">
            <span className="text-[13px] font-bold uppercase tracking-overline text-muted">{s.kind}</span>
            <h3 className="m-0 text-xl font-bold leading-snug">{s.title}</h3>
            <span className="text-sm font-semibold text-muted">{s.companyName ?? ORGANISER_NAME}</span>
            <span className="mt-auto text-sm tabular-nums">{fairDay(s.startsAt)}<br />{fairTimeRange(s.startsAt, s.durationMin)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function H2({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <h2 className="m-0 font-display text-[44px] leading-[0.95] tracking-display md:text-[64px]">{children}</h2>
      <span aria-hidden="true" className="h-1 w-16 bg-orange" />
    </div>
  );
}

function Feature({ icon, title, children, last }: { icon: ReactNode; title: string; children: ReactNode; last?: boolean }) {
  return (
    <li className={`flex gap-[18px] py-6 ${last ? '' : 'border-b border-ink-line'}`}>
      <span className="shrink-0 text-orange">{icon}</span>
      <div className="flex flex-col gap-1.5">
        <div className="text-lg font-bold">{title}</div>
        <div className="text-[15px] leading-[1.55] text-ink-muted">{children}</div>
      </div>
    </li>
  );
}
