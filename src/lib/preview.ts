// Admin preview: see the student or company side with sample data, without changing account.
// It opens in its own browser tab, so the admin's tab always stays on the real site. While the flag is on,
// that tab runs on the demo store: nothing real is read or written.

export type PreviewRole = 'student' | 'company';
const KEY = 'nyota-preview';
const HOME: Record<PreviewRole, string> = { student: '#/student/profile', company: '#/company/page' };
const isRole = (v: string | null): v is PreviewRole => v === 'student' || v === 'company';

export function previewRole(): PreviewRole | null {
  try {
    const asked = new URLSearchParams(window.location.search).get('preview');
    if (isRole(asked)) sessionStorage.setItem(KEY, asked);
    const v = sessionStorage.getItem(KEY);
    return isRole(v) ? v : null;
  } catch {
    return null;
  }
}

const url = (role: PreviewRole) => `${window.location.pathname}?preview=${role}${HOME[role]}`;

/** From the admin: a new tab. */
export function startPreview(role: PreviewRole) {
  window.open(url(role), '_blank', 'noopener');
}

/** Inside the preview tab: student side to company side, and back. */
export function switchPreview(role: PreviewRole) {
  window.location.assign(url(role));
}

export function exitPreview() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* nothing to remove */
  }
  window.close();
  // Tabs the browser refuses to close land back on the real site.
  window.location.replace(`${window.location.pathname}#/admin`);
}
