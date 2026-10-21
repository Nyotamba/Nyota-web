// Live implementation of NyotaDb on Supabase. Access rules are enforced by the database
// (row-level security in supabase/schema.sql); this file only maps rows to the UI types.
import { createClient, FunctionsHttpError, type EmailOtpType, type SupabaseClient } from '@supabase/supabase-js';
import type { Candidate, Consent, Contract, FairCompany, FairSession, Gender, TalentRow, InterviewSlot, InvitationStatus, NyotaDb, OAuthProvider, PositionType, Session, StudentInterview } from './types';
import { BUILTIN_OPTIONS, CONSENT_VERSION, CV_LINK_TTL_SECONDS, SCHOOLS } from '../../config/constants';

// Every candidate column except e-mail, which companies may not read (column privileges).
const BASE_COLS =
  'id,user_id,first_name,last_name,school,programme,graduation_year,linkedin_url,functions,sectors,regions,countries,' +
  'languages,position_type,available_from,story,cv_path,cv_size_bytes,cv_uploaded_at,verified_at,updated_at';
const BACKGROUND_COLS = 'job_title,employer,years_experience,past_sectors,worked_countries';
// Background columns come with migration 007; until it has run, profiles load without them instead of failing.
let hasBackground = true;
const candidateCols = () => (hasBackground ? `${BASE_COLS},${BACKGROUND_COLS}` : BASE_COLS);
const missingColumn = (err: { code?: string; message?: string } | null) => err?.code === '42703' || /does not exist/.test(err?.message ?? '');
/** Runs a candidates query; retries once without the background columns if the database does not have them yet. */
async function withCols<T extends { error: { code?: string; message: string } | null }>(run: (cols: string) => PromiseLike<T>): Promise<T> {
  let res = await run(candidateCols());
  if (hasBackground && missingColumn(res.error)) {
    hasBackground = false;
    res = await run(candidateCols());
  }
  return res;
}

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
  job_title: string;
  employer: string;
  years_experience: number | null;
  past_sectors: string[];
  worked_countries: string;
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
    jobTitle: r.job_title ?? '',
    employer: r.employer ?? '',
    yearsExperience: r.years_experience ?? null,
    pastSectors: r.past_sectors ?? [],
    workedCountries: r.worked_countries ?? '',
    gender: null,
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
/** Writes that return nothing (insert / update / delete without .select()): only errors matter. */
function ok(res: { error: { message: string } | null }): void {
  if (res.error) throw new Error(res.error.message);
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
  let resetPending = params.has('reset') && cameFromLink;
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
  let accessToken: string | null = null; // kept for the keepalive "leave" request when a tab closes
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
    // is_owner arrives with migration 012; before that, read the profile without it.
    let profile = maybe(await sb.from('profiles').select('role,email,company_id,is_owner').eq('id', user.id).maybeSingle().then((r) =>
      missingColumn(r.error) ? sb.from('profiles').select('role,email,company_id').eq('id', user.id).maybeSingle() : r));
    if (!profile) return (session = null);
    let candidateId: string | undefined;
    if (profile.role === 'student') {
      const row = maybe(await sb.from('candidates').select('id').eq('user_id', user.id).maybeSingle());
      candidateId = row?.id;
    }
    session = { role: profile.role, isOwner: Boolean(profile.is_owner), email: profile.email, companyId: profile.company_id ?? undefined, candidateId };
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
        return (['linkedin_oidc', 'azure', 'google'] as OAuthProvider[]).filter((p) => external[p]);
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
    async signInWithPassword(email, password) {
      const { error } = await sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (error) {
        throw new Error(/invalid login/i.test(error.message)
          ? 'Wrong e-mail or password. New here? Choose “Create my account”.'
          : /not confirmed/i.test(error.message) ? 'Confirm your e-mail address first (check your inbox), or ask the club.' : error.message);
      }
      session = undefined;
      emit();
    },
    async signUpWithPassword(email, password, accessCode) {
      const { data, error } = await sb.auth.signUp({ email: email.trim().toLowerCase(), password });
      if (error) {
        throw new Error(/already registered|exists/i.test(error.message)
          ? 'An account already exists with this e-mail. Choose “I have an account”.' : error.message);
      }
      // Supabase returns a user with no identities when the address is already taken (anti-enumeration).
      if (data.user && data.user.identities?.length === 0) throw new Error('An account already exists with this e-mail. Choose “I have an account”.');
      if (!data.session) return { needsConfirmation: true };
      if (accessCode?.trim()) {
        session = undefined;
        maybe(await sb.rpc('redeem_access_code', { code: accessCode }));
      }
      session = undefined;
      emit();
      return { needsConfirmation: false };
    },
    async sendPasswordReset(email) {
      const { error } = await sb.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}${window.location.pathname}?reset=1`,
      });
      if (error) {
        throw new Error(/rate limit/i.test(error.message)
          ? 'Too many e-mails were sent in the last hour. Try again later.' : `The e-mail could not be sent: ${error.message}`);
      }
    },
    takePasswordReset() {
      const r = resetPending;
      resetPending = false;
      return r;
    },
    async updatePassword(password) {
      const { error } = await sb.auth.updateUser({ password });
      if (error) {
        throw new Error(/different from the old/i.test(error.message) ? 'Choose a password different from your current one.' : error.message);
      }
    },
    async redeemAccessCode(code) {
      const role = check<Session['role']>(await sb.rpc('redeem_access_code', { code }));
      session = undefined;
      emit();
      return role;
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
      const row = maybe(await withCols((cols) => sb.from('candidates').select(cols).eq('id', id).maybeSingle())) as unknown as CandidateRow | null;
      if (!row) return null;
      const s = await loadSession();
      const consent = s?.role === 'company' ? IMPLIED_CONSENT : await activeConsent(id);
      const c = toCandidate(row, consent, s?.candidateId === id ? s.email : '');
      if (s?.candidateId === id) {
        const { data } = await sb.from('candidate_private').select('gender').eq('candidate_id', id).maybeSingle();
        c.gender = (data?.gender as Gender | undefined) ?? null;
      }
      return c;
    },
    async saveProfile(candidateId, input) {
      const base = {
        first_name: input.firstName.trim(),
        last_name: input.lastName.trim(),
        school: input.school.trim(),
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
      };
      const background = {
        job_title: input.jobTitle.trim(),
        employer: input.employer.trim(),
        years_experience: input.yearsExperience,
        past_sectors: input.pastSectors,
        worked_countries: input.workedCountries.trim(),
      };
      const row = check(
        await withCols((cols) =>
          sb.from('candidates').update(hasBackground ? { ...base, ...background } : base).eq('id', candidateId).select(cols).single(),
        ),
      ) as unknown as CandidateRow;
      // Gender lives in a separate table companies cannot read (migration 009); skip quietly if it is not there yet.
      await sb.from('candidate_private').upsert({ candidate_id: candidateId, gender: input.gender, updated_at: new Date().toISOString() });
      const saved = toCandidate(row, await activeConsent(candidateId), session?.email ?? '');
      saved.gender = input.gender;
      return changed(saved);
    },
    async setCv(candidateId, file) {
      const path = `${candidateId}/cv.pdf`;
      if (file) {
        check(await sb.storage.from('cvs').upload(path, file, { upsert: true, contentType: 'application/pdf' }));
      } else {
        check(await sb.storage.from('cvs').remove([path]));
      }
      const now = new Date().toISOString();
      ok(
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
    async giveConsent(candidateId, version) {
      ok(await sb.from('consents').insert({ candidate_id: candidateId, version: version || CONSENT_VERSION }));
      emit();
    },
    async withdrawConsent(candidateId) {
      ok(
        await sb.from('consents').update({ withdrawn_at: new Date().toISOString() }).eq('candidate_id', candidateId).is('withdrawn_at', null),
      );
      emit();
    },

    async listVisibleCandidates() {
      // Row-level security returns only consented, verified profiles with a CV.
      const rows = check(await withCols((cols) => sb.from('candidates').select(cols))) as unknown as CandidateRow[];
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
      if (existing) ok(await sb.from('shortlists').delete().eq('company_id', companyId).eq('candidate_id', candidateId));
      else ok(await sb.from('shortlists').insert({ company_id: companyId, candidate_id: candidateId }));
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
      ok(await sb.from('cv_views').insert({ company_id: companyId, candidate_id: candidateId }));
    },

    async listVerificationQueue() {
      const queue = check(await sb.rpc('verification_queue')) as {
        id: string; email: string; consent_version: string; consent_given_at: string;
      }[];
      if (!queue.length) return [];
      const rows = check(await withCols((cols) => sb.from('candidates').select(cols).in('id', queue.map((q) => q.id)))) as unknown as CandidateRow[];
      const byId = new Map(rows.map((r) => [r.id, r]));
      return queue
        .filter((q) => byId.has(q.id))
        .map((q) => toCandidate(byId.get(q.id)!, { version: q.consent_version, givenAt: q.consent_given_at }, q.email));
    },
    async verifyCandidates(ids) {
      check(await sb.rpc('verify_candidates', { ids }));
      emit();
    },
    async listSessions() {
      const rows = check<{
        id: string; company_id: string | null; company_name: string | null; title: string; kind: FairSession['kind'];
        description: string; starts_at: string; duration_min: number; capacity: number | null; registered: number;
        attended?: number; is_registered: boolean; has_attended?: boolean; is_organiser: boolean;
      }[]>(await sb.rpc('list_sessions'));
      return rows.map((r) => ({
        id: r.id, companyId: r.company_id, companyName: r.company_name, title: r.title, kind: r.kind, description: r.description,
        startsAt: r.starts_at, durationMin: r.duration_min, capacity: r.capacity, registered: r.registered,
        attended: r.attended ?? 0, isRegistered: r.is_registered, hasAttended: Boolean(r.has_attended), isOrganiser: r.is_organiser,
      }));
    },
    async getSessionLink(sessionId) {
      return maybe<string>(await sb.rpc('session_link', { sid: sessionId }));
    },
    async saveSession(sessionId, s) {
      const row = {
        company_id: s.companyId, title: s.title.trim(), kind: s.kind, description: s.description.trim(), starts_at: s.startsAt,
        duration_min: s.durationMin, capacity: s.capacity, meeting_url: s.meetingUrl.trim(),
      };
      if (sessionId) check(await sb.from('sessions').update(row).eq('id', sessionId).select('id').single());
      else check(await sb.from('sessions').insert(row).select('id').single());
      emit();
    },
    async deleteSession(sessionId) {
      check(await sb.from('sessions').delete().eq('id', sessionId).select('id'));
      emit();
    },
    async registerSession(sessionId) {
      maybe(await sb.rpc('register_session', { sid: sessionId }));
      emit();
    },
    async unregisterSession(sessionId) {
      maybe(await sb.rpc('unregister_session', { sid: sessionId }));
      emit();
    },
    async markSessionJoined(sessionId) {
      await sb.rpc('mark_session_joined', { sid: sessionId });
    },
    async listRegistrants(sessionId) {
      const rows = check<{
        candidate_id: string; name: string; school: string; programme: string; graduation_year: number | null;
        linkedin_url: string | null; visible: boolean; registered_at: string; joined_at: string | null; attended_at?: string | null;
        left_at?: string | null; last_seen_at?: string | null; seconds_present?: number;
      }[]>(await sb.rpc('session_registrants', { sid: sessionId }));
      return rows.map((r) => ({
        candidateId: r.candidate_id, name: r.name, school: r.school, programme: r.programme, graduationYear: r.graduation_year,
        linkedinUrl: r.linkedin_url, visible: r.visible, registeredAt: r.registered_at, joinedAt: r.joined_at,
        attendedAt: r.attended_at ?? null, leftAt: r.left_at ?? null, lastSeenAt: r.last_seen_at ?? null, secondsPresent: r.seconds_present ?? 0,
      }));
    },
    async sessionHeartbeat(sessionId) {
      const { data } = await sb.auth.getSession();
      accessToken = data.session?.access_token ?? accessToken;
      await sb.rpc('session_heartbeat', { sid: sessionId });
    },
    async leaveSession(sessionId, opts) {
      if (opts?.keepalive && accessToken) {
        // The tab is closing: a keepalive request still reaches the server.
        fetch(`${url}/rest/v1/rpc/leave_session`, {
          method: 'POST', keepalive: true,
          headers: { apikey: key, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ sid: sessionId }),
        }).catch(() => undefined);
        return;
      }
      await sb.rpc('leave_session', { sid: sessionId });
    },
    async getAttendanceCode(sessionId) {
      return maybe<string>(await sb.rpc('session_attendance_code', { sid: sessionId }));
    },
    async checkIn(sessionId, code) {
      const result = check<string>(await sb.rpc('check_in_session', { sid: sessionId, code }));
      if (result === 'present') {
        emit();
        return { present: true as const };
      }
      return { present: false as const, attemptsLeft: Number(result.split(':')[1] ?? 0) };
    },
    async markAttended(sessionId, candidateId, present) {
      ok(await sb.rpc('mark_attended', { sid: sessionId, cid: candidateId, present }));
      emit();
    },

    async listSlots(companyId) {
      const rows = check<{ id: string; company_id: string; starts_at: string; duration_min: number; meeting_url: string; candidate_id: string | null; booked_at: string | null }[]>(
        await sb.from('interview_slots').select('id,company_id,starts_at,duration_min,meeting_url,candidate_id,booked_at').eq('company_id', companyId).order('starts_at'),
      );
      return rows.map((r): InterviewSlot => ({
        id: r.id, companyId: r.company_id, startsAt: r.starts_at, durationMin: r.duration_min, meetingUrl: r.meeting_url,
        candidateId: r.candidate_id, bookedAt: r.booked_at,
      }));
    },
    async addSlot(companyId, slot) {
      const res = await sb.from('interview_slots').insert({
        company_id: companyId, starts_at: slot.startsAt, duration_min: slot.durationMin, meeting_url: slot.meetingUrl.trim(),
      }).select('id').single();
      if (res.error?.message.includes('one_slot_per_time')) throw new Error('You already have a slot at that time.');
      check(res);
      emit();
    },
    async deleteSlot(slotId) {
      check(await sb.from('interview_slots').delete().eq('id', slotId).select('id'));
      emit();
    },
    async listStudentInterviews() {
      return check<StudentInterview[]>(await sb.rpc('student_interviews'));
    },
    async listOpenings() {
      const rows = check<{
        id: string; company_id: string; company_name: string; title: string; contract: Contract; function: string; location: string;
        description: string; apply_url: string; apply_by: string | null; published: boolean; created_at: string;
        interested: number | null; is_interested: boolean; is_mine: boolean; skills: string[] | null; my_match: number | null;
      }[]>(await sb.rpc('list_openings'));
      return rows.map((r) => ({
        id: r.id, companyId: r.company_id, companyName: r.company_name, title: r.title, contract: r.contract, function: r.function,
        location: r.location, description: r.description, applyUrl: r.apply_url, applyBy: r.apply_by, published: r.published,
        createdAt: r.created_at, interested: r.interested, isInterested: r.is_interested, isMine: r.is_mine,
        skills: r.skills ?? [], myMatch: r.my_match,
      }));
    },
    async saveOpening(companyId, o, id) {
      const row = {
        title: o.title.trim(), contract: o.contract, function: o.function.trim(), location: o.location.trim(),
        description: o.description.trim(), apply_url: o.applyUrl.trim(), apply_by: o.applyBy || null, published: o.published, skills: o.skills,
      };
      if (id) ok(await sb.from('openings').update(row).eq('id', id));
      else ok(await sb.from('openings').insert({ company_id: companyId, ...row }));
      emit();
    },
    async deleteOpening(id) {
      ok(await sb.from('openings').delete().eq('id', id));
      emit();
    },
    async setOpeningInterest(id, interested) {
      maybe(await sb.rpc('set_opening_interest', { oid: id, interested }));
      emit();
    },
    async listOpeningInterest(id) {
      const rows = check<{ candidate_id: string; name: string; school: string; programme: string; graduation_year: number | null; interested_at: string; matched: number; matched_skills: string[] | null }[]>(
        await sb.rpc('opening_interested', { oid: id }));
      return rows.map((r) => ({
        candidateId: r.candidate_id, name: r.name, school: r.school, programme: r.programme, graduationYear: r.graduation_year, interestedAt: r.interested_at, matched: r.matched ?? 0, matchedSkills: r.matched_skills ?? [],
      }));
    },
    async bookSlot(slotId) {
      maybe(await sb.rpc('book_slot', { slot: slotId }));
      emit();
    },
    async cancelBooking(slotId) {
      maybe(await sb.rpc('cancel_slot_booking', { slot: slotId }));
      emit();
    },

    async sendAccessCode(email, kind) {
      const { error } = await sb.functions.invoke('send-access-code', {
        body: { email, kind, siteUrl: window.location.origin + window.location.pathname },
      });
      if (!error) return;
      const status = error instanceof FunctionsHttpError ? error.context.status : 0;
      if (status === 404 && !(error instanceof FunctionsHttpError && (await error.context.clone().json().catch(() => null))?.error)) {
        throw new Error('E-mail sending is not installed yet. Copy the code and send it yourself for now.');
      }
      const body = error instanceof FunctionsHttpError ? await error.context.json().catch(() => null) : null;
      throw new Error(body?.error ?? 'E-mail sending is not installed yet. Copy the code and send it yourself for now.');
    },
    async listAdmins() {
      const rows = check<{ email: string; signed_in: boolean; access_code: string | null; is_owner?: boolean }[]>(await sb.rpc('list_admins'));
      return rows.map((r) => ({ email: r.email, signedIn: r.signed_in, accessCode: r.access_code, isOwner: Boolean(r.is_owner) }));
    },
    async setOwner(email, owner) {
      ok(await sb.rpc('set_owner', { target_email: email, owner }));
      emit();
    },
    async deleteCandidate(candidateId) {
      await sb.storage.from('cvs').remove([`${candidateId}/cv.pdf`]); // no file is fine
      ok(await sb.rpc('delete_candidate', { cid: candidateId }));
      emit();
    },
    async deleteCompany(companyId) {
      ok(await sb.rpc('delete_company', { co: companyId }));
      emit();
    },
    async getSettings() {
      const { data, error } = await sb.from('site_settings').select('key,value');
      if (error || !data) return {};
      return Object.fromEntries(data.map((r) => [r.key, r.value]));
    },
    async saveSettings(values) {
      const rows = Object.entries(values).map(([key, value]) => ({ key, value: String(value ?? '').trim(), updated_at: new Date().toISOString() }));
      const res = await sb.from('site_settings').upsert(rows);
      if (res.error && /site_settings/.test(res.error.message)) throw new Error('Run the SQL update 012 in Supabase first (it creates the settings).');
      ok(res);
      emit();
    },
    async addAdmin(email) {
      check(await sb.rpc('add_admin', { new_email: email }).then((r) => ({ ...r, data: true })));
      emit();
    },
    async removeAdmin(email) {
      check(await sb.rpc('remove_admin', { old_email: email }).then((r) => ({ ...r, data: true })));
      emit();
    },
    async getTalentPool() {
      const rows = check<{
        school: string; programme: string; graduation_year: number | null; gender: TalentRow['gender']; years_experience: number | null;
        past_sectors: string[]; functions: string[]; sectors: string[]; countries: string; worked_countries: string; languages: string[];
        position_type: TalentRow['positionType']; complete: boolean; consented: boolean; visible: boolean;
      }[]>(await sb.rpc('admin_talent_pool'));
      return rows.map((r) => ({
        school: r.school, programme: r.programme, graduationYear: r.graduation_year, gender: r.gender, yearsExperience: r.years_experience,
        pastSectors: r.past_sectors ?? [], functions: r.functions ?? [], sectors: r.sectors ?? [], countries: r.countries ?? '',
        workedCountries: r.worked_countries ?? '', languages: r.languages ?? [], positionType: r.position_type,
        complete: r.complete, consented: r.consented, visible: r.visible,
      }));
    },
    async getDashboard() {
      return check(await sb.rpc('admin_dashboard'));
    },
    async listSchools() {
      const { data, error } = await sb.from('schools').select('name').order('name');
      // Until migration 008 has run (no table yet), keep the built-in list.
      if (error || !data?.length) return [...SCHOOLS].sort((a, b) => a.localeCompare(b));
      return data.map((r) => r.name as string);
    },
    async addSchool(name) {
      const res = await sb.from('schools').insert({ name: name.trim() });
      if (res.error?.code === '23505') throw new Error('This school is already in the list.');
      if (res.error && /schools/.test(res.error.message) && /exist/.test(res.error.message)) {
        throw new Error('Run the SQL update 008 in Supabase first (it creates the schools list).');
      }
      ok(res);
      emit();
    },
    async removeSchool(name) {
      ok(await sb.from('schools').delete().eq('name', name));
      emit();
    },
    async listOptions(kind) {
      const { data, error } = await sb.from('profile_options').select('name').eq('kind', kind).order('name');
      // Until migration 011 has run (no table yet), keep the built-in lists.
      if (error || !data?.length) return [...BUILTIN_OPTIONS[kind]];
      return data.map((r) => r.name as string);
    },
    async addOption(kind, name) {
      const res = await sb.from('profile_options').insert({ kind, name: name.trim() });
      if (res.error?.code === '23505') throw new Error('Already in the list.');
      if (res.error && /profile_options/.test(res.error.message)) throw new Error('Run the SQL update 011 in Supabase first (it creates these lists).');
      ok(res);
      emit();
    },
    async removeOption(kind, name) {
      ok(await sb.from('profile_options').delete().eq('kind', kind).eq('name', name));
      emit();
    },
    async listAllCandidates() {
      const rows = check(await withCols((cols) => sb.from('candidates').select(cols).order('updated_at', { ascending: false }))) as unknown as CandidateRow[];
      const consents = check<{ candidate_id: string; version: string; given_at: string }[]>(
        await sb.from('consents').select('candidate_id,version,given_at').is('withdrawn_at', null),
      );
      const byId = new Map(consents.map((k) => [k.candidate_id, { version: k.version, givenAt: k.given_at }]));
      return rows.map((r) => toCandidate(r, byId.get(r.id) ?? null));
    },
    async listSchoolEntries() {
      const full = await sb.from('schools').select('name,logo_url,show_on_site').order('name');
      if (!full.error && full.data?.length) {
        return full.data.map((r) => ({ name: r.name as string, logoUrl: (r.logo_url as string | null) ?? null, showOnSite: Boolean(r.show_on_site) }));
      }
      // Before migration 010 (no logo columns) or 008 (no table): names only.
      return (await this.listSchools()).map((name) => ({ name, logoUrl: null, showOnSite: false }));
    },
    async uploadLogo(target, file) {
      if (!/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error('Use a PNG, JPEG or WebP image.');
      if (file.size > 1024 * 1024) throw new Error('This image is over 1 MB. Export a smaller version.');
      const key = target.kind === 'company' ? target.id : target.name;
      const slug = key.normalize('NFD').replace(/[^\w]+/g, '-').toLowerCase().slice(0, 60);
      const path = `${target.kind}/${slug}-${Date.now()}.${file.type.split('/')[1]}`;
      const up = await sb.storage.from('logos').upload(path, file, { contentType: file.type, upsert: true });
      if (up.error) {
        throw new Error(/bucket/i.test(up.error.message) ? 'Run the SQL update 010 in Supabase first (it creates the logo storage).' : up.error.message);
      }
      const url = sb.storage.from('logos').getPublicUrl(path).data.publicUrl;
      if (target.kind === 'company') ok(await sb.from('companies').update({ logo_url: url }).eq('id', target.id));
      else ok(await sb.from('schools').update({ logo_url: url }).eq('name', target.name));
      emit();
    },
    async setShowOnSite(target, show) {
      if (target.kind === 'company') ok(await sb.from('companies').update({ show_on_site: show }).eq('id', target.id));
      else ok(await sb.from('schools').update({ show_on_site: show }).eq('name', target.name));
      emit();
    },
    async getPartners() {
      const { data, error } = await sb.rpc('public_partners');
      if (error || !data) return { companies: [], schools: [] };
      return data as { companies: { name: string; logoUrl: string }[]; schools: { name: string; logoUrl: string }[] };
    },
    async addCompany(name) {
      const res = await sb.from('companies').insert({ name: name.trim() }).select('id,name').single();
      if (res.error?.message.includes('duplicate')) throw new Error('This company already exists.');
      return changed(check(res));
    },
    async listCompanies() {
      const full = await sb.from('companies').select('id,name,logo_url,show_on_site').order('name');
      if (!full.error) {
        return (full.data ?? []).map((r) => ({ id: r.id as string, name: r.name as string, logoUrl: (r.logo_url as string | null) ?? null, showOnSite: Boolean(r.show_on_site) }));
      }
      // Before migration 010: no logo columns yet.
      return check(await sb.from('companies').select('id,name').order('name'));
    },
    async getCompany(id) {
      const full = await sb.from('companies').select('id,name,logo_url,about,website,sector,locations').eq('id', id).maybeSingle();
      if (!full.error) {
        const r = full.data;
        return r ? { id: r.id, name: r.name, logoUrl: r.logo_url ?? null, about: r.about, website: r.website, sector: r.sector, locations: r.locations } : null;
      }
      return maybe(await sb.from('companies').select('id,name').eq('id', id).maybeSingle());
    },
    async listFairCompanies() {
      const rows = check<{
        id: string; name: string; logo_url: string | null; about: string; website: string; sector: string; locations: string;
        sessions: FairCompany['sessions']; interview_slots: number; free_slots: number; interview_days: FairCompany['interviewDays']; openings: number;
      }[]>(await sb.rpc('list_fair_companies'));
      return rows.map((r) => ({
        id: r.id, name: r.name, logoUrl: r.logo_url, about: r.about, website: r.website, sector: r.sector, locations: r.locations,
        sessions: r.sessions ?? [], interviewSlots: r.interview_slots, freeSlots: r.free_slots, interviewDays: r.interview_days ?? [], openings: r.openings,
      }));
    },
    async saveCompanyPage(companyId, p) {
      maybe(await sb.rpc('save_company_page', { cid: companyId, p_about: p.about, p_website: p.website, p_sector: p.sector, p_locations: p.locations }));
      emit();
    },
    async listInvitations() {
      const rows = check<{ id: string; email: string; company_id: string; status: InvitationStatus; created_at: string; access_code: string | null }[]>(
        await sb.from('invitations').select('id,email,company_id,status,created_at,access_code').order('created_at', { ascending: false }),
      );
      return rows.map((r) => ({ id: r.id, email: r.email, companyId: r.company_id, status: r.status, createdAt: r.created_at, accessCode: r.access_code }));
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
          accessCode: r.access_code, emailSent: Boolean(data.emailSent),
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
          .select('id,email,company_id,status,created_at,access_code')
          .single(),
      );
      return changed({ id: r.id, email: r.email, companyId: r.company_id, status: r.status, createdAt: r.created_at, accessCode: r.access_code, emailSent: false });
    },
  };
}
