import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { PublicShell } from '../components/PublicShell';
import { db } from '../lib/db';
import { useDbQuery } from '../lib/useDb';
import { COMPANY_DEADLINE, EDITION_2026, ORGANISING_SCHOOLS, PAST_EMPLOYERS, PROFILES_OPEN, orderSchools, schoolList } from '../config/constants';

/** Page for students: what happens, how to join. */
export function ForStudents() {
  return (
    <Page title="For students" intro="Meet companies offering full-time jobs and internships in or linked to Africa. The fair is free for MBA students and alumni of European business schools, whatever your nationality."
      actions={<>
        <Link to="/sign-in?as=student" className="btn-primary min-h-[56px] px-7 text-[17px]">Join as a student</Link>
        <Link to="/sign-in" className="btn-secondary min-h-[56px] px-6 text-[17px]">Sign in</Link>
      </>}
      note={<>Companies see your profile only if you agree to share it. You can withdraw at any time. <Link to="/privacy" className="font-semibold">Read the privacy notice</Link>.</>}>
      <Items title="At the fair" items={[
        ['Company sessions', 'Companies present their work in Africa and the roles they are hiring for.'],
        ['Questions', 'You can put your questions to recruiters during the sessions.'],
        ['Jobs and internships', 'Companies post their full-time roles and internships. You can tell them which ones interest you.'],
        ['Interviews', 'Companies request interviews with the candidates they shortlist. You choose a time from their slots.'],
      ]} />
      <Steps title="How to take part" steps={[
        ['Create your profile', 'Add your background, the roles you want, where you want to work and your CV.'],
        ['Get verified', 'Your club confirms that you are a student or alumnus of your school.'],
        ['Join the sessions', 'Register for the sessions you want. If a company requests an interview, book a time.'],
      ]} />
    </Page>
  );
}

/** Page for companies: what they can do, how to register. */
export function ForCompanies() {
  return (
    <Page title="For companies" intro="Meet MBA students and alumni from European business schools who want to work in or with Africa. Taking part is free."
      actions={<>
        <Link to="/register-company" className="btn-primary min-h-[56px] px-7 text-[17px]">Register your company</Link>
        <Link to="/sign-in?as=company" className="btn-secondary min-h-[56px] px-6 text-[17px]">Already registered? Sign in</Link>
      </>}
      note={<>Register by {COMPANY_DEADLINE} to see candidate profiles from {PROFILES_OPEN}.</>}>
      <Items title="What you can do" items={[
        ['Search profiles', 'Filter verified candidates by function, sector, country, language and availability.'],
        ['Shortlist with your team', 'Keep one shared shortlist and send interview requests.'],
        ['Schedule interviews', 'Publish your slots. Candidates book a time and you both receive a calendar invite.'],
        ['Present your company', 'Plan for two to three hours in total. Sessions run in the afternoon, for African and European time zones.'],
      ]} />
      <Steps title="How to take part" steps={[
        ['Register your company', `Complete the form by ${COMPANY_DEADLINE}.`],
        ['Receive your access code', 'We review each registration and email you a code to create your account.'],
        ['Meet candidates', `Candidate profiles open from ${PROFILES_OPEN}. Interviews and sessions follow at the fair.`],
      ]} />
    </Page>
  );
}

function Page({ title, intro, actions, note, children }: { title: string; intro: string; actions: ReactNode; note: ReactNode; children: ReactNode }) {
  return (
    <PublicShell>
      <div className="mx-auto flex max-w-page flex-col gap-16 px-4 py-12 md:px-10 md:py-16 xl:px-20">
        <header className="flex flex-col gap-6">
          <h1 className="m-0 font-display text-[56px] leading-[0.95] tracking-display md:text-[80px]">{title}</h1>
          <p className="m-0 max-w-[62ch] text-lg leading-[1.55] text-muted md:text-xl">{intro}</p>
          <div className="flex flex-wrap items-center gap-3.5">{actions}</div>
          <p className="m-0 max-w-[70ch] text-sm leading-relaxed text-muted">{note}</p>
        </header>
        {children}
        <AboutNyota />
      </div>
    </PublicShell>
  );
}

