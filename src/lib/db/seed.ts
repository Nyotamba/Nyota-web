// Fictional demo data — mirrors supabase/seed.sql. Never ship it to production.
import type { Candidate, Company, Invitation, InterviewRequest, CvView } from './types';

export interface DemoState {
  admins: string[];
  candidates: Candidate[];
  companies: Company[];
  invitations: Invitation[];
  shortlists: { companyId: string; candidateId: string }[];
  interviewRequests: InterviewRequest[];
  cvViews: CvView[];
}

const cv = (sizeKb: number, uploadedAt: string) => ({ name: 'cv.pdf', sizeBytes: sizeKb * 1024, uploadedAt });
const consent = (givenAt: string) => ({ version: 'v1', givenAt });

type Seed = Omit<Candidate, 'programme' | 'linkedinUrl'> & Partial<Pick<Candidate, 'programme' | 'linkedinUrl'>>;
const c = (s: Seed): Candidate => ({ programme: 'Full-time MBA', linkedinUrl: '', ...s });

export function createSeed(): DemoState {
  return {
    admins: ['admin@nyota.example'],
    candidates: [
      c({
        id: 'c1', email: 'amara.diallo@iese.net', firstName: 'Amara', lastName: 'Diallo', school: 'IESE Business School',
        graduationYear: 2027, linkedinUrl: 'https://www.linkedin.com/in/amara-diallo',
        functions: ['Strategy', 'Business development'], sectors: ['Energy', 'Infrastructure'], regions: ['West', 'Central'],
        countries: 'Senegal, Côte d’Ivoire, Cameroon', languages: ['English', 'French'], positionType: 'Full-time', availableFrom: '2027-07',
        story: 'Six years building energy infrastructure projects between Dakar and Paris. At IESE to move from delivering projects to deciding which ones get built.',
        cv: cv(204, '2026-09-28T10:00:00Z'), consent: consent('2026-09-29T09:12:00Z'), verifiedAt: null, updatedAt: '2026-09-29T09:12:00Z',
      }),
      c({
        id: 'c2', email: 'k.mensah@insead.example', firstName: 'Kwame', lastName: 'Mensah', school: 'INSEAD', graduationYear: 2027,
        functions: ['Finance', 'Investment'], sectors: ['Financial services'], regions: ['West', 'East'], countries: 'Ghana, Kenya',
        languages: ['English'], positionType: 'Full-time', availableFrom: '2027-01',
        story: 'Former investment banker in Accra. Looking to join a growth-stage investor focused on West and East Africa.',
        cv: cv(176, '2026-09-20T10:00:00Z'), consent: consent('2026-09-20T10:00:00Z'), verifiedAt: '2026-09-22T10:00:00Z', updatedAt: '2026-10-02T08:00:00Z',
      }),
      c({
        id: 'c3', email: 'l.benali@hec.example', firstName: 'Leila', lastName: 'Benali', school: 'HEC Paris', graduationYear: 2027,
        functions: ['Strategy', 'Operations'], sectors: ['Consumer goods'], regions: ['West'], countries: 'Senegal, Morocco',
        languages: ['French', 'Arabic', 'English'], positionType: 'Both', availableFrom: '2027-06',
        story: 'Supply-chain lead for a consumer brand across francophone West Africa. Interested in operations roles with P&L ownership.',
        cv: cv(198, '2026-09-18T10:00:00Z'), consent: consent('2026-09-18T10:00:00Z'), verifiedAt: '2026-09-21T10:00:00Z', updatedAt: '2026-10-01T08:00:00Z',
      }),
      c({
        id: 'c4', email: 't.moyo@lbs.example', firstName: 'Tendai', lastName: 'Moyo', school: 'London Business School', graduationYear: 2027,
        functions: ['Finance', 'Product'], sectors: ['Financial services'], regions: ['East', 'Southern'], countries: 'Zimbabwe, South Africa, Kenya',
        languages: ['English', 'French'], positionType: 'Full-time', availableFrom: '2027-08',
        story: 'Product manager at a mobile-money start-up in Harare. Wants to build payment products for the next 100 million users.',
        cv: cv(221, '2026-09-15T10:00:00Z'), consent: consent('2026-09-15T10:00:00Z'), verifiedAt: '2026-09-19T10:00:00Z', updatedAt: '2026-09-30T08:00:00Z',
      }),
      c({
        id: 'c5', email: 's.okafor@esade.example', firstName: 'Sofia', lastName: 'Okafor', school: 'ESADE', graduationYear: 2027,
        functions: ['Strategy', 'Marketing'], sectors: ['Healthcare'], regions: ['West'], countries: 'Nigeria, Ghana',
        languages: ['English', 'French', 'Spanish'], positionType: 'Full-time', availableFrom: '2027-09',
        story: 'Marketing manager in pharmaceuticals in Lagos and Madrid. Focused on access to healthcare in West Africa.',
        cv: cv(189, '2026-09-12T10:00:00Z'), consent: consent('2026-09-12T10:00:00Z'), verifiedAt: '2026-09-16T10:00:00Z', updatedAt: '2026-09-28T08:00:00Z',
      }),
      c({
        id: 'c6', email: 'y.tesfaye@ie.example', firstName: 'Yohannes', lastName: 'Tesfaye', school: 'IE Business School', graduationYear: 2027,
        functions: ['Strategy', 'Consulting'], sectors: ['Agriculture'], regions: ['East'], countries: 'Ethiopia, Kenya, Tanzania',
        languages: ['English', 'French'], positionType: 'Both', availableFrom: '2027-07',
        story: 'Consultant on agricultural value chains in the Horn of Africa. Looking for strategy roles in agribusiness.',
        cv: cv(207, '2026-09-10T10:00:00Z'), consent: consent('2026-09-10T10:00:00Z'), verifiedAt: '2026-09-14T10:00:00Z', updatedAt: '2026-09-27T08:00:00Z',
      }),
      // Verification queue: consent given, not yet verified.
      c({
        id: 'c7', email: 'n.kamara@hec.edu', firstName: 'Nadia', lastName: 'Kamara', school: 'HEC Paris', graduationYear: 2027,
        functions: ['Finance'], sectors: ['Financial services'], regions: ['West'], countries: 'Sierra Leone, Guinea',
        languages: ['English', 'French'], positionType: 'Internship', availableFrom: '2027-06', story: '',
        cv: cv(212, '2026-09-27T10:00:00Z'), consent: consent('2026-09-27T10:00:00Z'), verifiedAt: null, updatedAt: '2026-09-27T10:00:00Z',
      }),
      c({
        id: 'c8', email: 'isow@london.edu', firstName: 'Ibrahim', lastName: 'Sow', school: 'London Business School', graduationYear: 2027,
        functions: ['Strategy'], sectors: ['Energy'], regions: ['West', 'North'], countries: 'Mali, Morocco',
        languages: ['French', 'English', 'Arabic'], positionType: 'Full-time', availableFrom: '2027-07', story: '',
        cv: cv(188, '2026-09-27T10:00:00Z'), consent: consent('2026-09-27T10:00:00Z'), verifiedAt: null, updatedAt: '2026-09-27T09:00:00Z',
      }),
      c({
        id: 'c9', email: 'g.achieng@insead.edu', firstName: 'Grace', lastName: 'Achieng', school: 'INSEAD', graduationYear: 2026,
        functions: ['Operations'], sectors: ['Agriculture'], regions: ['East'], countries: 'Kenya, Uganda',
        languages: ['English', 'Swahili'], positionType: 'Full-time', availableFrom: '2027-01', story: '',
        cv: null, consent: consent('2026-09-26T10:00:00Z'), verifiedAt: null, updatedAt: '2026-09-26T10:00:00Z',
      }),
      c({
        id: 'c10', email: 'mtraore@iese.net', firstName: 'Moussa', lastName: 'Traoré', school: 'IESE Business School', graduationYear: 2027,
        functions: ['Business development'], sectors: ['Infrastructure'], regions: ['West'], countries: 'Burkina Faso, Côte d’Ivoire',
        languages: ['French', 'English'], positionType: 'Full-time', availableFrom: '2027-07', story: '',
        cv: cv(240, '2026-09-25T10:00:00Z'), consent: consent('2026-09-25T10:00:00Z'), verifiedAt: null, updatedAt: '2026-09-25T10:00:00Z',
      }),
      c({
        id: 'c11', email: 'c.mbeki@esade.edu', firstName: 'Chiara', lastName: 'Mbeki', school: 'ESADE', graduationYear: 2027,
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
