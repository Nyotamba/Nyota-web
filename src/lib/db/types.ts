// Domain types. They mirror the tables in supabase/schema.sql (snake_case there).
export type PositionType = 'Full-time' | 'Internship' | 'Both';
/** Optional; only admins see it, and only as counts. Companies never receive it. */
export type Gender = 'Woman' | 'Man' | 'Non-binary' | 'Prefer not to say';
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
  // Professional background (never nationality or origin)
  jobTitle: string; // current or most recent role
  employer: string;
  yearsExperience: number | null;
  pastSectors: string[];
  workedCountries: string;
  gender: Gender | null; // filled only for the student's own profile
  cv: CvFile | null;
  consent: Consent | null;
  verifiedAt: string | null;
  updatedAt: string;
}

export type CandidateProfileInput = Omit<Candidate, 'id' | 'email' | 'cv' | 'consent' | 'verifiedAt' | 'updatedAt'>;

export interface Company {
  id: string;
  name: string;
  logoUrl?: string | null;
  showOnSite?: boolean; // logo on the homepage (brand book K7: only once confirmed in writing)
  about?: string;
  website?: string;
  sector?: string;
  locations?: string;
  hiringFor?: string[];
  hiringCountries?: string;
  size?: string;
}

/** Something a company or a student did, logged for the admin Insights page (12 months, aggregates only). */
export type ActivityKind = 'profile_view' | 'filter_search' | 'company_click';
/** One anonymous signal: no names, only the candidate's background and the company's name and sector. */
export interface InsightSignal {
  direction: 'company_to_candidate' | 'candidate_to_company' | 'search';
  kind: 'profile_view' | 'cv_view' | 'shortlist' | 'interview_request' | 'company_click' | 'opening_interest' | 'session_register' | 'session_attend' | 'filter_search';
  at: string;
  companyName: string | null;
  companySector: string | null;
  companyHiringFor: string[];
  companyCountries: string; // countries the company hires for
  companySize: string | null;
  school: string | null;
  functions: string[];
  pastSectors: string[];
  sectors: string[];
  languages: string[];
  yearsExperience: number | null;
  workedCountries: string;
  targetCountries: string;
  detail: Record<string, unknown>;
}

/** After the fair: what came of it, ticked by the company. */
export type Outcome = 'offer' | 'hired';
/** Admin: attention a candidate received (counts only, never which company). */
export interface CandidateReach {
  candidateId: string; profileViews: number; cvViews: number; companies: number; shortlists: number; requests: number; interests: number;
  outcome: Outcome | null;
}
/** Admin: what a company did on Nyota. */
export interface CompanyEngagement {
  companyId: string; members: number; signedIn: number; profileViews: number; cvViews: number; shortlists: number; requests: number;
  openings: number; slots: number; sessions: number; interested: number; offers: number; hires: number; lastActivity: string | null;
}
type BenchFigures = { clicks: number; interestsPerOpening: number; registrations: number; views: number };
/** A company's figures next to the average company and its sector. */
export interface CompanyBenchmark {
  me: BenchFigures | null;
  all: (BenchFigures & { companies: number }) | null;
  sector: (BenchFigures & { companies: number; name: string | null }) | null;
}
/** A student's own reach (numbers only). */
export interface MyProfileStats { views30: number; views: number; cvViews: number; companies: number }

/** The company's presentation for students. */
export interface CompanyPage {
  about: string;
  website: string;
  sector: string;
  locations: string; // offices
  hiringFor: string[]; // roles they hire MBAs into
  hiringCountries: string;
  size: string;
}
/** The company's own figures (Company → Dashboard). */
export interface CompanyDashboard {
  visibleCandidates: number;
  shortlisted: number;
  cvViews: number;
  profilesOpened: number;
  interviewRequests: number;
  slots: number;
  slotsBooked: number;
  openings: number;
  interested: number;
  interestedPeople: number;
  sessions: number;
  registered: number;
  attended: number;
}
/** A company of the fair as students see it: presentation, sessions, interviews, openings. */
export interface FairCompany extends CompanyPage {
  id: string;
  name: string;
  logoUrl: string | null;
  sessions: { id: string; title: string; kind: string; startsAt: string; durationMin: number }[];
  interviewSlots: number; // upcoming slots
  freeSlots: number;
  interviewDays: { day: string; from: string; to: string }[]; // Barcelona day, first start, last end
  openings: number;
}

export interface SchoolEntry {
  name: string;
  logoUrl: string | null;
  showOnSite: boolean;
}

export interface Partner {
  name: string;
  logoUrl: string;
}

export type OptionKind = 'function' | 'sector' | 'language';

export type LogoTarget = { kind: 'company'; id: string } | { kind: 'school'; name: string };

