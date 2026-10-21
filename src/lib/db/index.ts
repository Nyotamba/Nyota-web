import { createDemoDb } from './demoAdapter';
import { createSupabaseDb } from './supabaseAdapter';
import { previewRole } from '../preview';
import type { NyotaDb } from './types';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

function pick(): NyotaDb {
  // Admin preview of the student / company side: sample data only, fresh each time.
  const preview = previewRole();
  if (preview) {
    const demo = createDemoDb('-preview');
    demo.resetDemo();
    demo.signInDemo(preview);
    return demo;
  }
  // Live database when Supabase is configured (.env.local / Vercel env vars); otherwise the demo.
  // The Claude preview build (mode "artifact") always uses the demo: it cannot reach other servers.
  return url && key && import.meta.env.MODE !== 'artifact' ? createSupabaseDb(url, key) : createDemoDb();
}

export const db: NyotaDb = pick();
export const isPreview = previewRole() !== null;
export * from './types';
