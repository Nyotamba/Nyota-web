// Values still to be confirmed by the club. Keep the brackets until the real value
// is decided — never invent a date, venue or legal text here.
// Source: IESE Africa Business Club brand book v1.0, section 11 (event playbook) and appendix A.
export const FORUM_NAME = 'Nyota Africa Career Fair';
export const FORUM_DATE = 'February 2027';
export const FORUM_VENUE = 'Online';
export const FORUM_YEAR = '2027';
/** Who organises a session that no company runs. */
export const ORGANISER_NAME = 'Nyota';
export const NYOTA_LINKEDIN = 'https://www.linkedin.com/company/nyota-mba';
export const CLUB_EMAIL = 'contact@nyota.mba';
// 2027 calendar, shown on the homepage and the company registration form.
export const COMPANY_DEADLINE = 'the end of December';
export const PROFILES_OPEN = 'mid-January';
export const EDITION_2026: [string, string][] = [
  ['249', 'MBA professionals'], ['12', 'business schools'], ['16', 'employers'], ['921', 'session registrations'],
];
/**
 * Employers of the 2026 edition, shown on the homepage. Add one only once it has agreed to appear, with its official logo:
 * The World Bank Group, McKinsey Africa, BCG, Visa, African Development Bank Group, British International Investment,
 * AXIAN Group, CMA CGM, Sanofi, Mohinani Group, Big5 Search, Sucafina, Nepal Energies, Moneda Invest, JESA, 234 Finance.
 */
export const PAST_EMPLOYERS: { name: string; logoUrl: string | null }[] = [];
/** "IESE Business School and Esade Business School": the organising schools in a sentence. */
export function schoolList(names: string[]) {
  if (!names.length) return 'Europe’s leading business schools';
  return names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}
export const CONSENT_VERSION = 'v1';
export const CONSENT_TEXT = '[CONSENT TEXT v1 — to be pasted from the DPO-approved version.]';

export const CV_MAX_BYTES = 5 * 1024 * 1024;
export const CV_LINK_TTL_SECONDS = 300;
export const STORY_MAX_CHARS = 1000;
export const PAGE_SIZE = 6;

// Closed lists used by the profile form and the company filters.
export const FUNCTIONS = ['Strategy', 'Business development', 'Finance', 'Investment', 'Operations', 'Product', 'Marketing', 'Consulting'] as const;
export const SECTORS = ['Energy', 'Infrastructure', 'Financial services', 'Consumer goods', 'Healthcare', 'Agriculture'] as const;
export const REGIONS = ['North', 'West', 'Central', 'East', 'Southern'] as const;
export const LANGUAGES = ['English', 'French', 'Portuguese', 'Arabic', 'Spanish', 'Swahili'] as const;
// Students can also type a school that is not listed ("Other").
export const SCHOOLS = [
  'IESE Business School', 'INSEAD', 'HEC Paris', 'London Business School', 'Esade Business School', 'IE Business School',
  'Oxford Saïd Business School', 'Cambridge Judge Business School', 'SDA Bocconi', 'ESSEC Business School', 'ESCP Business School',
  'IMD Business School', 'Imperial College Business School', 'Rotterdam School of Management', 'University of St. Gallen', 'WHU – Otto Beisheim',
  'Mannheim Business School', 'Warwick Business School', 'Vlerick Business School', 'EDHEC Business School',
] as const;
/** Stored in "Target countries" when a student has no preference. */
export const ANY_COUNTRY = 'Open to any country';
export const BUILTIN_OPTIONS = {
  function: FUNCTIONS as readonly string[],
  sector: SECTORS as readonly string[],
  language: LANGUAGES as readonly string[],
};
export const EXPERIENCE_YEARS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20] as const;
export const POSITION_TYPES = ['Full-time', 'Internship', 'Both'] as const;

export const SCHOOL_SHORT: Record<string, string> = {
  'IESE Business School': 'IESE',
  'London Business School': 'LBS',
  'IE Business School': 'IE',
};
