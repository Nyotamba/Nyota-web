import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { db, type Candidate, type CompanyBenchmark } from '../../lib/db';
import { useDbQuery } from '../../lib/useDb';
import { fullName, shortSchool } from '../../lib/candidate';
import { parseCountries } from '../../components/TalentPool';

const has = (c: Candidate) => new Set([...c.functions, ...c.sectors, ...c.pastSectors, ...c.languages].map((x) => x.toLowerCase()));
const expBucket = (y: number | null) => (y === null ? 'Not answered' : y <= 2 ? '0–2 years' : y <= 5 ? '3–5 years' : y <= 9 ? '6–9 years' : '10+ years');

/** The company's insights: how it compares, who to look at, who likes it, how fast it answers. */
export function CompanyInsights({ companyId }: { companyId: string }) {
  const { data: bench } = useDbQuery(() => db.getCompanyBenchmark(companyId), [companyId]);
  const { data: cands = [] } = useDbQuery(() => db.listVisibleCandidates());
  const { data: openings = [] } = useDbQuery(() => db.listOpenings());
  const { data: seen = [] } = useDbQuery(() => db.listSeenCandidates());
  const { data: requests = [] } = useDbQuery(() => db.listInterviewRequests(companyId), [companyId]);
  const { data: me } = useDbQuery(() => db.getCompany(companyId), [companyId]);
  const mine = openings.filter((o) => o.isMine && o.companyId === companyId && o.published);
  const { data: interest = [] } = useDbQuery(async () => {
    const out: { candidateId: string; at: string }[] = [];
    for (const o of mine) for (const p of await db.listOpeningInterest(o.id)) out.push({ candidateId: p.candidateId, at: p.interestedAt });
    return out;
  }, [mine.map((o) => o.id).join()]);

  return (
    <>
      {bench && <Benchmark b={bench} />}
      <Matches cands={cands} openings={mine} hiringFor={me?.hiringFor ?? []} seen={new Set(seen)} />
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <WhoLikesYou people={cands.filter((c) => interest.some((i) => i.candidateId === c.id))} />
        <ResponseTime interest={interest} requests={requests} cands={cands} />
      </div>
    </>
  );
}

