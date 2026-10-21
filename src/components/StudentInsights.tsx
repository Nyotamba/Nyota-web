import { Link } from 'react-router-dom';
import type { Candidate, FairCompany, Opening } from '../lib/db';
import { db } from '../lib/db';
import { useDbQuery } from '../lib/useDb';
import { parseCountries } from './TalentPool';

const lower = (xs: string[]) => new Set(xs.map((x) => x.toLowerCase()));
const profileSkills = (c: Candidate) => lower([...c.functions, ...c.sectors, ...c.pastSectors, ...c.languages]);

/** 15 · What companies ask for most this year: skills from openings and roles companies hire for. */
export function marketDemand(companies: FairCompany[], openings: Opening[]) {
  const m = new Map<string, number>();
  openings.forEach((o) => o.skills.forEach((s) => m.set(s, (m.get(s) ?? 0) + 1)));
  companies.forEach((c) => c.hiringFor.forEach((s) => m.set(s, (m.get(s) ?? 0) + 1)));
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

/** 14 · How well a company fits the student: roles, skills of its openings, countries. */
export function companyFit(c: Candidate | null | undefined, co: FairCompany, openings: Opening[]) {
  if (!c) return null;
  const mine = profileSkills(c);
  const wanted = [...new Set([...co.hiringFor, ...openings.filter((o) => o.companyId === co.id).flatMap((o) => o.skills)])];
  const countries = parseCountries(co.hiringCountries);
  const myCountries = new Set([...parseCountries(c.countries), ...parseCountries(c.workedCountries)]);
  const openToAny = /open to any country/i.test(c.countries);
  const countryHit = countries.length > 0 && (openToAny || countries.some((k) => myCountries.has(k)));
  const have = wanted.filter((w) => mine.has(w.toLowerCase()));
  const missing = wanted.filter((w) => !mine.has(w.toLowerCase()));
  const total = wanted.length + (countries.length ? 1 : 0);
  const score = total ? (have.length + (countryHit ? 1 : 0)) / total : 0;
  return { score, have, missing, countryHit, countries, total };
}

/** 13 · The student's reach, and what to add to show up in more searches (numbers only, never which company). */
export function ReachCard({ c }: { c: Candidate }) {
  const { data: stats } = useDbQuery(() => db.getMyProfileStats());
  const { data: companies = [] } = useDbQuery(() => db.listFairCompanies());
  const { data: openings = [] } = useDbQuery(() => db.listOpenings());
  const mine = profileSkills(c);
  const gaps = marketDemand(companies, openings).filter(([s]) => !mine.has(s.toLowerCase())).slice(0, 4);
  return (
    <section aria-labelledby="reach-title" className="card flex flex-col gap-4 p-6">
      <h2 id="reach-title" className="m-0 text-lg font-bold">Your reach</h2>
      <div className="grid grid-cols-3 gap-2 text-center">
        {[['Views · 30 days', stats?.views30 ?? 0], ['CV opened', stats?.cvViews ?? 0], ['Companies', stats?.companies ?? 0]].map(([label, v]) => (
          <div key={label as string} className="flex flex-col gap-1 rounded-xl bg-offwhite px-2 py-3">
            <span className="font-display text-[28px] leading-none tabular-nums">{v}</span>
            <span className="text-[11px] font-semibold text-muted">{label}</span>
          </div>
        ))}
      </div>
      <p className="m-0 text-[12px] text-muted">How many times companies opened your profile. Nyota never tells you which company, and never tells them who you are looking at.</p>
      {gaps.length > 0 && (
        <div className="flex flex-col gap-1.5 border-t border-line-soft pt-3">
          <span className="text-sm font-semibold">Most asked for, not in your profile</span>
          <div className="flex flex-wrap gap-1.5">
            {gaps.map(([s, n]) => <span key={s} className="rounded-full bg-sand px-2.5 py-1 text-[12px] font-semibold">{s} <span className="text-muted">· {n}</span></span>)}
          </div>
          <span className="text-[12px] text-muted">If it is true for you, add it below: you will show up in more company searches.</span>
        </div>
      )}
    </section>
  );
}

/** 15 · Market trends banner. */
export function MarketTrends({ companies, openings }: { companies: FairCompany[]; openings: Opening[] }) {
  const top = marketDemand(companies, openings).slice(0, 8);
  const countries = new Map<string, number>();
  companies.forEach((c) => parseCountries(c.hiringCountries).forEach((k) => countries.set(k, (countries.get(k) ?? 0) + 1)));
  const topCountries = [...countries.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (top.length === 0 && topCountries.length === 0) return null;
  return (
    <section aria-label="What companies look for" className="card flex flex-col gap-3 p-5">
      <span className="overline">What companies look for this year</span>
      <div className="flex flex-wrap gap-1.5">
        {top.map(([s, n]) => <span key={s} className="rounded-full bg-offwhite px-2.5 py-1 text-[13px] font-semibold">{s} <span className="text-muted">· {n}</span></span>)}
      </div>
      {topCountries.length > 0 && (
        <span className="text-sm text-muted">Countries they hire for most: <strong className="text-ink">{topCountries.map(([k]) => k).join(', ')}</strong></span>
      )}
      <Link to="/student/profile" className="self-start text-sm font-semibold">Check your profile shows them →</Link>
    </section>
  );
}
