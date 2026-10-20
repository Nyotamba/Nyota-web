import { createDemoDb } from './demoAdapter';
import { createSupabaseDb } from './supabaseAdapter';
import type { NyotaDb } from './types';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

// Live database when Supabase is configured (.env.local / Vercel env vars); otherwise the demo.
// The Claude preview build (mode "artifact") always uses the demo: it cannot reach other servers.
export const db: NyotaDb = url && key && import.meta.env.MODE !== 'artifact' ? createSupabaseDb(url, key) : createDemoDb();
export * from './types';
