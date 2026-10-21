// Browser-storage implementation of NyotaDb, used until the real database is connected.
import type { Candidate, NyotaDb, Session } from './types';
import { createSeed, DEMO_ACCOUNTS, type DemoState } from './seed';
import { BUILTIN_OPTIONS, CONSENT_VERSION, SCHOOLS } from '../../config/constants';
import { isProfileComplete, isVisible } from '../candidate';
import { fairDayKey } from '../time';

const BASE_STATE_KEY = 'nyota-demo-state-v1';
const BASE_SESSION_KEY = 'nyota-demo-session-v1';

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: keep working in memory */
  }
}

const now = () => new Date().toISOString();
const uid = (prefix: string) => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

/** `space` keeps separate data (the admin preview uses its own, so it never touches a demo in progress). */
export function createDemoDb(space = ''): NyotaDb {
  const STATE_KEY = BASE_STATE_KEY + space;
  const SESSION_KEY = BASE_SESSION_KEY + space;
  let state: DemoState = read<DemoState>(STATE_KEY) ?? createSeed();
  // Demo data saved by an older version: add what it lacks.
  const seed = createSeed();
  state.admins ??= seed.admins;
  state.sessions ??= seed.sessions;
  state.registrations ??= seed.registrations;
  state.slots ??= seed.slots;
  state.openings ??= seed.openings;
  for (const co of state.companies) if (co.about === undefined) Object.assign(co, seed.companies.find((x) => x.id === co.id) ?? {}, { name: co.name });
  state.openingInterests ??= seed.openingInterests;
  for (const o of state.openings ?? []) o.skills ??= seed.openings?.find((x) => x.id === o.id)?.skills ?? [];
  state.schools ??= [...SCHOOLS];
  // Sessions added to the seed later (several on one day, one clash), with Amara's registrations.
  for (const s of seed.sessions!.filter((x) => ['s4', 's5', 's6'].includes(x.id))) {
    if (state.sessions!.some((x) => x.id === s.id)) continue;
    state.sessions!.push(s);
    state.registrations!.push(...seed.registrations!.filter((r) => r.sessionId === s.id));
  }
  // A session that is always live in the demo, so the waiting room can be tried at any time.
  const liveStart = new Date(Date.now() - 10 * 60_000).toISOString();
  const live = state.sessions!.find((s) => s.id === 'slive');
  if (live) live.startsAt = liveStart;
  else {
    state.sessions!.push({ id: 'slive', companyId: 'co1', title: 'Live now: try the session room', kind: 'Presentation',
      description: 'A demo session that is always live. Register, then click “Join now” to see the Nyota room that counts attendance.',
      startsAt: liveStart, durationMin: 45, capacity: null, meetingUrl: 'https://example.com/demo-live' });
  }
  let session: Session | null = read<Session>(SESSION_KEY);
  const listeners = new Set<() => void>();

  const commit = () => {
    write(STATE_KEY, state);
    write(SESSION_KEY, session);
    listeners.forEach((l) => l());
  };
  const skillMatch = (c: Candidate | null | undefined, wanted: string[]) => {
    if (!c) return 0;
    const have = new Set([...c.functions, ...c.sectors, ...c.pastSectors, ...c.languages].map((x) => x.toLowerCase()));
    return wanted.filter((w) => have.has(w.toLowerCase())).length;
  };
  const matchedSkills = (c: Candidate, wanted: string[]) => {
    const have = new Set([...c.functions, ...c.sectors, ...c.pastSectors, ...c.languages].map((x) => x.toLowerCase()));
    return wanted.filter((w) => have.has(w.toLowerCase()));
  };
  const findCandidate = (id: string) => {
    const cand = state.candidates.find((x) => x.id === id);
    if (!cand) throw new Error('Candidate not found');
    return cand;
  };
  // Same rule as the live database: time between beats of the open room counts; present after half the session.
  const countPresence = (sessionId: string, leaving: boolean) => {
    const r = (state.registrations ?? []).find((x) => x.sessionId === sessionId && x.candidateId === session?.candidateId);
    const s = (state.sessions ?? []).find((x) => x.id === sessionId);
    if (!r || !s) return;
    const start = Date.parse(s.startsAt) - 15 * 60_000;
    const end = Date.parse(s.startsAt) + (s.durationMin + 30) * 60_000;
    if (Date.now() < start) return;
    const t = Math.min(Date.now(), end);
    const counting = r.lastSeenAt && !(r.leftAt && r.leftAt >= r.lastSeenAt);
    if (counting) r.seconds = (r.seconds ?? 0) + Math.max(0, Math.round((t - Math.max(Date.parse(r.lastSeenAt!), start)) / 1000));
    const iso = new Date(t).toISOString();
    r.joinedAt ??= iso;
    r.lastSeenAt = iso;
    r.leftAt = leaving ? iso : null;
    if (!r.attendedAt && (r.seconds ?? 0) >= Math.max(60, s.durationMin * 30)) r.attendedAt = iso;
    commit();
  };

  return {
    mode: 'demo',
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    async getSession() {
      return session;
    },
    async sendMagicLink() {
      throw new Error('Sign-in links are not available in the demo.');
    },
    consumeSignInRedirect() {
      return false;
    },
    takeLinkError() {
      return null;
    },
    async enabledProviders() {
      return [];
    },
    async signInWithPassword() {
      throw new Error('Passwords are not available in the demo. Use a demo account.');
    },
    async signUpWithPassword() {
      throw new Error('Passwords are not available in the demo. Use a demo account.');
    },
    async sendPasswordReset() {
      throw new Error('Passwords are not available in the demo.');
    },
    takePasswordReset() {
      return false;
    },
    async updatePassword() {
      throw new Error('Passwords are not available in the demo.');
    },
    async redeemAccessCode() {
      throw new Error('Access codes are not available in the demo.');
    },
    async signInWithProvider() {
      throw new Error('Google and Microsoft sign-in are not available in the demo.');
    },
    async signInDemo(role) {
      session =
        role === 'student'
          ? { role, email: DEMO_ACCOUNTS.student.email, candidateId: DEMO_ACCOUNTS.student.candidateId }
          : role === 'company'
            ? { role, email: DEMO_ACCOUNTS.company.email, companyId: DEMO_ACCOUNTS.company.companyId }
            : { role, email: DEMO_ACCOUNTS.admin.email, isOwner: true };
      commit();
      return session;
    },
    async signOut() {
      session = null;
      commit();
    },
    async resetDemo() {
      state = createSeed();
      commit();
    },

    async getCandidate(id) {
      const cand = state.candidates.find((x) => x.id === id);
      return cand ? clone(cand) : null;
    },
    async saveProfile(candidateId, input) {
      const cand = findCandidate(candidateId);
      Object.assign(cand, input, { updatedAt: now() });
      commit();
      return clone(cand);
    },
    async setCv(candidateId, file) {
      const cand = findCandidate(candidateId);
      cand.cv = file ? { name: file.name, sizeBytes: file.size, uploadedAt: now() } : null;
      cand.updatedAt = now();
      commit();
    },
    async giveConsent(candidateId, version) {
      findCandidate(candidateId).consent = { version: version || CONSENT_VERSION, givenAt: now() };
      commit();
    },
    async withdrawConsent(candidateId) {
      const cand = findCandidate(candidateId);
      cand.consent = null;
      // Withdrawal hides the profile everywhere; it must be verified again after a new consent.
      cand.verifiedAt = null;
      state.shortlists = state.shortlists.filter((s) => s.candidateId !== candidateId);
      commit();
    },

    async getCvUrl() {
      return null; // demo CVs have no file: the viewer shows a placeholder page
    },
    async listVisibleCandidates() {
      return clone(state.candidates.filter(isVisible));
    },
    async listShortlist(companyId) {
      const visible = new Set(state.candidates.filter(isVisible).map((x) => x.id));
      return state.shortlists.filter((s) => s.companyId === companyId && visible.has(s.candidateId)).map((s) => s.candidateId);
    },
    async toggleShortlist(companyId, candidateId) {
      const i = state.shortlists.findIndex((s) => s.companyId === companyId && s.candidateId === candidateId);
      if (i >= 0) state.shortlists.splice(i, 1);
      else state.shortlists.push({ companyId, candidateId });
      commit();
      return i < 0;
    },
    async requestInterview(companyId, candidateId) {
      const req = { id: uid('r'), companyId, candidateId, createdAt: now() };
      state.interviewRequests.push(req);
      commit();
      return req;
    },
    async listInterviewRequests(companyId) {
      return clone(state.interviewRequests.filter((r) => r.companyId === companyId));
    },
    async logCvView(companyId, candidateId) {
      state.cvViews.push({ id: uid('v'), companyId, candidateId, viewedAt: now() });
      write(STATE_KEY, state);
    },

    async listVerificationQueue() {
      return clone(
        state.candidates
          .filter((x) => x.consent && !x.verifiedAt)
          .sort((a, b) => (b.consent!.givenAt > a.consent!.givenAt ? 1 : -1)),
      );
    },
    async verifyCandidates(ids) {
      const t = now();
      state.candidates.forEach((x: Candidate) => {
        if (ids.includes(x.id) && x.consent && x.cv) x.verifiedAt = t;
      });
      commit();
    },
    async listSessions() {
      const regs = state.registrations ?? [];
      const company = (id: string | null) => (id ? state.companies.find((c) => c.id === id)?.name ?? null : null);
      const organiser = (s: { companyId: string | null }) =>
        session?.role === 'admin' || (session?.role === 'company' && s.companyId === session.companyId);
      return (state.sessions ?? [])
        .map((s) => ({
          id: s.id, companyId: s.companyId, companyName: company(s.companyId), title: s.title, kind: s.kind,
          description: s.description, startsAt: s.startsAt, durationMin: s.durationMin, capacity: s.capacity,
          registered: regs.filter((r) => r.sessionId === s.id).length,
          attended: regs.filter((r) => r.sessionId === s.id && r.attendedAt).length,
          isRegistered: regs.some((r) => r.sessionId === s.id && r.candidateId === session?.candidateId),
          hasAttended: regs.some((r) => r.sessionId === s.id && r.candidateId === session?.candidateId && r.attendedAt),
          isOrganiser: organiser(s),
        }))
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    },
    async getSessionLink(sessionId) {
      return (state.sessions ?? []).find((s) => s.id === sessionId)?.meetingUrl || null;
    },
    async saveSession(sessionId, input) {
      state.sessions = state.sessions ?? [];
      if (sessionId) Object.assign(state.sessions.find((s) => s.id === sessionId)!, input);
      else state.sessions.push({ id: uid('s'), ...input });
      commit();
    },
    async deleteSession(sessionId) {
      state.sessions = (state.sessions ?? []).filter((s) => s.id !== sessionId);
      state.registrations = (state.registrations ?? []).filter((r) => r.sessionId !== sessionId);
      commit();
    },
    async registerSession(sessionId) {
      const cid = session?.candidateId;
      if (!cid) throw new Error('Only students can register for sessions');
      const s = (state.sessions ?? []).find((x) => x.id === sessionId);
      const regs = (state.registrations = state.registrations ?? []);
      if (s?.capacity && regs.filter((r) => r.sessionId === sessionId).length >= s.capacity) throw new Error('This session is full');
      if (!regs.some((r) => r.sessionId === sessionId && r.candidateId === cid)) regs.push({ sessionId, candidateId: cid, createdAt: now() });
      commit();
    },
    async unregisterSession(sessionId) {
      state.registrations = (state.registrations ?? []).filter((r) => !(r.sessionId === sessionId && r.candidateId === session?.candidateId));
      commit();
    },
    async markSessionJoined(sessionId) {
      const r = (state.registrations ?? []).find((x) => x.sessionId === sessionId && x.candidateId === session?.candidateId);
      if (r && !r.joinedAt) {
        r.joinedAt = now();
        commit();
      }
    },
    async sessionHeartbeat(sessionId) {
      countPresence(sessionId, false);
    },
    async leaveSession(sessionId) {
      countPresence(sessionId, true);
    },
    async getAttendanceCode(sessionId) {
      const s = (state.sessions ?? []).find((x) => x.id === sessionId);
      if (!s) return null;
      s.attendanceCode ??= String(Math.floor(Math.random() * 10000)).padStart(4, '0');
      commit();
      return s.attendanceCode;
    },
    async checkIn(sessionId, code) {
      const s = (state.sessions ?? []).find((x) => x.id === sessionId);
      const r = (state.registrations ?? []).find((x) => x.sessionId === sessionId && x.candidateId === session?.candidateId);
      if (!s || !r) throw new Error('Register for this session first');
      if (r.attendedAt) return { present: true as const };
      if ((r.attempts ?? 0) >= 5) throw new Error('Too many wrong codes. Ask the organiser to mark you present.');
      s.attendanceCode ??= String(Math.floor(Math.random() * 10000)).padStart(4, '0');
      if (code.trim() === s.attendanceCode) {
        r.attendedAt = now();
        commit();
        return { present: true as const };
      }
      r.attempts = (r.attempts ?? 0) + 1;
      commit();
      return { present: false as const, attemptsLeft: 5 - r.attempts };
    },
    async markAttended(sessionId, candidateId, present) {
      const r = (state.registrations ?? []).find((x) => x.sessionId === sessionId && x.candidateId === candidateId);
      if (r) r.attendedAt = present ? r.attendedAt ?? now() : null;
      commit();
    },
    async listRegistrants(sessionId) {
      return (state.registrations ?? [])
        .filter((r) => r.sessionId === sessionId)
        .map((r) => {
          const c = findCandidate(r.candidateId);
          return {
            candidateId: c.id, name: `${c.firstName} ${c.lastName}`, school: c.school, programme: c.programme,
            graduationYear: c.graduationYear || null, linkedinUrl: c.linkedinUrl || null, visible: isVisible(c),
            registeredAt: r.createdAt ?? '', joinedAt: r.joinedAt ?? null, attendedAt: r.attendedAt ?? null,
            leftAt: r.leftAt ?? null, lastSeenAt: r.lastSeenAt ?? null, secondsPresent: r.seconds ?? 0,
          };
        });
    },
    async listSlots(companyId) {
      return clone((state.slots ?? []).filter((s) => s.companyId === companyId).sort((a, b) => a.startsAt.localeCompare(b.startsAt)));
    },
    async addSlot(companyId, slot) {
      if ((state.slots ?? []).some((s) => s.companyId === companyId && s.startsAt === slot.startsAt)) {
        throw new Error('You already have a slot at that time.');
      }
      (state.slots = state.slots ?? []).push({ id: uid('sl'), companyId, ...slot, candidateId: null, bookedAt: null });
      commit();
    },
    async deleteSlot(slotId) {
      state.slots = (state.slots ?? []).filter((s) => s.id !== slotId);
      commit();
    },
    async listStudentInterviews() {
      const cid = session?.candidateId;
      const slots = state.slots ?? [];
      return state.interviewRequests
        .filter((r) => r.candidateId === cid)
        .map((r) => {
          const b = slots.find((s) => s.companyId === r.companyId && s.candidateId === cid);
          return {
            companyId: r.companyId,
            companyName: state.companies.find((c) => c.id === r.companyId)?.name ?? '',
            requestedAt: r.createdAt,
            booked: b ? { slotId: b.id, startsAt: b.startsAt, durationMin: b.durationMin, meetingUrl: b.meetingUrl } : null,
            freeSlots: slots
              .filter((s) => s.companyId === r.companyId && !s.candidateId && Date.parse(s.startsAt) > Date.now())
              .map((s) => ({ id: s.id, startsAt: s.startsAt, durationMin: s.durationMin })),
          };
        });
    },
    async listOpenings() {
      const role = session?.role;
      const cid = session?.candidateId;
      const interests = state.openingInterests ?? [];
      return (state.openings ?? [])
        .map((o) => {
          const mine = role === 'admin' || (role === 'company' && o.companyId === session?.companyId);
          return {
            ...o,
            companyName: state.companies.find((c) => c.id === o.companyId)?.name ?? '',
            interested: mine ? interests.filter((i) => i.openingId === o.id && isVisible(findCandidate(i.candidateId))).length : null,
            isInterested: interests.some((i) => i.openingId === o.id && i.candidateId === cid),
            isMine: mine,
            myMatch: cid ? skillMatch(state.candidates.find((c) => c.id === cid), o.skills) : null,
          };
        })
        .filter((o) => o.isMine || (role === 'student' && o.published))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async saveOpening(companyId, input, id) {
      if (!input.title.trim()) throw new Error('Give the opening a title');
      const list = (state.openings = state.openings ?? []);
      const existing = id && list.find((o) => o.id === id);
      if (existing) Object.assign(existing, input);
      else list.push({ id: uid('op'), companyId, createdAt: now(), ...input });
      commit();
    },
    async deleteOpening(id) {
      state.openings = (state.openings ?? []).filter((o) => o.id !== id);
      state.openingInterests = (state.openingInterests ?? []).filter((i) => i.openingId !== id);
      commit();
    },
    async setOpeningInterest(id, interested) {
      const cid = session?.candidateId;
      if (!cid) throw new Error('Only students can show interest');
      const list = (state.openingInterests = state.openingInterests ?? []);
      if (!interested) state.openingInterests = list.filter((i) => !(i.openingId === id && i.candidateId === cid));
      else {
        if (!list.some((i) => i.openingId === id && i.candidateId === cid)) list.push({ openingId: id, candidateId: cid, createdAt: now() });
      }
      commit();
    },
    async listOpeningInterest(id) {
      const wanted = (state.openings ?? []).find((o) => o.id === id)?.skills ?? [];
      return (state.openingInterests ?? [])
        .filter((i) => i.openingId === id)
        .map((i) => ({ i, c: findCandidate(i.candidateId) }))
        .filter(({ c }) => isVisible(c))
        .map(({ i, c }) => ({
          candidateId: c.id, name: `${c.firstName} ${c.lastName}`.trim(), school: c.school, programme: c.programme,
          graduationYear: c.graduationYear ?? null, interestedAt: i.createdAt, matched: skillMatch(c, wanted), matchedSkills: matchedSkills(c, wanted),
        }))
        .sort((a, b) => b.matched - a.matched);
    },
    async bookSlot(slotId) {
      const cid = session?.candidateId;
      const slot = (state.slots ?? []).find((s) => s.id === slotId);
      if (!cid || !slot) throw new Error('This slot no longer exists');
      if (slot.candidateId) throw new Error('This slot was just taken. Pick another one.');
      (state.slots ?? []).forEach((s) => {
        if (s.companyId === slot.companyId && s.candidateId === cid) Object.assign(s, { candidateId: null, bookedAt: null });
      });
      Object.assign(slot, { candidateId: cid, bookedAt: now() });
      commit();
    },
    async cancelBooking(slotId) {
      const slot = (state.slots ?? []).find((s) => s.id === slotId && s.candidateId === session?.candidateId);
      if (slot) Object.assign(slot, { candidateId: null, bookedAt: null });
      commit();
    },

    async sendAccessCode() {
      throw new Error('E-mails are not sent in the demo: copy the code instead.');
    },
    async listAdmins() {
      const owners = state.owners ?? [DEMO_ACCOUNTS.admin.email];
      return (state.admins ?? []).map((email) => ({ email, signedIn: email === DEMO_ACCOUNTS.admin.email, isOwner: owners.includes(email), accessCode: 'DEMO-CODE' }));
    },
    async setOwner(email, owner) {
      const owners = new Set(state.owners ?? [DEMO_ACCOUNTS.admin.email]);
      if (!owner && owners.size <= 1 && owners.has(email)) throw new Error('The club needs at least one owner');
      if (owner) owners.add(email);
      else owners.delete(email);
      state.owners = [...owners];
      commit();
    },
    async deleteCandidate(candidateId) {
      state.candidates = state.candidates.filter((c) => c.id !== candidateId);
      state.shortlists = state.shortlists.filter((x) => x.candidateId !== candidateId);
      state.registrations = (state.registrations ?? []).filter((x) => x.candidateId !== candidateId);
      commit();
    },
    async deleteCompany(companyId) {
      state.companies = state.companies.filter((c) => c.id !== companyId);
      state.invitations = state.invitations.filter((i) => i.companyId !== companyId);
      state.sessions = (state.sessions ?? []).filter((x) => x.companyId !== companyId);
      commit();
    },
    async getSettings() {
      return { ...(state.settings ?? {}) };
    },
    async saveSettings(values) {
      state.settings = { ...(state.settings ?? {}), ...Object.fromEntries(Object.entries(values).map(([k, v]) => [k, String(v ?? '')])) };
      commit();
    },
    async addAdmin(email) {
      const em = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) throw new Error('Enter a valid e-mail address');
      state.admins = Array.from(new Set([...(state.admins ?? []), em]));
      commit();
    },
    async removeAdmin(email) {
      if (email === session?.email) throw new Error('You cannot remove yourself. Ask another owner.');
      if ((state.owners ?? [DEMO_ACCOUNTS.admin.email]).includes(email) && (state.owners ?? [DEMO_ACCOUNTS.admin.email]).length <= 1) {
        throw new Error('The club needs at least one owner');
      }
      if ((state.admins ?? []).length <= 1) throw new Error('The club needs at least one admin');
      state.admins = (state.admins ?? []).filter((a) => a !== email);
      commit();
    },
    async getTalentPool() {
      return state.candidates.map((c) => ({
        school: c.school, programme: c.programme, graduationYear: c.graduationYear || null, gender: c.gender ?? 'Not answered',
        yearsExperience: c.yearsExperience ?? null, pastSectors: c.pastSectors ?? [], functions: c.functions, sectors: c.sectors,
        countries: c.countries, workedCountries: c.workedCountries ?? '', languages: c.languages, positionType: c.positionType,
        complete: isProfileComplete(c), consented: Boolean(c.consent), visible: isVisible(c),
      }));
    },
    async getDashboard() {
      const cs = state.candidates;
      const waiting = cs.filter((x) => x.consent && !x.verifiedAt);
      const oldest = waiting.reduce<string | null>((m, x) => (!m || x.consent!.givenAt < m ? x.consent!.givenAt : m), null);
      const count = <T,>(list: T[], f: (x: T) => boolean) => list.filter(f).length;
      return {
        students: {
          signedUp: cs.length,
          complete: count(cs, isProfileComplete),
          consented: count(cs, (x) => Boolean(x.consent)),
          readyForReview: count(cs, (x) => Boolean(x.consent) && isProfileComplete(x)),
          waiting: waiting.length,
          visible: count(cs, isVisible),
        },
        oldestWaitingDays: oldest ? Math.floor((Date.now() - Date.parse(oldest)) / 86_400_000) : null,
        companies: {
          total: state.companies.length,
          invited: state.invitations.length,
          accepted: count(state.invitations, (i) => i.status === 'Accepted'),
        },
        activity: {
          cvViews: state.cvViews.length,
          shortlisted: state.shortlists.length,
          interviewRequests: state.interviewRequests.length,
          consentsWithdrawn: 0,
        },
        perCompany: state.companies
          .map((co) => ({
            name: co.name,
            invited: count(state.invitations, (i) => i.companyId === co.id),
            accepted: count(state.invitations, (i) => i.companyId === co.id && i.status === 'Accepted'),
            cvViews: count(state.cvViews, (v) => v.companyId === co.id),
            shortlisted: count(state.shortlists, (s) => s.companyId === co.id),
            interviewRequests: count(state.interviewRequests, (r) => r.companyId === co.id),
          }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      };
    },
    async listOptions(kind) {
      return [...(state.options?.[kind] ?? BUILTIN_OPTIONS[kind])];
    },
    async addOption(kind, name) {
      const n = name.trim();
      const list = [...(state.options?.[kind] ?? BUILTIN_OPTIONS[kind])];
      if (n.length < 2) throw new Error('Enter a name.');
      if (list.some((x) => x.toLowerCase() === n.toLowerCase())) throw new Error('Already in the list.');
      state.options = { ...state.options, [kind]: [...list, n] };
      commit();
    },
    async removeOption(kind, name) {
      state.options = { ...state.options, [kind]: (state.options?.[kind] ?? BUILTIN_OPTIONS[kind]).filter((x) => x !== name) };
      commit();
    },
    async listAllCandidates() {
      return clone([...state.candidates].sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1)));
    },
    async listSchoolEntries() {
      const logos = state.schoolLogos ?? {};
      return (await this.listSchools()).map((name) => ({ name, logoUrl: logos[name]?.logoUrl ?? null, showOnSite: logos[name]?.showOnSite ?? false }));
    },
    async uploadLogo(target, file) {
      if (!/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error('Use a PNG, JPEG or WebP image.');
      if (file.size > 300 * 1024) throw new Error('In the demo, keep logos under 300 KB.');
      const url = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.onerror = () => rej(new Error('Could not read the file.'));
        r.readAsDataURL(file);
      });
      if (target.kind === 'company') Object.assign(state.companies.find((c) => c.id === target.id)!, { logoUrl: url });
      else {
        const logos = (state.schoolLogos ??= {});
        logos[target.name] = { showOnSite: logos[target.name]?.showOnSite ?? false, logoUrl: url };
      }
      commit();
    },
    async setShowOnSite(target, show) {
      if (target.kind === 'company') Object.assign(state.companies.find((c) => c.id === target.id)!, { showOnSite: show });
      else {
        const logos = (state.schoolLogos ??= {});
        logos[target.name] = { logoUrl: logos[target.name]?.logoUrl ?? null, showOnSite: show };
      }
      commit();
    },
    async getPartners() {
      const logos = state.schoolLogos ?? {};
      return {
        companies: state.companies.filter((c) => c.showOnSite && c.logoUrl).map((c) => ({ name: c.name, logoUrl: c.logoUrl! })),
        schools: Object.entries(logos).filter(([, v]) => v.showOnSite && v.logoUrl).map(([name, v]) => ({ name, logoUrl: v.logoUrl! })),
      };
    },
    async addCompany(name) {
      const n = name.trim();
      if (state.companies.some((c) => c.name.toLowerCase() === n.toLowerCase())) throw new Error('This company already exists.');
      const co = { id: uid('co'), name: n };
      state.companies.push(co);
      commit();
      return clone(co);
    },
    async listSchools() {
      return [...(state.schools ?? SCHOOLS)].sort((a, b) => a.localeCompare(b));
    },
    async addSchool(name) {
      const n = name.trim();
      if (n.length < 2) throw new Error('Enter the school name.');
      if ((state.schools ?? []).some((x) => x.toLowerCase() === n.toLowerCase())) throw new Error('This school is already in the list.');
      (state.schools = state.schools ?? []).push(n);
      commit();
    },
    async removeSchool(name) {
      state.schools = (state.schools ?? []).filter((x) => x !== name);
      commit();
    },
    async listCompanies() {
      return clone(state.companies);
    },
    async getCompany(id) {
      return clone(state.companies.find((x) => x.id === id) ?? null);
    },
    async listFairCompanies() {
      const t = Date.now();
      return state.companies.map((co) => {
        const slots = (state.slots ?? []).filter((s) => s.companyId === co.id && Date.parse(s.startsAt) > t);
        const byDay = new Map<string, { day: string; from: string; to: string }>();
        for (const s of slots) {
          const day = fairDayKey(s.startsAt);
          const to = new Date(Date.parse(s.startsAt) + s.durationMin * 60_000).toISOString();
          const d = byDay.get(day);
          if (!d) byDay.set(day, { day, from: s.startsAt, to });
          else {
            if (s.startsAt < d.from) d.from = s.startsAt;
            if (to > d.to) d.to = to;
          }
        }
        return {
          id: co.id, name: co.name, logoUrl: co.logoUrl ?? null,
          about: co.about ?? '', website: co.website ?? '', sector: co.sector ?? '', locations: co.locations ?? '',
          hiringFor: co.hiringFor ?? [], hiringCountries: co.hiringCountries ?? '', size: co.size ?? '',
          sessions: (state.sessions ?? []).filter((s) => s.companyId === co.id && s.id !== 'slive')
            .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
            .map((s) => ({ id: s.id, title: s.title, kind: s.kind, startsAt: s.startsAt, durationMin: s.durationMin })),
          interviewSlots: slots.length,
          freeSlots: slots.filter((s) => !s.candidateId).length,
          interviewDays: [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day)),
          openings: (state.openings ?? []).filter((o) => o.companyId === co.id && o.published).length,
        };
      }).sort((a, b) => a.name.localeCompare(b.name));
    },
    async saveCompanyPage(companyId, page) {
      const co = state.companies.find((x) => x.id === companyId);
      if (!co) throw new Error('Company not found');
      Object.assign(co, {
        about: page.about.trim(), website: page.website.trim(), sector: page.sector.trim(), locations: page.locations.trim(),
        hiringFor: page.hiringFor, hiringCountries: page.hiringCountries.trim(), size: page.size.trim(),
      });
      commit();
    },
    async getCompanyDashboard(companyId) {
      const vis = state.candidates.filter(isVisible);
      const visId = new Set(vis.map((c) => c.id));
      const mySessions = (state.sessions ?? []).filter((s) => s.companyId === companyId);
      const regs = (state.registrations ?? []).filter((r) => mySessions.some((s) => s.id === r.sessionId));
      const myOpenings = (state.openings ?? []).filter((o) => o.companyId === companyId);
      const ints = (state.openingInterests ?? []).filter((i) => myOpenings.some((o) => o.id === i.openingId) && visId.has(i.candidateId));
      const slots = (state.slots ?? []).filter((s) => s.companyId === companyId);
      const views = state.cvViews.filter((v) => v.companyId === companyId);
      return {
        visibleCandidates: vis.length,
        shortlisted: state.shortlists.filter((s) => s.companyId === companyId && visId.has(s.candidateId)).length,
        cvViews: views.length,
        profilesOpened: new Set(views.map((v) => v.candidateId)).size,
        interviewRequests: state.interviewRequests.filter((r) => r.companyId === companyId).length,
        slots: slots.length,
        slotsBooked: slots.filter((s) => s.candidateId).length,
        openings: myOpenings.filter((o) => o.published).length,
        interested: ints.length,
        interestedPeople: new Set(ints.map((i) => i.candidateId)).size,
        sessions: mySessions.filter((s) => s.id !== 'slive').length,
        registered: regs.filter((r) => r.sessionId !== 'slive').length,
        attended: regs.filter((r) => r.sessionId !== 'slive' && r.attendedAt).length,
      };
    },
    async getCompanyTalentPool() {
      return state.candidates.filter(isVisible).map((c) => ({
        school: c.school, programme: c.programme, graduationYear: c.graduationYear, gender: 'Not answered' as const,
        yearsExperience: c.yearsExperience, pastSectors: c.pastSectors, functions: c.functions, sectors: c.sectors,
        countries: c.countries, workedCountries: c.workedCountries, languages: c.languages, positionType: c.positionType,
        complete: true, consented: true, visible: true,
      }));
    },
    async listInvitations() {
      return clone([...state.invitations].sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1)));
    },
    async inviteCompanyMember({ companyId, newCompanyName, email }) {
      let id = companyId;
      if (!id) {
        id = uid('co');
        state.companies.push({ id, name: newCompanyName!.trim() });
      }
      const inv = { id: uid('i'), email: email.trim().toLowerCase(), companyId: id, status: 'Invited' as const, createdAt: now() };
      state.invitations.push(inv);
      commit();
      return { ...inv, emailSent: false };
    },
  };
}
