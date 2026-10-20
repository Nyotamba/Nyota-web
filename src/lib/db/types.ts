// Domain types. They mirror the tables in supabase/schema.sql (snake_case there).
export type PositionType = 'Full-time' | 'Internship' | 'Both';
export type Role = 'student' | 'company' | 'admin';

export interface CvFile {
  name: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface Consent {
  version: string;
  givenAt: string;
}

export interface Candidate {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  school: string;
  programme: string;
  graduationYear: number;
  linkedinUrl: string;
  functions: string[];
  sectors: string[];
  regions: string[];
  countries: string;
  languages: string[];
  positionType: PositionType;
  availableFrom: string; // YYYY-MM
  story: string;
  cv: CvFile | null;
  consent: Consent | null;
  verifiedAt: string | null;
  updatedAt: string;
}

export type CandidateProfileInput = Omit<Candidate, 'id' | 'email' | 'cv' | 'consent' | 'verifiedAt' | 'updatedAt'>;

export interface Company {
  id: string;
  name: string;
}

export type InvitationStatus = 'Invited' | 'Accepted';
export interface Invitation {
  id: string;
  email: string;
  companyId: string;
  status: InvitationStatus;
  createdAt: string;
}

export interface InterviewRequest {
  id: string;
  companyId: string;
  candidateId: string;
  createdAt: string;
}

export interface CvView {
  id: string;
  companyId: string;
  candidateId: string;
  viewedAt: string;
}

export type OAuthProvider = 'linkedin_oidc' | 'azure' | 'google'; // azure = Microsoft (work and personal accounts)

export interface Session {
  role: Role;
  email: string;
  candidateId?: string;
  companyId?: string;
}

export type SessionKind = 'Presentation' | 'Panel' | 'Workshop' | 'Networking';

/** A group session in the fair programme, as the caller sees it. */
export interface FairSession {
  id: string;
  companyId: string | null; // null = organised by the club
  companyName: string | null;
  title: string;
  kind: SessionKind;
  description: string;
  startsAt: string; // ISO
  durationMin: number;
  capacity: number | null;
  registered: number;
  isRegistered: boolean;
  isOrganiser: boolean;
}

export interface SessionInput {
  companyId: string | null;
  title: string;
  kind: SessionKind;
  description: string;
  startsAt: string; // ISO
  durationMin: number;
  capacity: number | null;
  meetingUrl: string;
}

/** A student registered for a session, as the organising company and admins see them. */
export interface Registrant {
  candidateId: string;
  name: string;
  school: string;
  programme: string;
  graduationYear: number | null;
  linkedinUrl: string | null;
  visible: boolean; // shared a verified profile: the full profile can be opened
  registeredAt: string;
  joinedAt: string | null; // clicked "Join"
}

export interface InterviewSlot {
  id: string;
  companyId: string;
  startsAt: string;
  durationMin: number;
  meetingUrl: string;
  candidateId: string | null;
  bookedAt: string | null;
}

export interface StudentInterview {
  companyId: string;
  companyName: string;
  requestedAt: string;
  booked: { slotId: string; startsAt: string; durationMin: number; meetingUrl: string } | null;
  freeSlots: { id: string; startsAt: string; durationMin: number }[];
}

export interface AdminEntry {
  email: string;
  signedIn: boolean; // has signed in at least once
}

export interface CompanyActivity {
  name: string;
  invited: number;
  accepted: number;
  cvViews: number;
  shortlisted: number;
  interviewRequests: number;
}

export interface Dashboard {
  students: { signedUp: number; complete: number; consented: number; readyForReview: number; waiting: number; visible: number };
  oldestWaitingDays: number | null;
  companies: { total: number; invited: number; accepted: number };
  activity: { cvViews: number; shortlisted: number; interviewRequests: number; consentsWithdrawn: number };
  perCompany: CompanyActivity[];
}

export interface CandidateFilters {
  search: string;
  functions: string[];
  regions: string[];
  sector: string; // '' = any
  language: string; // '' = any
  positionType: 'Internship' | 'Full-time' | 'Any';
  availableBy: string; // YYYY-MM or ''
  sort: 'updated' | 'graduation' | 'availability';
}

/**
 * Everything the UI needs from the database. The demo adapter implements it with
 * browser storage; a Supabase adapter implementing the same interface replaces it
 * without touching any page.
 */
export interface NyotaDb {
  /** 'demo' = browser-stored sample data; 'live' = the real database. */
  mode: 'demo' | 'live';
  subscribe(listener: () => void): () => void;