export type InvitationStatus = 'Invited' | 'Accepted';
export interface Invitation {
  id: string;
  email: string;
  companyId: string;
  status: InvitationStatus;
  createdAt: string;
  /** Code to hand to the person: they create their account with it (live site). */
  accessCode?: string | null;
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
  /** Admins with extra powers (manage admins, delete data, edit site settings). */
  isOwner?: boolean;
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
  attended: number; // checked in with the attendance code (or marked present)
  isRegistered: boolean;
  hasAttended: boolean;
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
  attendedAt: string | null; // checked in with the attendance code, or marked present by the organiser
  leftAt: string | null; // closed the session room
  lastSeenAt: string | null; // last beat of the open session room
  secondsPresent: number; // time the Nyota session room stayed open during the session
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

export type Contract = 'Full-time' | 'Internship' | 'Summer internship' | 'Other';
export const CONTRACTS: Contract[] = ['Full-time', 'Internship', 'Summer internship', 'Other'];

export interface OpeningInput {
  title: string;
  contract: Contract;
  function: string;
  location: string;
  description: string;
  applyUrl: string;
  applyBy: string | null; // YYYY-MM-DD
  published: boolean;
  skills: string[]; // what the company wants to see: roles, sectors, languages or free text
}
export interface Opening extends OpeningInput {
  id: string;
  companyId: string;
  companyName: string;
  createdAt: string;
  interested: number | null; // only for the company that posted it (and admins)
  isInterested: boolean;
  isMine: boolean;
  myMatch: number | null; // for a student: how many of the skills are in their profile
}
export interface InterestedCandidate {
  candidateId: string;
  name: string;
  school: string;
  programme: string;
  graduationYear: number | null;
  interestedAt: string;
  matched: number;
  matchedSkills: string[]; // the wanted skills this student has
}

export interface StudentInterview {
  companyId: string;
  companyName: string;
  requestedAt: string;
  booked: { slotId: string; startsAt: string; durationMin: number; meetingUrl: string } | null;
  freeSlots: { id: string; startsAt: string; durationMin: number }[];
}

/** One anonymous row per student for the dashboard (no name, e-mail or CV). */
export interface TalentRow {
  school: string;
  programme: string;
  graduationYear: number | null;
  gender: Gender | 'Not answered';
  yearsExperience: number | null;
  pastSectors: string[];
  functions: string[];
  sectors: string[];
  countries: string;
  workedCountries: string;
  languages: string[];
  positionType: PositionType;
  complete: boolean;
  consented: boolean;
  visible: boolean;
}

/** Editable on the site by owners (Owner → Settings); constants.ts keeps the defaults. */
export interface SiteSettings {
  forum_name: string;
  forum_date: string;
  forum_venue: string;
  forum_year: string;
  club_email: string;
  retention_months: string;
  consent_version: string;
  consent_text: string;
  hero_title: string;
  hero_text: string;
}

export interface AdminEntry {
  isOwner?: boolean;
  email: string;
  signedIn: boolean; // has signed in at least once
  accessCode?: string | null;
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
  minYears: number; // 0 = any experience
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
  /** Live only: e-mail + password. */
  signInWithPassword(email: string, password: string): Promise<void>;
  /** Live only. Returns needsConfirmation when Supabase still requires an e-mail confirmation. */
  signUpWithPassword(email: string, password: string, accessCode?: string): Promise<{ needsConfirmation: boolean }>;
  /** Live only: e-mails a link that signs the person in and lets them choose a new password. */
  sendPasswordReset(email: string): Promise<void>;
  /** True once, right after the visitor came back from a password-reset link. */
  takePasswordReset(): boolean;
  /** Sets a new password for the signed-in account. */
  updatePassword(password: string): Promise<void>;
  /** Turns the signed-in account into a company or admin account. */
  redeemAccessCode(code: string): Promise<Role>;
  signOut(): Promise<void>;
  resetDemo(): Promise<void>;

  getCandidate(id: string): Promise<Candidate | null>;
  saveProfile(candidateId: string, input: CandidateProfileInput): Promise<Candidate>;
  setCv(candidateId: string, file: File | null): Promise<void>;
  /** Short-lived link to the CV PDF (null in demo mode, or when the file is unavailable). */
  getCvUrl(candidateId: string): Promise<string | null>;
  giveConsent(candidateId: string, version?: string): Promise<void>;
  withdrawConsent(candidateId: string): Promise<void>;

  listVisibleCandidates(): Promise<Candidate[]>;
  listShortlist(companyId: string): Promise<string[]>;
  toggleShortlist(companyId: string, candidateId: string): Promise<boolean>;
  requestInterview(companyId: string, candidateId: string): Promise<InterviewRequest>;
  listInterviewRequests(companyId: string): Promise<InterviewRequest[]>;
  logCvView(companyId: string, candidateId: string): Promise<void>;

