// Browser-storage implementation of NyotaDb, used until the real database is connected.
import type { Candidate, NyotaDb, Session } from './types';
import { createSeed, DEMO_ACCOUNTS, type DemoState } from './seed';
import { CONSENT_VERSION } from '../../config/constants';
import { isProfileComplete, isVisible } from '../candidate';

const STATE_KEY = 'nyota-demo-state-v1';
const SESSION_KEY = 'nyota-demo-session-v1';

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

export function createDemoDb(): NyotaDb {
  let state: DemoState = read<DemoState>(STATE_KEY) ?? createSeed();
  let session: Session | null = read<Session>(SESSION_KEY);
  const listeners = new Set<() => void>();

  const commit = () => {
    write(STATE_KEY, state);
    write(SESSION_KEY, session);
    listeners.forEach((l) => l());
  };
  const findCandidate = (id: string) => {
    const cand = state.candidates.find((x) => x.id === id);
    if (!cand) throw new Error('Candidate not found');
    return cand;
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
    async signInWithProvider() {
      throw new Error('Google and Microsoft sign-in are not available in the demo.');
    },
    async signInDemo(role) {
      session =
        role === 'student'
          ? { role, email: DEMO_ACCOUNTS.student.email, candidateId: DEMO_ACCOUNTS.student.candidateId }
          : role === 'company'
            ? { role, email: DEMO_ACCOUNTS.company.email, companyId: DEMO_ACCOUNTS.company.companyId }
            : { role, email: DEMO_ACCOUNTS.admin.email };
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
    async giveConsent(candidateId) {
      findCandidate(candidateId).consent = { version: CONSENT_VERSION, givenAt: now() };
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
    async listAdmins() {
      return (state.admins ?? []).map((email) => ({ email, signedIn: email === DEMO_ACCOUNTS.admin.email }));
    },
    async addAdmin(email) {
      const em = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) throw new Error('Enter a valid e-mail address');
      state.admins = Array.from(new Set([...(state.admins ?? []), em]));
      commit();
    },
    async removeAdmin(email) {
      if (email === session?.email) throw new Error('You cannot remove yourself. Ask another admin.');
      if ((state.admins ?? []).length <= 1) throw new Error('The club needs at least one admin');
      state.admins = (state.admins ?? []).filter((a) => a !== email);
      commit();
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
    async listCompanies() {
      return clone(state.companies);
    },
    async getCompany(id) {
      return clone(state.companies.find((x) => x.id === id) ?? null);
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
