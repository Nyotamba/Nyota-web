// Live implementation of NyotaDb on Supabase. Access rules are enforced by the database
// (row-level security in supabase/schema.sql); this file only maps rows to the UI types.
import { createClient, FunctionsHttpError, type EmailOtpType, type SupabaseClient } from '@supabase/supabase-js';
import type { Candidate, Consent, InvitationStatus, NyotaDb, OAuthProvider, PositionType, Session } from './types';
import { CONSENT_VERSION, CV_LINK_TTL_SECONDS } from '../../config/constants';

// Every candidate column except e-mail, which companies may not read (column privileges).
const CANDIDATE_COLS =
  'id,user_id,first_name,last_name,school,programme,graduation_year,linkedin_url,functions,sectors,regions,countries,' +
  'languages,position_type,available_from,story,cv_path,cv_size_bytes,cv_uploaded_at,verified_at,updated_at';

interface CandidateRow {
  id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  school: string;
  programme: string;
  graduation_year: number | null;
  linkedin_url: string;
  functions: string[];
  sectors: string[];
  regions: string[];
  countries: string;
  languages: string[];
  position_type: PositionType;
  available_from: string | null; // YYYY-MM-DD
  story: string;
  cv_path: string | null;
  cv_size_bytes: number | null;
  cv_uploaded_at: string | null;
  verified_at: string | null;
  updated_at: string;
}

function toCandidate(r: CandidateRow, consent: Consent | null, email = ''): Candidate {
  return {
    id: r.id,
    email,
    firstName: r.first_name,
    lastName: r.last_name,
    school: r.school,
    programme: r.programme,
    graduationYear: r.graduation_year ?? 0,
    linkedinUrl: r.linkedin_url,
    functions: r.functions,
    sectors: r.sectors,
    regions: r.regions,
    countries: r.countries,
    languages: r.languages,
    positionType: r.position_type,
    availableFrom: r.available_from ? r.available_from.slice(0, 7) : '',
    story: r.story,
    cv: r.cv_path ? { name: 'cv.pdf', sizeBytes: r.cv_size_bytes ?? 0, uploadedAt: r.cv_uploaded_at ?? '' } : null,
    consent,
    verifiedAt: r.verified_at,
    updatedAt: r.updated_at,
  };
}

// Companies cannot read consents; every profile they can read has an active one (enforced by is_visible).
const IMPLIED_CONSENT: Consent = { version: CONSENT_VERSION, givenAt: '' };