  listVerificationQueue(): Promise<Candidate[]>;
  verifyCandidates(ids: string[]): Promise<void>;
  /** Business schools offered in the profile form (managed by admins). */
  listSchools(): Promise<string[]>;
  addSchool(name: string): Promise<void>;
  listSchoolEntries(): Promise<SchoolEntry[]>;
  /** Roles (functions), sectors and languages offered in profiles and filters (managed by admins). */
  listOptions(kind: OptionKind): Promise<string[]>;
  addOption(kind: OptionKind, name: string): Promise<void>;
  removeOption(kind: OptionKind, name: string): Promise<void>;
  /** Admin: every student, whatever their status. */
  listAllCandidates(): Promise<Candidate[]>;
  /** PNG, JPEG or WebP, 1 MB max. */
  uploadLogo(target: LogoTarget, file: File): Promise<void>;
  setShowOnSite(target: LogoTarget, show: boolean): Promise<void>;
  /** Logos chosen for the homepage (public). */
  getPartners(): Promise<{ companies: Partner[]; schools: Partner[] }>;
  removeSchool(name: string): Promise<void>;
  listCompanies(): Promise<Company[]>;
  addCompany(name: string): Promise<Company>;
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
  /** Session room: called about every minute while the room is open (arrival + time spent). */
  sessionHeartbeat(sessionId: string): Promise<void>;
  /** Session room: the student leaves (keepalive: also works while the tab is closing). */
  leaveSession(sessionId: string, opts?: { keepalive?: boolean }): Promise<void>;
  /** Organisers: the 4-digit code to show during the session. */
  getAttendanceCode(sessionId: string): Promise<string | null>;
  /** Students: check in with the code; returns attempts left when wrong. */
  checkIn(sessionId: string, code: string): Promise<{ present: true } | { present: false; attemptsLeft: number }>;
  /** Organisers: mark a registrant present or not by hand. */
  markAttended(sessionId: string, candidateId: string, present: boolean): Promise<void>;
  listRegistrants(sessionId: string): Promise<Registrant[]>;

  // Interview slots (1:1)
  listSlots(companyId: string): Promise<InterviewSlot[]>;
  addSlot(companyId: string, slot: { startsAt: string; durationMin: number; meetingUrl: string }): Promise<void>;
  deleteSlot(slotId: string): Promise<void>;
  listStudentInterviews(): Promise<StudentInterview[]>;
  // Openings (roles posted by companies)
  listOpenings(): Promise<Opening[]>;
  saveOpening(companyId: string, input: OpeningInput, id?: string): Promise<void>;
  deleteOpening(id: string): Promise<void>;
  setOpeningInterest(id: string, interested: boolean): Promise<void>;
  listOpeningInterest(id: string): Promise<InterestedCandidate[]>;
  bookSlot(slotId: string): Promise<void>;
  cancelBooking(slotId: string): Promise<void>;

  listAdmins(): Promise<AdminEntry[]>;
  /** Owners only. */
  setOwner(email: string, owner: boolean): Promise<void>;
  deleteCandidate(candidateId: string): Promise<void>;
  deleteCompany(companyId: string): Promise<void>;
  getSettings(): Promise<Partial<SiteSettings>>;
  saveSettings(values: Partial<SiteSettings>): Promise<void>;
  /** E-mails someone their access code (new admin or invited company member). */
  sendAccessCode(email: string, kind: 'admin' | 'company'): Promise<void>;
  addAdmin(email: string): Promise<void>;
  removeAdmin(email: string): Promise<void>;
  getDashboard(): Promise<Dashboard>;
  getTalentPool(): Promise<TalentRow[]>;
  getCompany(id: string): Promise<Company | null>;
  listFairCompanies(): Promise<FairCompany[]>;
  saveCompanyPage(companyId: string, page: CompanyPage): Promise<void>;
  getCompanyDashboard(companyId: string): Promise<CompanyDashboard>;
  getCompanyTalentPool(): Promise<TalentRow[]>; // verified + shared profiles only, no gender
  logEvent(kind: ActivityKind, target?: string | null, detail?: Record<string, unknown>): void; // fire and forget
  listOutcomes(companyId: string): Promise<Record<string, Outcome>>;
  setOutcome(companyId: string, candidateId: string, status: Outcome | null): Promise<void>;
  getCandidateReach(): Promise<CandidateReach[]>; // admins
  getCompanyActivity(): Promise<CompanyEngagement[]>; // admins
  getCompanyBenchmark(companyId: string): Promise<CompanyBenchmark>;
  listSeenCandidates(): Promise<string[]>; // profiles the signed-in company already opened
  getMyProfileStats(): Promise<MyProfileStats | null>; // the signed-in student
  getInsightSignals(): Promise<InsightSignal[]>; // admins only
  listInvitations(): Promise<Invitation[]>;
  /** Records the invitation and, on the live site, e-mails the person a sign-in link. */
  inviteCompanyMember(input: { companyId?: string; newCompanyName?: string; email: string }): Promise<Invitation & { emailSent: boolean }>;
}
