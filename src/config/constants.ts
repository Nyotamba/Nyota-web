// Values still to be confirmed by the club. Keep the brackets until the real value
// is decided — never invent a date, venue or legal text here.
// Source: IESE Africa Business Club brand book v1.0, section 11 (event playbook) and appendix A.
export const FORUM_NAME = 'Nyota Africa Career Fair';
export const FORUM_DATE = '16–19 February 2027';
export const FORUM_VENUE = 'Online';
export const FORUM_YEAR = '2027';
export const CLUB_NAME = 'IESE Africa Business Club'; // never "African Business Club" (rule N3)
export const CLUB_LINKEDIN = 'https://www.linkedin.com/company/iese-africa-business-club';
export const CLUB_INSTAGRAM = 'https://www.instagram.com/IESEAfricaBusinessClub';
export const NYOTA_LINKEDIN = 'https://www.linkedin.com/company/nyota-mba';
export const CLUB_EMAIL = 'contact@nyota.mba';
export const RETENTION_MONTHS = '[X]';
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
export const SCHOOLS = ['IESE Business School', 'INSEAD', 'HEC Paris', 'London Business School', 'ESADE', 'IE Business School'] as const;
export const POSITION_TYPES = ['Full-time', 'Internship', 'Both'] as const;

export const SCHOOL_SHORT: Record<string, string> = {
  'IESE Business School': 'IESE',
  'London Business School': 'LBS',
  'IE Business School': 'IE',
};
