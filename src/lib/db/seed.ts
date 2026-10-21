// Fictional demo data — mirrors supabase/seed.sql. Never ship it to production.
import type { Candidate, Company, Invitation, InterviewRequest, CvView, InterviewSlot, OpeningInput, SessionInput } from './types';

export interface DemoSession extends SessionInput {
  id: string;
  attendanceCode?: string;
}

export interface DemoState {
  admins: string[];
  schools?: string[];
  owners?: string[];
  settings?: Record<string, string>;
  options?: Partial<Record<'function' | 'sector' | 'language', string[]>>;
  schoolLogos?: Record<string, { logoUrl: string | null; showOnSite: boolean }>;
  sessions?: DemoSession[];
  registrations?: { sessionId: string; candidateId: string; createdAt?: string; joinedAt?: string | null; attendedAt?: string | null; attempts?: number; lastSeenAt?: string | null; leftAt?: string | null; seconds?: number }[];
  slots?: InterviewSlot[];
  openings?: (OpeningInput & { id: string; companyId: string; createdAt: string })[];
  openingInterests?: { openingId: string; candidateId: string; createdAt: string }[];
  candidates: Candidate[];
  companies: Company[];
  invitations: Invitation[];
  shortlists: { companyId: string; candidateId: string }[];
  interviewRequests: InterviewRequest[];
  cvViews: CvView[];
}

const cv = (sizeKb: number, uploadedAt: string) => ({ name: 'cv.pdf', sizeBytes: sizeKb * 1024, uploadedAt });
const consent = (givenAt: string) => ({ version: 'v1', givenAt });

type Background = 'jobTitle' | 'employer' | 'yearsExperience' | 'pastSectors' | 'workedCountries' | 'gender';
type Seed = Omit<Candidate, 'programme' | 'linkedinUrl' | Background> & Partial<Pick<Candidate, 'programme' | 'linkedinUrl' | Background>>;
const c = (s: Seed): Candidate => ({
  programme: 'Full-time MBA', linkedinUrl: '', jobTitle: '', employer: '', yearsExperience: null, pastSectors: [], workedCountries: '', gender: null, ...s,
});

