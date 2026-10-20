import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { StudentShell } from './StudentShell';
import { ChipGroup } from '../../components/Chip';
import { Notice } from '../../components/Notice';
import { Check, FileIcon } from '../../components/icons';
import { db, type Candidate, type CandidateProfileInput, type PositionType } from '../../lib/db';
import { useDbQuery } from '../../lib/useDb';
import { useSession } from '../../App';
import { formatDate, formatKb, isProfileComplete, isVisible } from '../../lib/candidate';
import {
  CONSENT_TEXT, CONSENT_VERSION, FORUM_NAME, CV_MAX_BYTES, FORUM_YEAR, FUNCTIONS, LANGUAGES, POSITION_TYPES, REGIONS, SCHOOLS, SECTORS, STORY_MAX_CHARS,
} from '../../config/constants';

const toInput = (c: Candidate): CandidateProfileInput => ({
  firstName: c.firstName, lastName: c.lastName, school: c.school, programme: c.programme, graduationYear: c.graduationYear,
  linkedinUrl: c.linkedinUrl, functions: c.functions, sectors: c.sectors, regions: c.regions, countries: c.countries,
  languages: c.languages, positionType: c.positionType, availableFrom: c.availableFrom, story: c.story,
});

export default function StudentProfile() {
  const session = useSession();
  const id = session!.candidateId!;
  const { data: cand } = useDbQuery(() => db.getCandidate(id), [id]);
  const [form, setForm] = useState<CandidateProfileInput | null>(null);
  const [notice, setNotice] = useState<{ msg: string; tone: 'green' | 'danger' } | null>(null);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cand && !form) setForm(toInput(cand));
  }, [cand, form]);

  if (!cand || !form) return <StudentShell><p className="p-10 text-muted">Loading your profile…</p></StudentShell>;

  const set = <K extends keyof CandidateProfileInput>(k: K, v: CandidateProfileInput[K]) => setForm({ ...form, [k]: v });
  const dirty = JSON.stringify(form) !== JSON.stringify(toInput(cand));

  const save = async (e?: FormEvent) => {
    e?.preventDefault();
    try {
      await db.saveProfile(id, form);
      setNotice({ msg: 'Profile saved', tone: 'green' });
    } catch (err) {
      setNotice({ msg: `Could not save: ${(err as Error).message}`, tone: 'danger' });
    }
  };
  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      setNotice({ msg: 'Upload your CV as a PDF file.', tone: 'danger' });
      return;
    }
    if (f.size > CV_MAX_BYTES) {
      setNotice({ msg: 'This file is over 5 MB. Compress it and try again.', tone: 'danger' });
      return;
    }
    try {
      await db.setCv(id, f);
      setNotice({ msg: 'CV uploaded', tone: 'green' });
    } catch (err) {
      setNotice({ msg: `Upload failed: ${(err as Error).message}`, tone: 'danger' });
    }
  };
  const withdraw = async () => {
    await db.withdrawConsent(id);
    setConfirmWithdraw(false);
    setNotice({ msg: 'Consent withdrawn. Companies can no longer see your profile.', tone: 'green' });
  };

  return (
    <StudentShell>
      <div className="mx-auto grid max-w-page items-start gap-8 px-4 py-10 md:px-10 lg:grid-cols-12 lg:py-12 xl:px-20">
        <aside className="flex flex-col gap-5 lg:sticky lg:top-6 lg:col-span-4">
          <h1 className="m-0 font-display text-[40px] font-normal tracking-display md:text-[44px]">My profile</h1>
          <StatusCard c={cand} />
          <p className="m-0 text-sm leading-[1.55] text-muted">
            We never ask for ethnicity, religion, health, nationality or immigration status. Please leave them out of your CV too.
          </p>
        </aside>

        <form onSubmit={save} className="flex min-w-0 flex-col gap-6 lg:col-span-8">
          <Fieldset legend="About you" className="grid gap-5 sm:grid-cols-2">
            <label className="label" htmlFor="p-first">First name<input id="p-first" className="field" required value={form.firstName} onChange={(e) => set('firstName', e.target.value)} /></label>
            <label className="label" htmlFor="p-last">Last name<input id="p-last" className="field" required value={form.lastName} onChange={(e) => set('lastName', e.target.value)} /></label>
            <label className="label" htmlFor="p-school">School
              <select id="p-school" className="field" value={form.school} onChange={(e) => set('school', e.target.value)}>
                {SCHOOLS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="label" htmlFor="p-prog">Program<input id="p-prog" className="field" value={form.programme} onChange={(e) => set('programme', e.target.value)} /></label>
              <label className="label" htmlFor="p-grad">Graduation<input id="p-grad" className="field" type="number" min={2025} max={2032} value={form.graduationYear} onChange={(e) => set('graduationYear', Number(e.target.value))} /></label>
            </div>
            <label className="label sm:col-span-2" htmlFor="p-li">LinkedIn URL<input id="p-li" className="field" type="url" placeholder="https://www.linkedin.com/in/…" value={form.linkedinUrl} onChange={(e) => set('linkedinUrl', e.target.value)} /></label>
          </Fieldset>

          <Fieldset legend="What you are looking for" className="flex flex-col gap-6">
            <ChipGroup label="Target functions" options={FUNCTIONS} value={form.functions} onChange={(v) => set('functions', v)} />
            <ChipGroup label="Sectors" options={SECTORS} value={form.sectors} onChange={(v) => set('sectors', v)} />
            <ChipGroup label="African regions" options={REGIONS} value={form.regions} onChange={(v) => set('regions', v)} />
            <div className="grid gap-4 md:grid-cols-3">
              <label className="label" htmlFor="p-countries">Target countries<input id="p-countries" className="field" value={form.countries} onChange={(e) => set('countries', e.target.value)} /></label>
              <label className="label" htmlFor="p-type">Position type
                <select id="p-type" className="field" value={form.positionType} onChange={(e) => set('positionType', e.target.value as PositionType)}>
                  {POSITION_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </label>
              <label className="label" htmlFor="p-avail">Available from<input id="p-avail" className="field" type="month" value={form.availableFrom} onChange={(e) => set('availableFrom', e.target.value)} /></label>
            </div>
            <ChipGroup label="Languages" options={LANGUAGES} value={form.languages} onChange={(v) => set('languages', v)} />
          </Fieldset>

          <Fieldset legend="Your story and CV" className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="label" htmlFor="p-story">Your story, in your own words
                <textarea id="p-story" rows={5} maxLength={STORY_MAX_CHARS} className="field resize-y leading-[1.55]" value={form.story} onChange={(e) => set('story', e.target.value)} />
              </label>
              <div className="text-right text-[13px] tabular-nums text-muted">{form.story.length} / {STORY_MAX_CHARS.toLocaleString('en')} characters</div>
            </div>
            <input ref={fileRef} id="p-cv" type="file" accept="application/pdf,.pdf" className="sr-only" onChange={onFile} />
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-line-strong px-5 py-4">
              <FileIcon size={28} />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                {cand.cv ? (
                  <><span className="truncate text-[15px] font-bold">{cand.cv.name}</span><span className="text-[13px] text-muted">{formatKb(cand.cv.sizeBytes)} · PDF only, 5 MB maximum</span></>
                ) : (
                  <><span className="text-[15px] font-bold text-danger">No CV yet</span><span className="text-[13px] text-muted">PDF only, 5 MB maximum</span></>
                )}
              </div>
              <button type="button" className="btn-small" onClick={() => fileRef.current?.click()}>{cand.cv ? 'Replace' : 'Upload CV'}</button>
              {cand.cv && <button type="button" className="btn-small text-danger hover:text-danger" onClick={() => db.setCv(id, null)}>Remove</button>}
            </div>
          </Fieldset>

          <fieldset className="m-0 flex flex-col gap-4 rounded-[18px] border-2 border-ink bg-surface p-6 md:p-8">
            <legend className="px-2 text-xl font-bold">Consent</legend>
            <p className="m-0 text-[15px] leading-relaxed text-muted">{CONSENT_TEXT}</p>
            <label htmlFor="p-consent" className="flex cursor-pointer items-start gap-3 text-[15px] font-semibold leading-normal">
              <input id="p-consent" type="checkbox" className="m-0 size-[22px] shrink-0 accent-ink"
                checked={Boolean(cand.consent)}
                onChange={(e) => (e.target.checked ? db.giveConsent(id) : setConfirmWithdraw(true))} />
              I agree to share my profile and CV with the companies invited to the {FORUM_NAME} {FORUM_YEAR}.
            </label>
            {cand.consent && !confirmWithdraw && (
              <div className="text-[13px] text-muted">
                Consent {cand.consent.version} given on {formatDate(cand.consent.givenAt)} ·{' '}
                <button type="button" className="font-semibold text-accent underline hover:text-accent-hover" onClick={() => setConfirmWithdraw(true)}>Withdraw consent</button>
              </div>
            )}
            {confirmWithdraw && (
              <div role="alert" className="flex flex-col gap-3 rounded-xl bg-offwhite p-4 text-sm">
                <p className="m-0 leading-relaxed">Withdrawing hides your profile from every company straight away. If you consent again, the club will verify your profile again.</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-small border-danger text-danger hover:border-danger hover:text-danger" onClick={withdraw}>Withdraw consent</button>
                  <button type="button" className="btn-small" onClick={() => setConfirmWithdraw(false)}>Keep sharing</button>
                </div>
              </div>
            )}
            {!cand.consent && <div className="text-[13px] text-muted">Version {CONSENT_VERSION}. You can withdraw at any time.</div>}
          </fieldset>

          <div className="flex flex-wrap items-center justify-end gap-3">
            {dirty && <span className="mr-auto text-sm text-muted">You have unsaved changes.</span>}
            <Link to="/student/preview" className="btn-secondary text-base">Preview</Link>
            <button type="submit" className="btn-primary text-base" disabled={!dirty}>Save profile</button>
          </div>
        </form>
      </div>
      <Notice message={notice?.msg ?? null} tone={notice?.tone} onDone={() => setNotice(null)} />
    </StudentShell>
  );
}

function Fieldset({ legend, className, children }: { legend: string; className: string; children: React.ReactNode }) {
  return (
    <fieldset className="m-0 min-w-0 rounded-[18px] border border-line bg-surface p-6 md:p-8">
      <legend className="px-2 text-xl font-bold">{legend}</legend>
      <div className={className}>{children}</div>
    </fieldset>
  );
}

function StatusCard({ c }: { c: Candidate }) {
  const steps = [
    { label: 'Profile complete', done: isProfileComplete(c) },
    { label: 'Consent given', done: Boolean(c.consent) },
    { label: 'Verified by the club', done: Boolean(c.verifiedAt) },
    { label: 'Visible to companies', done: isVisible(c) },
  ];
  const current = steps.findIndex((s) => !s.done);
  const [title, desc] =
    current === -1 ? ['Visible to companies', 'Invited companies can now see your profile.']
    : current === 0 ? ['Profile incomplete', 'Fill in your targets and upload your CV.']
    : current === 1 ? ['Not shared yet', 'Give your consent below to share your profile.']
    : ['Waiting for verification', 'Companies will see your profile once the club has verified it.'];

  return (
    <div className="card flex flex-col gap-5 p-7">
      <div className="flex flex-col gap-1.5">
        <div className="overline">Visibility</div>
        <div className="text-xl font-bold">{title}</div>
        <div className="text-sm leading-normal text-muted">{desc}</div>
      </div>
      <ol className="m-0 flex list-none flex-col gap-3.5 p-0 text-[15px]">
        {steps.map((s, i) => (
          <li key={s.label} className={`flex items-center gap-3 ${!s.done && i !== current ? 'text-muted' : ''}`}>
            {s.done ? (
              <span className="flex size-[26px] items-center justify-center rounded-full bg-green text-white"><Check size={14} /></span>
            ) : i === current ? (
              <span className="size-[26px] rounded-full border-2 border-dashed border-accent" />
            ) : (
              <span className="size-[26px] rounded-full border-2 border-line-strong" />
            )}
            <span className={i === current ? 'font-bold' : ''}>{s.label}</span>
            <span className="sr-only">{s.done ? '(done)' : i === current ? '(current step)' : '(to do)'}</span>
          </li>
        ))}
      </ol>
      <Link to="/student/preview" className="btn rounded-xl border border-line-strong text-[15px] text-ink hover:border-ink hover:text-ink">Preview as a company</Link>
    </div>
  );
}
