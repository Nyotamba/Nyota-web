import { useEffect, useState, type FormEvent } from 'react';
import { AdminShell } from './AdminShell';
import { Notice } from '../../components/Notice';
import { db, type SiteSettings } from '../../lib/db';
import { useSettingsQuery } from '../../lib/useSettings';

const FIELDS: { key: keyof SiteSettings; label: string; help?: string; long?: boolean }[] = [
  { key: 'forum_name', label: 'Fair name' },
  { key: 'forum_date', label: 'Dates', help: 'Shown as written, e.g. 16–19 February 2027.' },
  { key: 'forum_venue', label: 'Venue', help: 'e.g. Online, or Room | Campus | City.' },
  { key: 'forum_year', label: 'Year' },
  { key: 'club_email', label: 'Club contact e-mail' },
  { key: 'retention_months', label: 'Months before profiles are deleted after the fair', help: 'Must match the privacy notice approved by the DPO.' },
  { key: 'hero_title', label: 'Homepage headline', help: 'The last two words are highlighted in orange.' },
  { key: 'hero_text', label: 'Homepage introduction', long: true },
];

/** Owners only: fair details, homepage texts and the consent text students accept. */
export default function OwnerSettings() {
  const { settings: current, loaded: ready } = useSettingsQuery();
  const [form, setForm] = useState<SiteSettings>(current);
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState<{ msg: string; tone?: 'green' | 'danger' } | null>(null);
  const consentChanged = loaded && (form.consent_text !== current.consent_text);
  const versionBumped = form.consent_version !== current.consent_version;

  useEffect(() => {
    if (!loaded && ready) {
      setForm(current);
      setLoaded(true);
    }
  }, [current, loaded, ready]);

  const set = (k: keyof SiteSettings, v: string) => setForm({ ...form, [k]: v });
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (consentChanged && !versionBumped) {
      setNotice({ msg: 'You changed the consent text: give it a new version (e.g. v2) so each student’s consent stays traceable.', tone: 'danger' });
      return;
    }
    try {
      await db.saveSettings(form);
      setNotice({ msg: 'Settings saved. The site uses them right away.' });
    } catch (err) {
      setNotice({ msg: (err as Error).message, tone: 'danger' });
    }
  };

  return (
    <AdminShell>
      <form onSubmit={save} className="mx-auto flex max-w-[860px] flex-col gap-6 px-4 py-10 md:px-10">
        <div className="flex flex-col gap-1">
          <h1 className="m-0 font-display text-[34px] tracking-display md:text-[40px]">Settings</h1>
          <div className="text-[15px] text-muted">Owners only. What you change here appears on the site straight away.</div>
        </div>

        <fieldset className="card m-0 flex flex-col gap-5 p-6 md:p-8">
          <legend className="px-2 text-xl font-bold">Fair and homepage</legend>
          {FIELDS.map((f) => (
            <label key={f.key} className="label" htmlFor={`set-${f.key}`}>{f.label}
              {f.long ? (
                <textarea id={`set-${f.key}`} rows={4} className="field resize-y leading-relaxed" value={form[f.key]} onChange={(e) => set(f.key, e.target.value)} />
              ) : (
                <input id={`set-${f.key}`} className="field" value={form[f.key]} onChange={(e) => set(f.key, e.target.value)} />
              )}
              {f.help && <span className="text-[13px] font-normal text-muted">{f.help}</span>}
            </label>
          ))}
        </fieldset>

        <fieldset className="m-0 flex flex-col gap-5 rounded-[18px] border-2 border-ink bg-surface p-6 md:p-8">
          <legend className="px-2 text-xl font-bold">Consent text</legend>
          <p className="m-0 text-sm leading-relaxed text-muted">
            Paste the version approved by your DPO. Each student’s consent records the version they accepted, so give every new
            text a new version number.
          </p>
          <label className="label" htmlFor="set-consent_version">Version
            <input id="set-consent_version" className="field max-w-[160px]" value={form.consent_version} onChange={(e) => set('consent_version', e.target.value)} />
          </label>
          <label className="label" htmlFor="set-consent_text">Text shown to students
            <textarea id="set-consent_text" rows={8} className="field resize-y leading-relaxed" value={form.consent_text} onChange={(e) => set('consent_text', e.target.value)} />
          </label>
          {consentChanged && (
            <p role="status" className={`m-0 rounded-field px-4 py-3 text-sm ${versionBumped ? 'bg-sand text-ink' : 'bg-sand text-danger'}`}>
              {versionBumped
                ? `New version ${form.consent_version}: students who consent from now on accept this text. Earlier consents keep their version.`
                : 'You changed the text: change the version too (e.g. v2) before saving.'}
            </p>
          )}
        </fieldset>

        <div className="flex justify-end">
          <button type="submit" className="btn-primary text-base">Save settings</button>
        </div>
      </form>
      <Notice message={notice?.msg ?? null} tone={notice?.tone} onDone={() => setNotice(null)} />
    </AdminShell>
  );
}
