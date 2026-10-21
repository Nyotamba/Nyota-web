import { Link } from 'react-router-dom';
import type { MouseEvent, ReactNode } from 'react';
import { Logo } from '../components/Logo';
import { Badge } from '../components/Badge';
import { NyotaMark, AfricaOutline, Filter, Lock, Star, Calendar } from '../components/icons';
import { RibbonPattern } from '../components/RibbonPattern';
import { db } from '../lib/db';
import { useSettings } from '../lib/useSettings';
import { useDbQuery } from '../lib/useDb';
import { fairDay, fairTimeRange } from '../lib/time';
import {
  CLUB_INSTAGRAM, CLUB_LINKEDIN, CLUB_NAME, NYOTA_LINKEDIN,
} from '../config/constants';

// Section anchors scroll in place (the router owns the URL hash).
const jump = (id: string) => (e: MouseEvent) => {
  e.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

export default function Landing() {
  const S = useSettings();
  const FORUM_NAME = S.forum_name, CLUB_EMAIL = S.club_email;
  const clubHref = CLUB_EMAIL.includes('@') ? `mailto:${CLUB_EMAIL}` : undefined;
  // The last two words of the headline are highlighted (brand book T4: one highlight per headline).
  const words = S.hero_title.trim().split(/\s+/);
  const [lead, highlight] = [words.slice(0, -2).join(' '), words.slice(-2).join(' ')];
  return (
    <div className="mx-auto flex max-w-page flex-col">
      <header className="flex h-[72px] items-center gap-6 border-b border-line px-4 md:h-[88px] md:gap-12 md:px-10 xl:px-20">
        <Logo size="lg" />
        <nav aria-label="Main" className="hidden flex-1 gap-8 text-[15px] font-medium lg:flex">
          <Link to="/sessions" className="text-ink no-underline hover:text-accent">Programme</Link>
          <a href="#how" onClick={jump('how')} className="text-ink no-underline hover:text-accent">How it works</a>
          <a href="#companies" onClick={jump('companies')} className="text-ink no-underline hover:text-accent">For companies</a>
          <a href="#privacy" onClick={jump('privacy')} className="text-ink no-underline hover:text-accent">Privacy</a>
        </nav>
        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <Link to="/sign-in" className="btn-secondary text-[15px]">Sign in</Link>
          <Link to="/sign-in?as=student" className="btn-primary hidden text-[15px] sm:inline-flex">Create your profile</Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative isolate grid items-center gap-16 overflow-hidden px-4 pb-20 pt-14 md:px-10 md:pb-[104px] md:pt-24 lg:grid-cols-12 lg:gap-6 xl:px-20">
        <RibbonPattern className="-z-10 text-sand" />
        <div className="flex flex-col gap-7 lg:col-span-7">
          <div className="self-start bg-orange px-3.5 py-2 font-display text-[15px] tracking-[0.04em] text-ink sm:text-[17px]">
            {S.forum_name} · {S.forum_date} · {S.forum_venue}
          </div>
          <h1 className="m-0 font-display text-[48px] leading-[0.95] tracking-display sm:text-[72px] xl:text-[96px]">
            {lead}{' '}
            {/* Orange text only at display size (contrast rule); Ribbon Green on phones. */}
            <span className="text-green sm:text-orange">{highlight}</span>
          </h1>
          <p className="m-0 max-w-[620px] text-lg leading-[1.55] text-muted md:text-xl">
            {S.hero_text}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3.5">
            <Link to="/sign-in?as=student" className="btn-primary min-h-[56px] px-7 text-[17px]">Create your profile</Link>
            <a href="#companies" onClick={jump('companies')} className="btn-secondary min-h-[56px] px-6 text-[17px]">I’m a company</a>
          </div>
          <p className="m-0 text-sm text-muted">Free for students · Sign in with a magic link, no password</p>
        </div>

        <div className="relative mx-auto w-full max-w-[420px] lg:col-span-5 lg:col-start-8">
          <AfricaOutline size={420} strokeWidth={6} className="absolute -right-24 -top-20 hidden opacity-90 sm:block" />
          <div className="relative flex flex-col gap-[18px] rounded-[20px] border border-line bg-surface p-7 shadow-[0_24px_60px_-30px_rgba(5,49,41,0.35)]">
            <div className="text-xs font-bold uppercase tracking-overline text-muted">What companies see</div>
            <div className="flex flex-wrap items-center gap-3.5">
              <div className="flex size-[52px] shrink-0 items-center justify-center rounded-full bg-ink font-display text-xl text-offwhite">AD</div>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="text-[19px] font-extrabold">Amara Diallo</div>
                <div className="text-sm text-muted">MBA · IESE Business School · 2027</div>
              </div>
              <Badge tone="green" check>Verified</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {['Strategy', 'Business development', 'Energy'].map((t) => (
                <span key={t} className="rounded-full bg-sand px-3 py-1.5 text-[13px] font-semibold">{t}</span>
              ))}
            </div>
            <dl className="m-0 grid grid-cols-2 gap-3.5 text-sm">
              {[['Experience', '6 years'], ['Languages', 'English, French'], ['Looking for', 'Full-time'], ['Available', 'July 2027']].map(([k, v]) => (
                <div key={k} className="flex flex-col gap-0.5"><dt className="text-muted">{k}</dt><dd className="m-0 font-semibold">{v}</dd></div>
              ))}
            </dl>
            <div className="flex gap-2.5 border-t border-line-soft pt-1.5" aria-hidden="true">
              <span className="flex-1 rounded-field border border-line-strong p-3 text-center text-sm font-semibold">View CV</span>
              <span className="flex-1 rounded-field bg-ink p-3 text-center text-sm font-semibold text-offwhite">Shortlist</span>
            </div>
          </div>
        </div>
      </section>

      <Partners />

      {/* How it works */}
      <section id="how" className="flex scroll-mt-4 flex-col gap-14 px-4 py-20 md:px-10 md:py-[120px] xl:px-20">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:gap-10">
          <H2 className="flex-1">Three steps to the fair.</H2>
          <p className="m-0 text-[17px] leading-[1.55] text-muted lg:w-[420px]">For students and alumni of European MBA programs. Free, and entirely in your control.</p>
        </div>
        <ol className="m-0 grid list-none gap-6 p-0 md:grid-cols-3">
          {[
            ['Build your profile', 'Your background, the roles, sectors and countries you target, a short story in your own words, and your CV as a PDF.'],
            ['Consent, then verification', 'You choose to share your profile. The club checks it before any company can see it. You can withdraw at any time.'],
            ['Meet at the fair', 'Companies shortlist you and request interviews. You pick a slot during the fair, and the confirmation lands in your inbox.'],
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
      <section id="companies" className="on-ink relative isolate mx-2 grid scroll-mt-4 overflow-hidden items-start gap-12 rounded-[32px] bg-ink px-6 py-16 text-offwhite sm:mx-4 md:px-12 md:py-[104px] lg:grid-cols-12 lg:gap-6 xl:mx-10 xl:px-20">
        <RibbonPattern className="-z-10 text-ink-line" seed={3} lines={6} />
        <div className="flex flex-col gap-6 lg:col-span-6">
          <div className="text-[13px] font-bold uppercase tracking-overline text-orange">For partner companies</div>
          <H2>Find the people who will build your Africa strategy.</H2>
          <p className="m-0 text-lg leading-relaxed text-ink-muted">
            Access is by invitation from the {CLUB_NAME}. Filter verified profiles, read CVs, shortlist and book
            interviews for the fair, all in one place.
          </p>
          <div className="mt-2 flex flex-wrap gap-3.5">
            <a href={clubHref ?? '#contact'} onClick={clubHref ? undefined : jump('contact')}
              className="btn min-h-[56px] rounded-full bg-orange px-7 text-[17px] text-ink hover:bg-[#FE9640] hover:text-ink">
              Request an invitation
            </a>
            <Link to="/sign-in?as=company" className="btn min-h-[56px] rounded-full border border-ink-border px-6 text-[17px] text-offwhite hover:border-offwhite hover:text-offwhite">
              Already invited? Sign in
            </Link>
          </div>
        </div>
        <ul className="m-0 flex list-none flex-col p-0 lg:col-span-5 lg:col-start-8">
          <Feature icon={<Filter size={24} />} title="Precise filters">Function, sector, region, country, language, position type and availability.</Feature>
          <Feature icon={<Lock size={24} />} title="Secure CV viewer">CVs open through short-lived links. Every access is logged.</Feature>
          <Feature icon={<Star size={24} />} title="Shortlists and interview requests">Share a shortlist with your team and reach candidates in one click.</Feature>
          <Feature icon={<Calendar size={24} />} title="Interview scheduling" last>Open interview slots for the fair, let candidates book, receive calendar invites.</Feature>
        </ul>
      </section>

      {/* Privacy */}
      <section id="privacy" className="flex scroll-mt-4 flex-col gap-12 px-4 pb-20 pt-20 md:px-10 md:pb-[104px] md:pt-[120px] xl:px-20">
        <H2>Your data, your call.</H2>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Visible only with consent', 'Companies see your profile only after you opt in and the club has verified it.'],
            ['Withdraw in one click', 'Withdrawing consent hides your profile from every company, immediately.'],
            ['CVs never float around', 'Each CV opens through a link that expires after five minutes, and every view is recorded.'],
            ['Deleted after the fair', `Profiles and CVs are erased ${S.retention_months} months after the fair. You can delete your account sooner.`],
          ].map(([t, d]) => (
            <div key={t} className="flex flex-col gap-2.5 border-t-2 border-ink pt-5">
              <h3 className="m-0 text-[19px] font-bold">{t}</h3>
              <p className="m-0 text-[15px] leading-relaxed text-muted">{d}</p>
            </div>
          ))}
        </div>
        <p className="m-0 rounded-[14px] border border-line bg-surface px-6 py-5 text-[15px] text-muted">
          We never ask for ethnicity, religion, health, nationality or immigration status.
        </p>
        <p className="m-0 max-w-[90ch] text-[15px] leading-relaxed text-muted">
          To improve the fair, the club records which profiles companies open and search for, and which companies students click
          on, sign up with or show interest in. The club only looks at these as anonymous statistics (never “who viewed whom”),
          and deletes them after 12 months.
        </p>
      </section>

      <footer id="contact" className="flex flex-col gap-8 border-t border-line px-4 py-10 text-sm text-muted md:px-10 xl:px-20">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-10">
          {/* Club logo: use the official file only (brand book L1–L2), on a light background with clear space. */}
          <div className="flex h-[88px] w-[200px] shrink-0 items-center justify-center rounded-xl border border-dashed border-line-strong bg-surface text-center text-[13px]">
            [{CLUB_NAME} logo]
          </div>
          <p className="m-0 max-w-[60ch] flex-1 leading-relaxed">
            {FORUM_NAME} is run by the {CLUB_NAME}. The {CLUB_NAME} connects IESE students and alumni with African companies,
            career opportunities and each other. Nyota means “star” in Swahili.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line pt-6">
          <span className="flex items-center gap-2 text-ink"><NyotaMark size={24} /><span className="font-display text-lg">Nyota</span></span>
          <a href={CLUB_LINKEDIN} target="_blank" rel="noreferrer">LinkedIn · {CLUB_NAME}</a>
          <a href={CLUB_INSTAGRAM} target="_blank" rel="noreferrer">Instagram · @IESEAfricaBusinessClub</a>
          <a href={NYOTA_LINKEDIN} target="_blank" rel="noreferrer">LinkedIn · Nyota</a>
          <a href="#privacy" onClick={jump('privacy')}>Privacy notice</a>
          {clubHref ? <a href={clubHref}>{CLUB_EMAIL}</a> : <span className="select-all">{CLUB_EMAIL}</span>}
        </div>
      </footer>
    </div>
  );
}

/** Logos an admin chose to show (brand book K1–K3: official files, equal height, confirmed partners only). */
function Partners() {
  const { data } = useDbQuery(() => db.getPartners());
  const companies = data?.companies ?? [];
  const schools = data?.schools ?? [];
  const strip = (title: string, id: string, list: { name: string; logoUrl: string }[], placeholder: string) => (
    <div className="flex flex-col gap-6">
      <h2 id={id} className="overline m-0">{title}</h2>
      {list.length ? (
        <ul className="m-0 grid list-none grid-cols-2 gap-4 p-0 sm:grid-cols-3 lg:grid-cols-6">
          {list.map((p) => (
            <li key={p.name} className="flex h-[72px] items-center justify-center rounded-xl border border-line bg-surface px-4" title={p.name}>
              <img src={p.logoUrl} alt={p.name} className="max-h-10 max-w-full object-contain" loading="lazy" />
            </li>
          ))}
        </ul>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex h-[72px] items-center justify-center rounded-xl border border-dashed border-line-strong text-sm text-muted">{placeholder}</div>
          ))}
        </div>
      )}
    </div>
  );
  return (
    <section aria-labelledby="partners" className="flex flex-col gap-10 border-y border-line px-4 pb-14 pt-10 md:px-10 xl:px-20">
      {strip('Participating companies', 'partners', companies, '[Company logo]')}
      {schools.length > 0 && strip('Partner schools', 'partner-schools', schools, '')}
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
            <span className="text-sm font-semibold text-muted">{s.companyName ?? 'IESE Africa Business Club'}</span>
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