/** 9 · You vs the average company and your sector. */
function Benchmark({ b }: { b: CompanyBenchmark }) {
  if (!b.me || !b.all) return null;
  const rows: [string, keyof NonNullable<CompanyBenchmark['me']>][] = [
    ['Students who clicked on your page', 'clicks'],
    ['Interests per opening', 'interestsPerOpening'],
    ['Registrations to your sessions', 'registrations'],
    ['Profiles you opened', 'views'],
  ];
  return (
    <Card title="How you compare" sub={`Against the average of ${b.all.companies} companies${b.sector?.companies ? ` and of ${b.sector.companies} in ${b.sector.name}` : ''}. Averages only: no other company is named.`}>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="text-left text-[12px] uppercase tracking-overline text-muted">
            <th className="pb-2 font-semibold" /><th className="pb-2 text-right font-semibold">You</th>
            <th className="pb-2 text-right font-semibold">Average</th>{b.sector?.companies ? <th className="pb-2 text-right font-semibold">{b.sector.name}</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, k]) => {
            const you = Number(b.me![k]);
            const avg = Number(b.all![k]);
            const ratio = avg ? you / avg : null;
            return (
              <tr key={k} className="border-t border-line-soft">
                <td className="py-2 pr-2 font-semibold">{label}</td>
                <td className="py-2 text-right">
                  <span className="mr-2 font-bold tabular-nums">{you}</span>
                  {ratio !== null && (
                    <span className={`rounded-full px-2 py-0.5 text-[12px] font-bold tabular-nums ${ratio >= 1.2 ? 'bg-green text-white' : ratio <= 0.8 ? 'bg-sand text-ink' : 'bg-offwhite text-muted'}`}>
                      {Math.abs(ratio - 1) < 0.05 ? '≈ average' : `${ratio > 1 ? '+' : '−'}${Math.round(Math.abs(ratio - 1) * 100)}%`}
                    </span>
                  )}
                </td>
                <td className="py-2 text-right tabular-nums text-muted">{avg}</td>
                {b.sector?.companies ? <td className="py-2 text-right tabular-nums text-muted">{Number(b.sector[k])}</td> : null}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="m-0 text-[13px] text-muted">
        +33% = a third more than the average company. Green: well above average; beige: well below. Below average? A full
        profile, a logo and openings with skills get more students.
      </p>
    </Card>
  );
}

/** 10 · Verified profiles matching your openings that you have not opened yet. */
function Matches({ cands, openings, hiringFor, seen }: {
  cands: Candidate[]; openings: { title: string; skills: string[] }[]; hiringFor: string[]; seen: Set<string>;
}) {
  const wants = [...openings.filter((o) => o.skills.length).map((o) => ({ title: o.title, skills: o.skills })),
    ...(hiringFor.length ? [{ title: 'Roles you hire for', skills: hiringFor }] : [])];
  const rows = cands.filter((c) => !seen.has(c.id)).map((c) => {
    const h = has(c);
    const best = wants.map((w) => ({ w, n: w.skills.filter((s) => h.has(s.toLowerCase())).length })).sort((a, b) => b.n / b.w.skills.length - a.n / a.w.skills.length)[0];
    return { c, best };
  }).filter((r) => r.best && r.best.n / r.best.w.skills.length >= 0.5).sort((a, b) => b.best!.n / b.best!.w.skills.length - a.best!.n / a.best!.w.skills.length);
  return (
    <Card title={`Matching profiles you have not opened · ${rows.length}`} sub="Verified students who have at least half the skills of one of your openings (or the roles you hire for).">
      {wants.length === 0 ? <p className="m-0 text-sm text-muted">Add skills to your openings, or the roles you hire for in your Profile, to get suggestions.</p>
        : rows.length === 0 ? <p className="m-0 text-sm text-muted">You have already opened every matching profile.</p> : (
          <ul className="m-0 grid list-none gap-2 p-0 md:grid-cols-2">
            {rows.slice(0, 8).map(({ c, best }) => (
              <li key={c.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-offwhite px-4 py-3 text-sm">
                <Link to={`/company/candidates/${c.id}`} className="font-semibold">{fullName(c)}</Link>
                <span className="text-muted">{shortSchool(c.school)} · {c.functions.slice(0, 2).join(', ')}</span>
                <span className="ml-auto rounded-full bg-green px-2 py-0.5 text-[12px] font-bold text-white">{best!.n}/{best!.w.skills.length}</span>
                <span className="w-full text-[12px] text-muted">for {best!.w.title}</span>
              </li>
            ))}
          </ul>
        )}
    </Card>
  );
}

/** 11 · Who is interested in you, in numbers. */
function WhoLikesYou({ people }: { people: Candidate[] }) {
  const tally = (vals: string[]) => {
    const m = new Map<string, number>();
    vals.forEach((v) => m.set(v, (m.get(v) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  };
  const groups: [string, [string, number][]][] = [
    ['Target roles', tally(people.flatMap((p) => p.functions))],
    ['Experience', tally(people.map((p) => expBucket(p.yearsExperience)))],
    ['Worked in', tally(people.flatMap((p) => parseCountries(p.workedCountries)))],
    ['Schools', tally(people.map((p) => shortSchool(p.school)))],
  ];
  return (
    <Card title={`Who is interested in you · ${people.length}`} sub="Verified students interested in your openings, in numbers. Check it is the public you want.">
      {people.length === 0 ? <p className="m-0 text-sm text-muted">No verified student has shown interest yet.</p> : groups.map(([label, rows]) => rows.length > 0 && (
        <div key={label} className="flex flex-col gap-1.5">
          <span className="text-[12px] font-semibold uppercase tracking-overline text-muted">{label}</span>
          <div className="flex flex-wrap gap-1.5">
            {rows.map(([v, n]) => <span key={v} className="rounded-full bg-offwhite px-2.5 py-1 text-[13px] font-semibold">{v} <span className="text-muted">· {n}</span></span>)}
          </div>
        </div>
      ))}
    </Card>
  );
}

/** 12 · How fast you answer interested students. */
function ResponseTime({ interest, requests, cands }: { interest: { candidateId: string; at: string }[]; requests: { candidateId: string; createdAt: string }[]; cands: Candidate[] }) {
  const first = new Map<string, string>();
  interest.forEach((i) => (!first.has(i.candidateId) || i.at < first.get(i.candidateId)!) && first.set(i.candidateId, i.at));
  const delays: number[] = [];
  const waiting: string[] = [];
  first.forEach((at, id) => {
    const r = requests.find((x) => x.candidateId === id);
    if (r) delays.push(Math.max(0, Date.parse(r.createdAt) - Date.parse(at)) / 3_600_000);
    else waiting.push(id);
  });
  delays.sort((a, b) => a - b);
  const median = delays.length ? delays[Math.floor(delays.length / 2)] : null;
  const fmt = (h: number) => (h < 24 ? `${Math.round(h)} h` : `${Math.round(h / 24)} days`);
  return (
    <Card title="Your response time" sub="From a student’s interest to your interview request. The best profiles do not wait.">
      <div className="flex flex-wrap gap-6">
        <span className="flex flex-col"><span className="text-[13px] font-semibold text-muted">Median</span><span className="font-display text-[32px] leading-none">{median === null ? '—' : fmt(median)}</span></span>
        <span className="flex flex-col"><span className="text-[13px] font-semibold text-muted">Answered</span><span className="font-display text-[32px] leading-none">{delays.length}</span></span>
        <span className="flex flex-col"><span className="text-[13px] font-semibold text-muted">Still waiting</span><span className={`font-display text-[32px] leading-none ${waiting.length ? 'text-danger' : ''}`}>{waiting.length}</span></span>
      </div>
      {waiting.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {waiting.slice(0, 8).map((id) => {
            const c = cands.find((x) => x.id === id);
            return c ? <Link key={id} to={`/company/candidates/${id}`} className="rounded-full border border-line-strong px-2.5 py-1 text-[13px] font-semibold no-underline">{fullName(c)}</Link> : null;
          })}
        </div>
      )}
    </Card>
  );
}

function Card({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  return (
    <section className="card flex flex-col gap-4 p-6">
      <div className="flex flex-col gap-1">
        <h2 className="m-0 text-lg font-bold">{title}</h2>
        <p className="m-0 text-sm text-muted">{sub}</p>
      </div>
      {children}
    </section>
  );
}
