import { db, type SiteSettings } from './db';
import { useDbQuery } from './useDb';
import { CLUB_EMAIL, CONSENT_TEXT, CONSENT_VERSION, FORUM_DATE, FORUM_NAME, FORUM_VENUE, FORUM_YEAR } from '../config/constants';

export const DEFAULT_SETTINGS: SiteSettings = {
  forum_name: FORUM_NAME,
  forum_date: FORUM_DATE,
  forum_venue: FORUM_VENUE,
  forum_year: FORUM_YEAR,
  club_email: CLUB_EMAIL,
  instagram_url: '',
  consent_version: CONSENT_VERSION,
  consent_text: CONSENT_TEXT,
  hero_title: 'Where Europe’s MBA talent meets Africa’s employers.',
  hero_text:
    'Nyota is an association of MBA students from business schools across Europe, including {schools}. Over two days, companies hiring for Africa present their work and meet candidates.',
};

/** Site texts and fair details edited by owners (Owner → Settings), with the built-in defaults as fallback. */
export function useSettingsQuery(): { settings: SiteSettings; loaded: boolean } {
  const { data, error } = useDbQuery(() => db.getSettings());
  const settings = { ...DEFAULT_SETTINGS };
  for (const [k, v] of Object.entries(data ?? {})) if (v) (settings as Record<string, string>)[k] = v;
  return { settings, loaded: data !== undefined || Boolean(error) };
}
export const useSettings = (): SiteSettings => useSettingsQuery().settings;
