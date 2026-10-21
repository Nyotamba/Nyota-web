// Admin preview: see the student or company side with sample data, without changing account.
// The flag lives in this tab only (sessionStorage); while it is on, the app runs on the demo store,
// so nothing real is read or written. The admin stays signed in underneath.

export type PreviewRole = 'student' | 'company';
const KEY = 'nyota-preview';

export function previewRole(): PreviewRole | null {
  try {
    const v = sessionStorage.getItem(KEY);
    return v === 'student' || v === 'company' ? v : null;
  } catch {
    return null;
  }
}

const reloadAt = (hash: string) => {
  window.location.hash = hash;
  window.location.reload();
};

export function startPreview(role: PreviewRole) {
  try {
    sessionStorage.setItem(KEY, role);
  } catch {
    return;
  }
  reloadAt(role === 'student' ? '#/student/profile' : '#/company/candidates');
}

export function exitPreview() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* nothing to remove */
  }
  reloadAt('#/admin');
}