  getSession(): Promise<Session | null>;
  /** Live only: e-mails a one-time sign-in link. */
  sendMagicLink(email: string): Promise<void>;
  /** Live only: providers switched on in Supabase (the sign-in page shows only these). */
  enabledProviders(): Promise<OAuthProvider[]>;
  /** Live only: leaves for Google / Microsoft and comes back signed in. */
  signInWithProvider(provider: OAuthProvider): Promise<void>;
  /** True once, right after the visitor came back from a sign-in link. */
  consumeSignInRedirect(): boolean;
  /** Why the last sign-in link failed (expired, already used…), once; null otherwise. */
  takeLinkError(): string | null;
  signInDemo(role: Role): Promise<Session>;
  signOut(): Promise<void>;
  resetDemo(): Promise<void>;

  getCandidate(id: string): Promise<Candidate | null>;
  saveProfile(candidateId: string, input: CandidateProfileInput): Promise<Candidate>;
  setCv(candidateId: string, file: File | null): Promise<void>;
  /** Short-lived link to the CV PDF (null in demo mode, or when the file is unavailable). */
  getCvUrl(candidateId: string): Promise<string | null>;
  giveConsent(candidateId: string): Promise<void>;
  withdrawConsent(candidateId: string): Promise<void>;

  listVisibleCandidates(): Promise<Candidate[]>;
  listShortlist(companyId: string): Promise<string[]>;
  toggleShortlist(companyId: string, candidateId: string): Promise<boolean>;
  requestInterview(companyId: string, candidateId: string): Promise<InterviewRequest>;
  listInterviewRequests(companyId: string): Promise<InterviewRequest[]>;
  logCvView(companyId: string, candidateId: string): Promise<void>;

  listVerificationQueue(): Promise<Candidate[]>;
  verifyCandidates(ids: string[]): Promise<void>;
  listCompanies(): Promise<Company[]>;
  // Sessions (group events)
  listSessions(): Promise<FairSession[]>;
  /** Video link: organisers always; registered students from 15 min before to 30 min after. */
  getSessionLink(sessionId: string): Promise<string | null>;
  saveSession(sessionId: string | null, input: SessionInput): Promise<void>;
  deleteSession(sessionId: string): Promise<void>;
  registerSession(sessionId: string): Promise<void>;
  unregisterSession(sessionId: string): Promise<void>;
  /** Records that a registered student clicked "Join". */
  markSessionJoined(sessionId: string): Promise<void>;
  listRegistrants(sessionId: string): Promise<Registrant[]>;

  // Interview slots (1:1)
  listSlots(companyId: string): Promise<InterviewSlot[]>;
  addSlot(companyId: string, slot: { startsAt: string; durationMin: number; meetingUrl: string }): Promise<void>;
  deleteSlot(slotId: string): Promise<void>;
  listStudentInterviews(): Promise<StudentInterview[]>;
  bookSlot(slotId: string): Promise<void>;
  cancelBooking(slotId: string): Promise<void>;

  listAdmins(): Promise<AdminEntry[]>;
  addAdmin(email: string): Promise<void>;
  removeAdmin(email: string): Promise<void>;
  getDashboard(): Promise<Dashboard>;
  getCompany(id: string): Promise<Company | null>;
  listInvitations(): Promise<Invitation[]>;
  /** Records the invitation and, on the live site, e-mails the person a sign-in link. */
  inviteCompanyMember(input: { companyId?: string; newCompanyName?: string; email: string }): Promise<Invitation & { emailSent: boolean }>;
}