function Items({ title, items }: { title: string; items: [string, string][] }) {
  return (
    <section className="flex flex-col gap-8">
      <H2>{title}</H2>
      <ul className={`m-0 grid list-none gap-6 p-0 md:grid-cols-2 ${items.length === 3 ? 'xl:grid-cols-3' : 'xl:grid-cols-4'}`}>
        {items.map(([t, d]) => (
          <li key={t} className="flex flex-col gap-2 border-t-2 border-ink pt-4">
            <h3 className="m-0 text-xl font-bold">{t}</h3>
            <p className="m-0 text-base leading-relaxed text-muted">{d}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Steps({ title, steps }: { title: string; steps: [string, string][] }) {
  return (
    <section className="flex flex-col gap-8">
      <H2>{title}</H2>
      <ol className="m-0 grid list-none gap-5 p-0 md:grid-cols-3">
        {steps.map(([t, d], i) => (
          <li key={t} className="flex flex-col gap-3 rounded-[20px] border border-line bg-surface p-7">
            <div className="font-display text-[52px] leading-none text-orange" aria-hidden="true">0{i + 1}</div>
            <h3 className="m-0 text-xl font-bold">{t}</h3>
            <p className="m-0 text-base leading-relaxed text-muted">{d}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Who runs the fair and the 2026 figures, on both audience pages. */
function AboutNyota() {
  const { data } = useDbQuery(() => db.getPartners());
  const schools = orderSchools(data?.schools?.length ? data.schools : ORGANISING_SCHOOLS.map((name) => ({ name, logoUrl: null })));
  const companies = data?.companies ?? [];
  return (
    <section className="flex flex-col gap-10 border-t border-line pt-12">
      <div className="flex flex-col gap-4">
        <H2>Run by Nyota</H2>
        <p className="m-0 max-w-[70ch] text-[17px] leading-[1.6] text-muted">
          Nyota (“star” in Swahili) is an association of MBA students from business schools across Europe, including{' '}
          {schoolList(schools.map((s) => s.name))}.
        </p>
        <LogoStrip list={schools} />
      </div>
      <div className="flex flex-col gap-5">
        <h2 className="overline m-0">The 2026 edition</h2>
        <dl className="m-0 grid grid-cols-2 gap-6 lg:grid-cols-4">
          {EDITION_2026.map(([n, label]) => (
            <div key={label} className="flex flex-col gap-1 border-t-2 border-ink pt-3">
              <dd className="m-0 font-display text-[48px] leading-none tabular-nums">{n}</dd>
              <dt className="text-[15px] font-semibold text-muted">{label}</dt>
            </div>
          ))}
        </dl>
      </div>
      {PAST_EMPLOYERS.length > 0 && <div className="flex flex-col gap-4"><h2 className="overline m-0">Employers in 2026</h2><LogoStrip list={PAST_EMPLOYERS} /></div>}
      {companies.length > 0 && <div className="flex flex-col gap-4"><h2 className="overline m-0">Companies joining in 2027</h2><LogoStrip list={companies} /></div>}
    </section>
  );
}

function LogoStrip({ list }: { list: { name: string; logoUrl: string | null }[] }) {
  return (
    <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-4 xl:grid-cols-6">
      {list.map((p) => (
        <li key={p.name} className="flex h-[72px] items-center justify-center rounded-xl border border-line bg-surface px-3 text-center text-sm font-bold" title={p.name}>
          {p.logoUrl ? <img src={p.logoUrl} alt={p.name} className="max-h-10 max-w-full object-contain" loading="lazy" /> : p.name}
        </li>
      ))}
    </ul>
  );
}

function H2({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="m-0 font-display text-[36px] leading-[0.95] tracking-display md:text-[48px]">{children}</h2>
      <span aria-hidden="true" className="h-1 w-14 bg-orange" />
    </div>
  );
}