/** Result of a query that always returns data (lists, inserts with .single()). */
// Rows are untyped (no generated database types); each caller maps them explicitly.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function check<T = any>(res: { data: unknown; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  if (res.data === null) throw new Error('No data returned');
  return res.data as T;
}
/** Result of a lookup that may find nothing (.maybeSingle()). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function maybe<T = any>(res: { data: unknown; error: { message: string } | null }): T | null {
  if (res.error) throw new Error(res.error.message);
  return res.data as T | null;
}

export function createSupabaseDb(url: string, key: string): NyotaDb {
  // Visitors come back signed in from two kinds of links:
  //  - ?token_hash=…&type=… : e-mail links (magic link, invitation). Work on any device or browser.
  //  - ?code=…              : Google / Microsoft (PKCE), exchanged by the client automatically.
  const params = new URLSearchParams(window.location.search);
  const tokenHash = params.get('token_hash');
  const otpType = params.get('type') as EmailOtpType | null;
  let cameFromLink = params.has('code') || Boolean(tokenHash);
  const sb: SupabaseClient = createClient(url, key, { auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true } });
  let linkError: string | null = params.get('error_description');
  const linkReady: Promise<void> =
    tokenHash && otpType
      ? sb.auth.verifyOtp({ token_hash: tokenHash, type: otpType }).then(({ error }) => {
          if (error) linkError = 'This sign-in link has expired or was already used. Ask for a new one.';
        })
      : Promise.resolve();
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());
  let session: Session | null | undefined; // undefined = not loaded yet
  sb.auth.onAuthStateChange(() => {
    session = undefined;
    emit();
  });

  async function loadSession(): Promise<Session | null> {
    await linkReady;
    if (session !== undefined) return session;
    const { data } = await sb.auth.getSession();
    const user = data.session?.user;
    if (!user) return (session = null);
    const profile = maybe(await sb.from('profiles').select('role,email,company_id').eq('id', user.id).maybeSingle());
    if (!profile) return (session = null);
    let candidateId: string | undefined;
    if (profile.role === 'student') {
      const row = maybe(await sb.from('candidates').select('id').eq('user_id', user.id).maybeSingle());
      candidateId = row?.id;
    }
    session = { role: profile.role, email: profile.email, companyId: profile.company_id ?? undefined, candidateId };
    return session;
  }

  async function activeConsent(candidateId: string): Promise<Consent | null> {
    const row = maybe(
      await sb.from('consents').select('version,given_at').eq('candidate_id', candidateId).is('withdrawn_at', null).maybeSingle(),
    );
    return row ? { version: row.version, givenAt: row.given_at } : null;
  }

  const changed = <T,>(v: T) => {
    emit();
    return v;
  };

  return {
    mode: 'live',
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    getSession: loadSession,
    takeLinkError() {
      const e = linkError;
      linkError = null;
      if (e) {
        cameFromLink = false;
        window.history.replaceState(null, '', window.location.pathname + window.location.hash);
      }
      return e;
    },
    async sendMagicLink(email) {
      const redirect = window.location.origin + window.location.pathname;
      check(await sb.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { emailRedirectTo: redirect } }));
    },
    consumeSignInRedirect() {
      if (!cameFromLink) return false;
      cameFromLink = false;
      // Drop ?code=… / ?token_hash=… from the address bar, keep the hash route.
      window.history.replaceState(null, '', window.location.pathname + window.location.hash);
      return true;
    },
    async enabledProviders() {
      try {
        const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } });
        const external = ((await res.json()).external ?? {}) as Record<string, boolean>;
        return (['azure', 'google'] as OAuthProvider[]).filter((p) => external[p]);
      } catch {
        return [];
      }
    },
    async signInWithProvider(provider) {
      check(
        await sb.auth.signInWithOAuth({
          provider,
          options: { redirectTo: window.location.origin + window.location.pathname, scopes: provider === 'azure' ? 'email' : undefined },
        }),
      );
    },
    async signInDemo() {
      throw new Error('Demo accounts are not available on the live site.');
    },
    async signOut() {
      await sb.auth.signOut();
      session = null;
      emit();
    },
    async resetDemo() {
      throw new Error('There is no demo data on the live site.');
    },

    async getCandidate(id) {
      const row = maybe(await sb.from('candidates').select(CANDIDATE_COLS).eq('id', id).maybeSingle()) as unknown as CandidateRow | null;
      if (!row) return null;
      const s = await loadSession();
      const consent = s?.role === 'company' ? IMPLIED_CONSENT : await activeConsent(id);
      return toCandidate(row, consent, s?.candidateId === id ? s.email : '');
    },
    async saveProfile(candidateId, input) {
      const row = check(
        await sb
          .from('candidates')
          .update({
            first_name: input.firstName.trim(),
            last_name: input.lastName.trim(),
            school: input.school,
            programme: input.programme.trim(),
            graduation_year: input.graduationYear || null,
            linkedin_url: input.linkedinUrl.trim(),
            functions: input.functions,
            sectors: input.sectors,
            regions: input.regions,
            countries: input.countries.trim(),
            languages: input.languages,
            position_type: input.positionType,
            available_from: input.availableFrom ? `${input.availableFrom}-01` : null,
            story: input.story,
            updated_at: new Date().toISOString(),
          })
          .eq('id', candidateId)
          .select(CANDIDATE_COLS)
          .single(),
      ) as unknown as CandidateRow;
      return changed(toCandidate(row, await activeConsent(candidateId), session?.email ?? ''));
    },
    async setCv(candidateId, file) {
      const path = `${candidateId}/cv.pdf`;
      if (file) {
        check(await sb.storage.from('cvs').upload(path, file, { upsert: true, contentType: 'application/pdf' }));
      } else {
        check(await sb.storage.from('cvs').remove([path]));
      }
      const now = new Date().toISOString();
      check(
        await sb
          .from('candidates')
          .update({ cv_path: file ? path : null, cv_size_bytes: file?.size ?? null, cv_uploaded_at: file ? now : null, updated_at: now })
          .eq('id', candidateId),
      );
      emit();
    },
    async getCvUrl(candidateId) {
      const row = maybe(await sb.from('candidates').select('cv_path').eq('id', candidateId).maybeSingle());
      if (!row?.cv_path) return null;
      const { data, error } = await sb.storage.from('cvs').createSignedUrl(row.cv_path, CV_LINK_TTL_SECONDS);
      return error ? null : data.signedUrl;
    },
    async giveConsent(candidateId) {
      check(await sb.from('consents').insert({ candidate_id: candidateId, version: CONSENT_VERSION }));
      emit();
    },
    async withdrawConsent(candidateId) {
      check(
        await sb.from('consents').update({ withdrawn_at: new Date().toISOString() }).eq('candidate_id', candidateId).is('withdrawn_at', null),
      );
      emit();
    },

    async listVisibleCandidates() {
      // Row-level security returns only consented, verified profiles with a CV.
      const rows = check(await sb.from('candidates').select(CANDIDATE_COLS)) as unknown as CandidateRow[];
      return rows.filter((r) => r.verified_at && r.cv_path).map((r) => toCandidate(r, IMPLIED_CONSENT));
    },
    async listShortlist(companyId) {
      const rows = check<{ candidate_id: string }[]>(await sb.from('shortlists').select('candidate_id').eq('company_id', companyId));
      return rows.map((r) => r.candidate_id);
    },
    async toggleShortlist(companyId, candidateId) {
      const existing = maybe(
        await sb.from('shortlists').select('candidate_id').eq('company_id', companyId).eq('candidate_id', candidateId).maybeSingle(),
      );
      if (existing) check(await sb.from('shortlists').delete().eq('company_id', companyId).eq('candidate_id', candidateId));
      else check(await sb.from('shortlists').insert({ company_id: companyId, candidate_id: candidateId }));
      return changed(!existing);
    },
    async requestInterview(companyId, candidateId) {
      const r = check(
        await sb.from('interview_requests').insert({ company_id: companyId, candidate_id: candidateId }).select('id,created_at').single(),
      );
      return changed({ id: r.id, companyId, candidateId, createdAt: r.created_at });
    },
    async listInterviewRequests(companyId) {
      const rows = check<{ id: string; candidate_id: string; created_at: string }[]>(await sb.from('interview_requests').select('id,candidate_id,created_at').eq('company_id', companyId));
      return rows.map((r) => ({ id: r.id, companyId, candidateId: r.candidate_id, createdAt: r.created_at }));
    },
    async logCvView(companyId, candidateId) {
      check(await sb.from('cv_views').insert({ company_id: companyId, candidate_id: candidateId }));
    },

    async listVerificationQueue() {
      const queue = check(await sb.rpc('verification_queue')) as {
        id: string; email: string; consent_version: string; consent_given_at: string;
      }[];
      if (!queue.length) return [];
      const rows = check(await sb.from('candidates').select(CANDIDATE_COLS).in('id', queue.map((q) => q.id))) as unknown as CandidateRow[];
      const byId = new Map(rows.map((r) => [r.id, r]));
      return queue
        .filter((q) => byId.has(q.id))
        .map((q) => toCandidate(byId.get(q.id)!, { version: q.consent_version, givenAt: q.consent_given_at }, q.email));
    },
    async verifyCandidates(ids) {
      check(await sb.rpc('verify_candidates', { ids }));
      emit();
    },
    async listAdmins() {
      const rows = check<{ email: string; signed_in: boolean }[]>(await sb.rpc('list_admins'));
      return rows.map((r) => ({ email: r.email, signedIn: r.signed_in }));
    },
    async addAdmin(email) {
      check(await sb.rpc('add_admin', { new_email: email }).then((r) => ({ ...r, data: true })));
      emit();
    },
    async removeAdmin(email) {
      check(await sb.rpc('remove_admin', { old_email: email }).then((r) => ({ ...r, data: true })));
      emit();
    },
    async getDashboard() {
      return check(await sb.rpc('admin_dashboard'));
    },
    async listCompanies() {
      return check(await sb.from('companies').select('id,name').order('name'));
    },
    async getCompany(id) {
      return maybe(await sb.from('companies').select('id,name').eq('id', id).maybeSingle());
    },
    async listInvitations() {
      const rows = check<{ id: string; email: string; company_id: string; status: InvitationStatus; created_at: string }[]>(await sb.from('invitations').select('id,email,company_id,status,created_at').order('created_at', { ascending: false }));
      return rows.map((r) => ({ id: r.id, email: r.email, companyId: r.company_id, status: r.status, createdAt: r.created_at }));
    },
    async inviteCompanyMember({ companyId, newCompanyName, email }) {
      // Preferred: the invite-company-member function records the invitation AND e-mails the link.
      const { data, error } = await sb.functions.invoke('invite-company-member', {
        body: { companyId, newCompanyName, email, redirectTo: window.location.origin + window.location.pathname },
      });
      if (!error) {
        const r = data.invitation;
        return changed({
          id: r.id, email: r.email, companyId: r.company_id, status: r.status as InvitationStatus, createdAt: r.created_at,
          emailSent: Boolean(data.emailSent),
        });
      }
      const status = error instanceof FunctionsHttpError ? error.context.status : 0;
      if (status !== 404) {
        const body = error instanceof FunctionsHttpError ? await error.context.json().catch(() => null) : null;
        throw new Error(body?.error ?? error.message);
      }
      // Function not deployed yet: record the invitation only (no e-mail).
      let id = companyId;
      if (!id) id = check(await sb.from('companies').insert({ name: newCompanyName!.trim() }).select('id').single()).id as string;
      const r = check(
        await sb
          .from('invitations')
          .insert({ company_id: id, email: email.trim().toLowerCase(), invited_by: (await sb.auth.getUser()).data.user?.id })
          .select('id,email,company_id,status,created_at')
          .single(),
      );
      return changed({ id: r.id, email: r.email, companyId: r.company_id, status: r.status, createdAt: r.created_at, emailSent: false });
    },
  };
}
