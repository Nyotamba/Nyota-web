import { useMemo, useState } from 'react';
import type { TalentRow } from '../lib/db';
import { AFRICA_COUNTRIES } from './africaCountries';
import { WORLD_COUNTRIES } from './worldCountries';

// Sequential ramp for the map, one hue (brand greens) from light to dark. 0 = no student.
const RAMP = ['#DDE7DC', '#A9C8B3', '#6FA083', '#2F7350', '#053129'];
const EMPTY = '#F1ECDF';

/** "Senegal, Côte d'Ivoire and Kenya" → canonical country names matching the map. */
const ALIASES: Record<string, string> = {
  'ivory coast': 'Côte d’Ivoire', "cote d'ivoire": 'Côte d’Ivoire', 'cote divoire': 'Côte d’Ivoire',
  drc: 'DR Congo', 'dr congo': 'DR Congo', rdc: 'DR Congo', 'democratic republic of the congo': 'DR Congo', 'congo-kinshasa': 'DR Congo',
  'congo kinshasa': 'DR Congo', congo: 'Republic of the Congo', 'republic of congo': 'Republic of the Congo',
  'congo-brazzaville': 'Republic of the Congo', 'congo brazzaville': 'Republic of the Congo', swaziland: 'Eswatini',
  car: 'Central African Republic', 'the gambia': 'Gambia', 'south-africa': 'South Africa', rsa: 'South Africa',
  'cabo verde': 'Cape Verde', 'western sahara': 'Western Sahara',
  usa: 'United States', us: 'United States', 'united states of america': 'United States', america: 'United States',
  uk: 'United Kingdom', england: 'United Kingdom', 'great britain': 'United Kingdom', scotland: 'United Kingdom',
  guyane: 'French Guiana', 'guyane francaise': 'French Guiana', 'french guyana': 'French Guiana',
  holland: 'Netherlands', 'the netherlands': 'Netherlands', uae: 'United Arab Emirates', emirates: 'United Arab Emirates',
  espana: 'Spain', espagne: 'Spain', allemagne: 'Germany', belgique: 'Belgium', suisse: 'Switzerland', italie: 'Italy',
  'royaume-uni': 'United Kingdom', 'etats-unis': 'United States', bresil: 'Brazil', maroc: 'Morocco', algerie: 'Algeria',
  tunisie: 'Tunisia', egypte: 'Egypt', 'afrique du sud': 'South Africa', cameroun: 'Cameroon', senegal: 'Senegal',
  'cote divoire ': 'Côte d’Ivoire',
};
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’`]/g, "'").toLowerCase().trim();
const MAP_NAMES = new Map([...WORLD_COUNTRIES, ...AFRICA_COUNTRIES].map((c) => [fold(c.name), c.name]));
export function parseCountries(text: string) {
  return text
    .split(/,|;|\/|\band\b|&/i)
    .map((s) => s.trim())
    .filter((s) => s && !/^open to any country$/i.test(s))
    .map((s) => ALIASES[fold(s)] ?? MAP_NAMES.get(fold(s)) ?? s.replace(/\b\w/g, (m) => m.toUpperCase()));
}

type Count = [string, number];
function tally(values: string[]): Count[] {
  const m = new Map<string, number>();
  values.forEach((v) => m.set(v, (m.get(v) ?? 0) + 1));
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}
const expBucket = (y: number | null) => (y === null ? 'Not answered' : y <= 2 ? '0–2 years' : y <= 5 ? '3–5 years' : y <= 9 ? '6–9 years' : '10+ years');
const EXP_ORDER = ['0–2 years', '3–5 years', '6–9 years', '10+ years', 'Not answered'];

export function TalentPool({ rows }: { rows: TalentRow[] }) {
  const [school, setSchool] = useState('');
  const [year, setYear] = useState('');
  const [gender, setGender] = useState('');
  const [onlyVisible, setOnlyVisible] = useState(false);

  const schools = useMemo(() => tally(rows.map((r) => r.school || 'Not answered')).map(([s]) => s), [rows]);
  const years = useMemo(() => [...new Set(rows.map((r) => r.graduationYear).filter(Boolean))].sort() as number[], [rows]);
  const list = rows.filter(
    (r) =>
      (!school || (r.school || 'Not answered') === school) &&
      (!year || String(r.graduationYear) === year) &&
      (!gender || r.gender === gender) &&
      (!onlyVisible || r.visible),
  );
  const n = list.length;

  const byGender = tally(list.map((r) => r.gender));
  const byYear = tally(list.map((r) => (r.graduationYear ? `Class of ${r.graduationYear}` : 'Not answered'))).sort((a, b) => a[0].localeCompare(b[0]));
  const bySchool = tally(list.map((r) => r.school || 'Not answered'));
  const byProgramme = tally(list.map((r) => r.programme || 'Not answered'));
  const byExp = tally(list.map((r) => expBucket(r.yearsExperience))).sort((a, b) => EXP_ORDER.indexOf(a[0]) - EXP_ORDER.indexOf(b[0]));
  const byType = tally(list.map((r) => r.positionType));
  const pastSectors = tally(list.flatMap((r) => r.pastSectors));
  const functions = tally(list.flatMap((r) => r.functions));
  const targetSectors = tally(list.flatMap((r) => r.sectors));
  const languages = tally(list.flatMap((r) => r.languages));
  const worked = tally(list.flatMap((r) => parseCountries(r.workedCountries)));
  const targeted = tally(list.flatMap((r) => parseCountries(r.countries)));
  const africaNames = new Set(AFRICA_COUNTRIES.map((c) => c.name));
  const africaXp = list.filter((r) => parseCountries(r.workedCountries).some((c) => africaNames.has(c))).length;
  const [mapView, setMapView] = useState<'worked' | 'targeted'>('worked');
  const [mapScope, setMapScope] = useState<'africa' | 'world'>('africa');
  const women = list.filter((r) => r.gender === 'Woman').length;
  const answered = list.filter((r) => r.gender !== 'Not answered' && r.gender !== 'Prefer not to say').length;

  return (
    <section aria-labelledby="pool-title" className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 id="pool-title" className="m-0 font-display text-[32px] tracking-display">Talent pool</h2>
        <p className="m-0 max-w-[75ch] text-sm text-muted">
          Who the students are: their professional background first, then what they look for. Anonymous counts; gender is optional
          and never shown to companies, and Nyota never asks for nationality or origin.
        </p>
      </div>

      {/* Filters: one row above the charts; every chart below follows them */}
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <Filter id="tp-school" label="School" value={school} onChange={setSchool} options={schools} all="All schools" />
        <Filter id="tp-year" label="Class" value={year} onChange={setYear} options={years.map(String)} all="All classes" />
        <Filter id="tp-gender" label="Gender" value={gender} onChange={setGender}
          options={['Woman', 'Man', 'Non-binary', 'Prefer not to say', 'Not answered']} all="All" />
        <div role="group" aria-label="Status" className="grid grid-cols-2 overflow-hidden rounded-field border border-line-strong">
          {[['All students', false], ['Visible to companies', true]].map(([label, v]) => (
            <button key={String(v)} type="button" aria-pressed={onlyVisible === v} onClick={() => setOnlyVisible(v as boolean)}
              className={`min-h-[44px] px-3 text-[13px] font-semibold ${onlyVisible === v ? 'bg-ink text-offwhite' : 'bg-surface text-ink hover:bg-offwhite'}`}>
              {label as string}
            </button>
          ))}
        </div>
        <span className="ml-auto text-sm font-semibold tabular-nums" aria-live="polite">{n} student{n === 1 ? '' : 's'}</span>
      </div>

      {n === 0 ? (
        <div className="card p-7 text-[15px] text-muted">No student matches these filters yet.</div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Headline label="Already worked in Africa" value={`${Math.round((africaXp / n) * 100)}%`}
              sub={`${africaXp} of ${n} students name an African country they worked in`} />
            <Headline label="Median experience" value={median(list.map((r) => r.yearsExperience))} sub="years of work before the MBA" />
            <Headline label="Most common past sector" value={pastSectors[0]?.[0] ?? '—'} small
              sub={pastSectors[0] ? `${pastSectors[0][1]} students have worked in it` : 'Not filled in yet'} />
            <Headline label="Women" value={answered ? `${Math.round((women / answered) * 100)}%` : '—'}
              sub={answered ? `of the ${answered} who answered the gender question` : 'Nobody answered the gender question yet'} />
          </div>

          <div className="grid items-start gap-4 xl:grid-cols-12">
            <div className="card flex flex-col gap-4 p-5 xl:col-span-7">
              <div className="flex flex-wrap items-start gap-3">
                <div className="flex flex-1 flex-col gap-1">
                  <h3 className="m-0 text-base font-bold">{mapView === 'worked' ? 'Where they have worked' : 'Where they want to work'}</h3>
                  <p className="m-0 text-[13px] text-muted">Hover a country for the number of students.</p>
                </div>
                <div role="group" aria-label="Map shows" className="grid grid-cols-2 overflow-hidden rounded-field border border-line-strong">
                  {([['worked', 'Worked in'], ['targeted', 'Want to work in']] as const).map(([v, label]) => (
                    <button key={v} type="button" aria-pressed={mapView === v} onClick={() => setMapView(v)}
                      className={`min-h-[44px] px-3 text-[13px] font-semibold ${mapView === v ? 'bg-ink text-offwhite' : 'bg-surface text-ink hover:bg-offwhite'}`}>{label}</button>
                  ))}
                </div>
              </div>
              <div role="group" aria-label="Map area" className="grid w-44 grid-cols-2 overflow-hidden rounded-field border border-line-strong">
                {([['africa', 'Africa'], ['world', 'World']] as const).map(([v, label]) => (
                  <button key={v} type="button" aria-pressed={mapScope === v} onClick={() => setMapScope(v)}
                    className={`min-h-[44px] text-[13px] font-semibold ${mapScope === v ? 'bg-ink text-offwhite' : 'bg-surface text-ink hover:bg-offwhite'}`}>{label}</button>
                ))}
              </div>
              <CountryMap counts={mapView === 'worked' ? worked : targeted} scope={mapScope} />
            </div>
            <div className="flex flex-col gap-4 xl:col-span-5">
              <Bars title="Work experience" data={byExp} n={n} />
              <Bars title="Sectors they worked in" data={pastSectors} n={n} multi />
            </div>
          </div>

          <h3 className="m-0 mt-2 text-lg font-bold">Background</h3>
          <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Bars title="Countries they worked in" data={worked} n={n} multi limit={10} />
            <Bars title="School" data={bySchool} n={n} />
            <Bars title="Programme" data={byProgramme} n={n} />
            <Bars title="Class" data={byYear} n={n} />
            <Bars title="Gender" data={byGender} n={n} />
            <Bars title="Languages" data={languages} n={n} multi />
          </div>

          <h3 className="m-0 mt-2 text-lg font-bold">What they are looking for</h3>
          <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Bars title="Target functions" data={functions} n={n} multi limit={5} />
            <Bars title="Target sectors" data={targetSectors} n={n} multi limit={5} />
            <Bars title="Position type" data={byType} n={n} />
          </div>
        </>
      )}
    </section>
  );
}

function median(values: (number | null)[]) {
  const v = values.filter((x): x is number => x !== null).sort((a, b) => a - b);
  if (!v.length) return '—';
  const m = v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2;
  return String(Math.round(m * 10) / 10);
}

function Filter({ id, label, value, onChange, options, all }: {
  id: string; label: string; value: string; onChange: (v: string) => void; options: string[]; all: string;
}) {
  return (
    <label className="label min-w-[160px] flex-1 sm:flex-none" htmlFor={id}>{label}
      <select id={id} className="field min-h-[44px] py-2 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{all}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

function Headline({ label, value, sub, small = false }: { label: string; value: string; sub: string; small?: boolean }) {
  return (
    <div className="card flex flex-col gap-1.5 p-5">
      <span className="text-[13px] font-semibold text-muted">{label}</span>
      <span className={`font-display leading-none tabular-nums ${small ? 'text-[28px]' : 'text-[40px]'}`}>{value}</span>
      <span className="text-[13px] text-muted">{sub}</span>
    </div>
  );
}

/** One series of horizontal bars; lengths are the share of the filtered students. */
function Bars({ title, data, n, multi = false, limit = 8 }: { title: string; data: Count[]; n: number; multi?: boolean; limit?: number }) {
  const shown = data.slice(0, limit);
  const rest = data.length - shown.length;
  return (
    <div className="card flex flex-col gap-3 p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="m-0 text-base font-bold">{title}</h3>
        {multi && <span className="text-[12px] text-muted">several per student</span>}
      </div>
      {shown.length === 0 ? (
        <p className="m-0 text-sm text-muted">Not filled in yet.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {shown.map(([label, count]) => {
            const share = Math.round((count / n) * 100);
            return (
              <li key={label} className="flex flex-col gap-1" title={`${label}: ${count} student${count === 1 ? '' : 's'} (${share}%)`}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">{label}</span>
                  <span className="shrink-0 tabular-nums text-muted"><strong className="text-ink">{count}</strong> · {share}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-offwhite">
                  <div className="h-full rounded-full bg-green" style={{ width: `${Math.min(100, (count / n) * 100)}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {rest > 0 && <p className="m-0 text-[12px] text-muted">+ {rest} more</p>}
    </div>
  );
}