export function createSeed(): DemoState {
  return {
    admins: ['admin@nyota.example'],
    // Fair: 16–19 February 2027 (CET = UTC+1). Times below are UTC.
    sessions: [
      { id: 's1', companyId: null, title: 'Opening of the Nyota Africa Career Fair', kind: 'Panel', description: 'Welcome from the IESE Africa Business Club and how the fair works: sessions, shortlists and interviews.', startsAt: '2027-02-16T17:00:00Z', durationMin: 45, capacity: null, meetingUrl: 'https://example.com/demo-opening' },
      { id: 's2', companyId: 'co1', title: 'Investing in West African fintech', kind: 'Presentation', description: 'Kora Capital (demo) presents its portfolio and the roles it is hiring for.', startsAt: '2027-02-17T12:00:00Z', durationMin: 45, capacity: 80, meetingUrl: 'https://example.com/demo-kora' },
      { id: 's3', companyId: 'co2', title: 'Building the Sahel grid: a project finance workshop', kind: 'Workshop', description: 'A hands-on case with the Sahel Grid Energy (demo) team. Limited seats.', startsAt: '2027-02-18T15:00:00Z', durationMin: 60, capacity: 25, meetingUrl: 'https://example.com/demo-sahel' },
      { id: 's4', companyId: 'co2', title: 'Careers in African energy', kind: 'Presentation', description: 'Sahel Grid Energy (demo) on its MBA programme and open roles.', startsAt: '2027-02-17T09:00:00Z', durationMin: 45, capacity: null, meetingUrl: 'https://example.com/demo-sahel-careers' },
      { id: 's5', companyId: null, title: 'Panel: going back to Africa after the MBA', kind: 'Panel', description: 'Alumni share how they chose their country, sector and first role.', startsAt: '2027-02-17T15:30:00Z', durationMin: 60, capacity: null, meetingUrl: 'https://example.com/demo-panel' },
      { id: 's6', companyId: 'co1', title: 'Case workshop: a fintech due diligence', kind: 'Workshop', description: 'Work on a real deal with the Kora Capital (demo) team.', startsAt: '2027-02-17T16:00:00Z', durationMin: 45, capacity: 30, meetingUrl: 'https://example.com/demo-kora-case' },
    ],
    registrations: [
      { sessionId: 's1', candidateId: 'c1' }, { sessionId: 's2', candidateId: 'c3' }, { sessionId: 's2', candidateId: 'c1' },
      { sessionId: 's4', candidateId: 'c1' }, { sessionId: 's5', candidateId: 'c1' }, { sessionId: 's6', candidateId: 'c1' }, { sessionId: 's3', candidateId: 'c1' },
    ],
    slots: [
      { id: 'sl1', companyId: 'co1', startsAt: '2027-02-17T14:00:00Z', durationMin: 30, meetingUrl: 'https://example.com/demo-kora-interviews', candidateId: null, bookedAt: null },
      { id: 'sl2', companyId: 'co1', startsAt: '2027-02-17T14:30:00Z', durationMin: 30, meetingUrl: 'https://example.com/demo-kora-interviews', candidateId: null, bookedAt: null },
    ],
    openings: [
      { id: 'op1', companyId: 'co1', title: 'Investment associate, West Africa', contract: 'Full-time', function: 'Finance', location: 'Dakar, Senegal · or Abidjan', description: 'Join the investment team covering fintech and payments in WAEMU countries: sourcing, due diligence and portfolio support. French and English required.', applyUrl: 'https://example.com/kora-associate', applyBy: '2027-03-15', published: true, createdAt: '2027-01-20T10:00:00Z' },
      { id: 'op2', companyId: 'co1', title: 'Summer associate, venture team', contract: 'Summer internship', function: 'Investment', location: 'Lagos, Nigeria', description: '10-week summer internship with the venture team, from June 2027. You will lead one investment memo end to end.', applyUrl: '', applyBy: '2027-02-28', published: true, createdAt: '2027-01-25T10:00:00Z' },
      { id: 'op3', companyId: 'co2', title: 'Strategy manager, grid projects', contract: 'Full-time', function: 'Strategy', location: 'Nairobi, Kenya', description: 'Shape the roll-out of mini-grids in East Africa: market entry, partnerships and project finance with the CFO.', applyUrl: 'https://example.com/sahel-strategy', applyBy: null, published: true, createdAt: '2027-01-28T10:00:00Z' },
    ] satisfies (OpeningInput & { id: string; companyId: string; createdAt: string })[],
    openingInterests: [
      { openingId: 'op1', candidateId: 'c2', createdAt: '2027-01-22T09:00:00Z' },
      { openingId: 'op1', candidateId: 'c3', createdAt: '2027-01-23T09:00:00Z' },
      { openingId: 'op2', candidateId: 'c4', createdAt: '2027-01-26T09:00:00Z' },
    ],
    candidates: [
      c({
        id: 'c1', gender: 'Woman', jobTitle: 'Project manager', employer: 'Energy developer (demo)', yearsExperience: 6, pastSectors: ['Energy', 'Infrastructure'], workedCountries: 'Senegal, France', email: 'amara.diallo@iese.net', firstName: 'Amara', lastName: 'Diallo', school: 'IESE Business School',
        graduationYear: 2027, linkedinUrl: 'https://www.linkedin.com/in/amara-diallo',
        functions: ['Strategy', 'Business development'], sectors: ['Energy', 'Infrastructure'], regions: ['West', 'Central'],
        countries: 'Senegal, Côte d’Ivoire, Cameroon', languages: ['English', 'French'], positionType: 'Full-time', availableFrom: '2027-07',
        story: 'Six years building energy infrastructure projects between Dakar and Paris. At IESE to move from delivering projects to deciding which ones get built.',
        cv: cv(204, '2026-09-28T10:00:00Z'), consent: consent('2026-09-29T09:12:00Z'), verifiedAt: null, updatedAt: '2026-09-29T09:12:00Z',
      }),
      c({
        id: 'c2', gender: 'Man', jobTitle: 'Investment banking associate', employer: 'Regional bank (demo)', yearsExperience: 5, pastSectors: ['Financial services'], workedCountries: 'Ghana, United Kingdom', email: 'k.mensah@insead.example', firstName: 'Kwame', lastName: 'Mensah', school: 'INSEAD', graduationYear: 2027,
        functions: ['Finance', 'Investment'], sectors: ['Financial services'], regions: ['West', 'East'], countries: 'Ghana, Kenya',
        languages: ['English'], positionType: 'Full-time', availableFrom: '2027-01',
        story: 'Former investment banker in Accra. Looking to join a growth-stage investor focused on West and East Africa.',
        cv: cv(176, '2026-09-20T10:00:00Z'), consent: consent('2026-09-20T10:00:00Z'), verifiedAt: '2026-09-22T10:00:00Z', updatedAt: '2026-10-02T08:00:00Z',
      }),
      c({
        id: 'c3', gender: 'Woman', jobTitle: 'Supply-chain lead', employer: 'Consumer brand (demo)', yearsExperience: 7, pastSectors: ['Consumer goods'], workedCountries: 'Senegal, Morocco, France', email: 'l.benali@hec.example', firstName: 'Leila', lastName: 'Benali', school: 'HEC Paris', graduationYear: 2027,
        functions: ['Strategy', 'Operations'], sectors: ['Consumer goods'], regions: ['West'], countries: 'Senegal, Morocco',
        languages: ['French', 'Arabic', 'English'], positionType: 'Both', availableFrom: '2027-06',
        story: 'Supply-chain lead for a consumer brand across francophone West Africa. Interested in operations roles with P&L ownership.',
        cv: cv(198, '2026-09-18T10:00:00Z'), consent: consent('2026-09-18T10:00:00Z'), verifiedAt: '2026-09-21T10:00:00Z', updatedAt: '2026-10-01T08:00:00Z',
      }),
      c({
        id: 'c4', gender: 'Man', jobTitle: 'Product manager', employer: 'Mobile-money start-up (demo)', yearsExperience: 4, pastSectors: ['Financial services'], workedCountries: 'Zimbabwe, South Africa', email: 't.moyo@lbs.example', firstName: 'Tendai', lastName: 'Moyo', school: 'London Business School', graduationYear: 2027,
        functions: ['Finance', 'Product'], sectors: ['Financial services'], regions: ['East', 'Southern'], countries: 'Zimbabwe, South Africa, Kenya',
        languages: ['English', 'French'], positionType: 'Full-time', availableFrom: '2027-08',
        story: 'Product manager at a mobile-money start-up in Harare. Wants to build payment products for the next 100 million users.',
        cv: cv(221, '2026-09-15T10:00:00Z'), consent: consent('2026-09-15T10:00:00Z'), verifiedAt: '2026-09-19T10:00:00Z', updatedAt: '2026-09-30T08:00:00Z',
      }),
      c({
        id: 'c5', gender: 'Woman', jobTitle: 'Marketing manager', employer: 'Pharmaceutical group (demo)', yearsExperience: 6, pastSectors: ['Healthcare'], workedCountries: 'Nigeria, Spain', email: 's.okafor@esade.example', firstName: 'Sofia', lastName: 'Okafor', school: 'ESADE', graduationYear: 2027,
        functions: ['Strategy', 'Marketing'], sectors: ['Healthcare'], regions: ['West'], countries: 'Nigeria, Ghana',
        languages: ['English', 'French', 'Spanish'], positionType: 'Full-time', availableFrom: '2027-09',
        story: 'Marketing manager in pharmaceuticals in Lagos and Madrid. Focused on access to healthcare in West Africa.',
        cv: cv(189, '2026-09-12T10:00:00Z'), consent: consent('2026-09-12T10:00:00Z'), verifiedAt: '2026-09-16T10:00:00Z', updatedAt: '2026-09-28T08:00:00Z',
      }),
      c({
        id: 'c6', gender: 'Man', jobTitle: 'Consultant', employer: 'Development consultancy (demo)', yearsExperience: 5, pastSectors: ['Agriculture'], workedCountries: 'Ethiopia, Kenya', email: 'y.tesfaye@ie.example', firstName: 'Yohannes', lastName: 'Tesfaye', school: 'IE Business School', graduationYear: 2027,
        functions: ['Strategy', 'Consulting'], sectors: ['Agriculture'], regions: ['East'], countries: 'Ethiopia, Kenya, Tanzania',
        languages: ['English', 'French'], positionType: 'Both', availableFrom: '2027-07',
        story: 'Consultant on agricultural value chains in the Horn of Africa. Looking for strategy roles in agribusiness.',
        cv: cv(207, '2026-09-10T10:00:00Z'), consent: consent('2026-09-10T10:00:00Z'), verifiedAt: '2026-09-14T10:00:00Z', updatedAt: '2026-09-27T08:00:00Z',
      }),
      // Verification queue: consent given, not yet verified.
      c({
        id: 'c7', gender: 'Woman', email: 'n.kamara@hec.edu', firstName: 'Nadia', lastName: 'Kamara', school: 'HEC Paris', graduationYear: 2027,
        functions: ['Finance'], sectors: ['Financial services'], regions: ['West'], countries: 'Sierra Leone, Guinea',
        languages: ['English', 'French'], positionType: 'Internship', availableFrom: '2027-06', story: '',
        cv: cv(212, '2026-09-27T10:00:00Z'), consent: consent('2026-09-27T10:00:00Z'), verifiedAt: null, updatedAt: '2026-09-27T10:00:00Z',
      }),
      c({
        id: 'c8', gender: 'Man', email: 'isow@london.edu', firstName: 'Ibrahim', lastName: 'Sow', school: 'London Business School', graduationYear: 2027,
        functions: ['Strategy'], sectors: ['Energy'], regions: ['West', 'North'], countries: 'Mali, Morocco',
        languages: ['French', 'English', 'Arabic'], positionType: 'Full-time', availableFrom: '2027-07', story: '',
        cv: cv(188, '2026-09-27T10:00:00Z'), consent: consent('2026-09-27T10:00:00Z'), verifiedAt: null, updatedAt: '2026-09-27T09:00:00Z',
      }),
      c({
        id: 'c9', gender: 'Woman', email: 'g.achieng@insead.edu', firstName: 'Grace', lastName: 'Achieng', school: 'INSEAD', graduationYear: 2026,
        functions: ['Operations'], sectors: ['Agriculture'], regions: ['East'], countries: 'Kenya, Uganda',
        languages: ['English', 'Swahili'], positionType: 'Full-time', availableFrom: '2027-01', story: '',
        cv: null, consent: consent('2026-09-26T10:00:00Z'), verifiedAt: null, updatedAt: '2026-09-26T10:00:00Z',
      }),
      c({
        id: 'c10', gender: 'Man', email: 'mtraore@iese.net', firstName: 'Moussa', lastName: 'Traoré', school: 'IESE Business School', graduationYear: 2027,
        functions: ['Business development'], sectors: ['Infrastructure'], regions: ['West'], countries: 'Burkina Faso, Côte d’Ivoire',
        languages: ['French', 'English'], positionType: 'Full-time', availableFrom: '2027-07', story: '',
        cv: cv(240, '2026-09-25T10:00:00Z'), consent: consent('2026-09-25T10:00:00Z'), verifiedAt: null, updatedAt: '2026-09-25T10:00:00Z',
      }),
      c({
        id: 'c11', gender: 'Prefer not to say', email: 'c.mbeki@esade.edu', firstName: 'Chiara', lastName: 'Mbeki', school: 'ESADE', graduationYear: 2027,
        functions: ['Marketing', 'Product'], sectors: ['Consumer goods'], regions: ['Southern'], countries: 'South Africa',
        languages: ['English', 'Spanish'], positionType: 'Both', availableFrom: '2027-09', story: '',
        cv: cv(196, '2026-09-24T10:00:00Z'), consent: consent('2026-09-24T10:00:00Z'), verifiedAt: null, updatedAt: '2026-09-24T10:00:00Z',
      }),
    ],
    companies: [
      { id: 'co1', name: 'Kora Capital (demo)' },
      { id: 'co2', name: 'Sahel Grid Energy (demo)' },
    ],
    invitations: [
      { id: 'i1', email: 'j.ndiaye@kora.example', companyId: 'co1', status: 'Accepted', createdAt: '2026-09-20T10:00:00Z' },
      { id: 'i2', email: 'm.otieno@kora.example', companyId: 'co1', status: 'Invited', createdAt: '2026-09-25T10:00:00Z' },
      { id: 'i3', email: 'hr@sahelgrid.example', companyId: 'co2', status: 'Invited', createdAt: '2026-09-26T10:00:00Z' },
    ],
    shortlists: [
      { companyId: 'co1', candidateId: 'c3' },
      { companyId: 'co1', candidateId: 'c5' },
    ],
    interviewRequests: [],
    cvViews: [],
  };
}

export const DEMO_ACCOUNTS = {
  student: { email: 'amara.diallo@iese.net', candidateId: 'c1' },
  company: { email: 'j.ndiaye@kora.example', companyId: 'co1' },
  admin: { email: 'admin@nyota.example' },
} as const;
