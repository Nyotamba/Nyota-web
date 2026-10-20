import type { Candidate, CandidateFilters } from './db/types';
import { SCHOOL_SHORT } from '../config/constants';

export const fullName = (c: Pick<Candidate, 'firstName' | 'lastName'>) => `${c.firstName} ${c.lastName}`.trim();
export const initials = (c: Pick<Candidate, 'firstName' | 'lastName'>) =>
  `${c.firstName.charAt(0)}${c.lastName.charAt(0)}`.toUpperCase();
export const shortSchool = (school: string) => SCHOOL_SHORT[school] ?? school;

export const isProfileComplete = (c: Candidate) =>
  Boolean(
    c.firstName && c.lastName && c.school && c.graduationYear && c.functions.length && c.sectors.length &&
      c.languages.length && c.availableFrom && c.cv,
  );
export const isVisible = (c: Candidate) => Boolean(c.consent && c.verifiedAt && c.cv);

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export function formatMonth(ym: string, short = false) {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return '—';
  const name = MONTHS[m - 1];
  return `${short ? name.slice(0, 3) : name} ${y}`;
}
export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }) {
  return new Date(iso).toLocaleDateString('en-GB', opts);
}
/** "6 years · Project manager at Energy developer" — or '' when nothing was filled in. */
export function experienceLine(c: Pick<Candidate, 'yearsExperience' | 'jobTitle' | 'employer'>) {
  const years = c.yearsExperience === null ? '' : `${c.yearsExperience >= 20 ? '20+' : c.yearsExperience} year${c.yearsExperience === 1 ? '' : 's'}`;
  const role = [c.jobTitle, c.employer].filter(Boolean).join(' at ');
  return [years, role].filter(Boolean).join(' · ');
}
export const formatKb = (bytes: number) => `${Math.round(bytes / 1024)} KB`;

export const emptyFilters: CandidateFilters = {
  search: '',
  functions: [],
  regions: [],
  sector: '',
  language: '',
  positionType: 'Any',
  availableBy: '',
  minYears: 0,
  sort: 'updated',
};

export function applyFilters(list: Candidate[], f: CandidateFilters) {
  const q = f.search.trim().toLowerCase();
  const out = list.filter((c) => {
    if (q) {
      const hay = [fullName(c), c.school, c.story, c.countries, c.workedCountries, c.jobTitle, c.employer, ...c.functions, ...c.sectors, ...c.pastSectors]
        .join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (f.functions.length && !f.functions.some((x) => c.functions.includes(x))) return false;
    if (f.regions.length && !f.regions.some((x) => c.regions.includes(x))) return false;
    if (f.sector && !c.sectors.includes(f.sector)) return false;
    if (f.language && !c.languages.includes(f.language)) return false;
    if (f.positionType !== 'Any' && c.positionType !== f.positionType && c.positionType !== 'Both') return false;
    if (f.availableBy && c.availableFrom > f.availableBy) return false;
    if (f.minYears && (c.yearsExperience ?? 0) < f.minYears) return false;
    return true;
  });
  const by = {
    updated: (a: Candidate, b: Candidate) => (b.updatedAt > a.updatedAt ? 1 : -1),
    graduation: (a: Candidate, b: Candidate) => a.graduationYear - b.graduationYear,
    availability: (a: Candidate, b: Candidate) => (a.availableFrom > b.availableFrom ? 1 : -1),
  }[f.sort];
  return out.sort(by);
}