function CountryMap({ counts, scope }: { counts: Count[]; scope: 'africa' | 'world' }) {
  const shapes = scope === 'africa' ? AFRICA_COUNTRIES : WORLD_COUNTRIES;
  const [vw, vh] = scope === 'africa' ? [400, 420] : [800, 460];
  const [hover, setHover] = useState<{ name: string; count: number; x: number; y: number } | null>(null);
  const byName = new Map(counts);
  const max = Math.max(1, ...shapes.map((c) => byName.get(c.name) ?? 0));
  const step = (v: number) => (v === 0 ? EMPTY : RAMP[Math.min(RAMP.length - 1, Math.floor(((v - 1) / max) * RAMP.length))]);
  const elsewhere = counts.filter(([name]) => !shapes.some((c) => c.name === name));
  const top = counts.filter(([name]) => shapes.some((c) => c.name === name)).slice(0, 6);

  return (
    <div className={`flex flex-col gap-4 ${scope === 'africa' ? 'lg:flex-row' : ''}`}>
      <div className={`relative mx-auto w-full ${scope === 'africa' ? 'max-w-[420px]' : ''}`} onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${vw} ${vh}`} className="h-auto w-full" role="img"
          aria-label={`Map of ${scope === 'africa' ? 'Africa' : 'the world centred on Africa'} shaded by the number of students per country`}>
          {shapes.map((c) => {
            const v = byName.get(c.name) ?? 0;
            return (
              <path key={c.name} d={c.d} fill={step(v)} stroke="#FFFFFF" strokeWidth={0.8} strokeLinejoin="round"
                onMouseMove={(e) => {
                  const box = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                  setHover({ name: c.name, count: v, x: e.clientX - box.left, y: e.clientY - box.top });
                }}>
                <title>{`${c.name}: ${v} student${v === 1 ? '' : 's'}`}</title>
              </path>
            );
          })}
        </svg>
        {hover && (
          <div className="pointer-events-none absolute z-10 rounded-lg bg-ink px-3 py-2 text-[13px] text-offwhite shadow-lg"
            style={{ left: Math.max(0, Math.min(hover.x + 12, (scope === 'africa' ? 300 : 620))), top: Math.max(hover.y - 40, 0) }}>
            <strong>{hover.name}</strong> · {hover.count} student{hover.count === 1 ? '' : 's'}
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        {/* Legend */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] font-semibold text-muted">Students</span>
          <div className="flex items-center gap-1 text-[12px] tabular-nums text-muted">
            <span className="mr-1 inline-block size-3 rounded-sm border border-line" style={{ background: EMPTY }} />0
            {RAMP.map((c) => <span key={c} className="inline-block h-3 w-6 rounded-sm" style={{ background: c }} />)}
            <span className="ml-1">{max}</span>
          </div>
        </div>
        {/* Table view of the same data */}
        <ol className="m-0 flex list-none flex-col gap-1.5 p-0 text-sm">
          {top.map(([name, v], i) => (
            <li key={name} className="flex justify-between gap-3 border-b border-line-soft pb-1.5 last:border-b-0">
              <span><span className="mr-2 tabular-nums text-muted">{i + 1}.</span>{name}</span>
              <strong className="tabular-nums">{v}</strong>
            </li>
          ))}
        </ol>
        {elsewhere.length > 0 && (
          <p className="m-0 text-[12px] leading-relaxed text-muted">
            Not on the map: {elsewhere.slice(0, 6).map(([nme, v]) => `${nme} (${v})`).join(', ')}{elsewhere.length > 6 ? '…' : ''}
          </p>
        )}
      </div>
    </div>
  );
}
