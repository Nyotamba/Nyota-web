// Supabase Edge Function: a club admin invites a company member.
// Records the invitation (and the company if new), then e-mails the person a sign-in link.
// Deploy: npx supabase functions deploy invite-company-member --project-ref <ref>
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase at runtime.
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // 1. Only club admins may invite: checked with the caller's own session.
    const caller = createClient(url, anonKey, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
    const { data: role, error: roleError } = await caller.rpc('my_role');
    if (roleError || role !== 'admin') return json({ error: 'Only club admins can invite company members.' }, 403);
    const { data: { user } } = await caller.auth.getUser();

    // 2. Validate input.
    const body = await req.json();
    const email = String(body.email ?? '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Enter a valid work e-mail address.' }, 400);
    const redirectTo = typeof body.redirectTo === 'string' ? body.redirectTo : undefined; // checked against Supabase's allowed redirect URLs

    // 3. Record the company (if new) and the invitation, with full rights.
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
    let companyId: string | undefined = body.companyId;
    if (!companyId) {
      const name = String(body.newCompanyName ?? '').trim();
      if (!name) return json({ error: 'Enter the company name.' }, 400);
      const { data, error } = await admin.from('companies').upsert({ name }, { onConflict: 'name' }).select('id').single();
      if (error) return json({ error: error.message }, 400);
      companyId = data.id;
    }
    const { data: invitation, error: invError } = await admin
      .from('invitations')
      .upsert({ company_id: companyId, email, invited_by: user?.id ?? null }, { onConflict: 'company_id,email' })
      .select('id,email,company_id,status,created_at,access_code')
      .single();
    if (invError) return json({ error: invError.message }, 400);

    // 4. E-mail the person. New address → "Invite user" e-mail (creates the account);
    //    existing account → ordinary sign-in link.
    let emailSent = false;
    let note: string | undefined;
    const invite = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
    if (!invite.error) emailSent = true;
    else if (/already|registered|exists/i.test(invite.error.message)) {
      const otp = await createClient(url, anonKey).auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: redirectTo } });
      emailSent = !otp.error;
      note = otp.error?.message;
    } else note = invite.error.message;

    return json({ invitation, emailSent, note });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
