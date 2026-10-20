// Supabase Edge Function: an admin e-mails someone their Nyota access code (new admin or invited company member).
// Sends with Gmail (SMTP over port 465) or, if configured instead, Brevo's e-mail API.
// Secrets to set once (Supabase → Edge Functions → Secrets):
//   Gmail:  GMAIL_USER (the Gmail address) + GMAIL_APP_PASSWORD (a Google "app password", 16 letters)
//   Brevo:  BREVO_API_KEY + SENDER_EMAIL (a sender verified in Brevo)
//   Optional: SITE_URL (defaults to the address the admin is using).
// Deploy: npx supabase functions deploy send-access-code --project-ref <ref>
import { createClient } from 'npm:@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@6';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: role } = await caller.rpc('my_role');
    if (role !== 'admin') return json({ error: 'Only club admins can send access codes.' }, 403);

    const gmailUser = Deno.env.get('GMAIL_USER');
    const gmailPass = Deno.env.get('GMAIL_APP_PASSWORD')?.replace(/\s+/g, '');
    const apiKey = Deno.env.get('BREVO_API_KEY');
    const sender = Deno.env.get('SENDER_EMAIL');
    if (!(gmailUser && gmailPass) && !(apiKey && sender)) {
      return json({ error: 'E-mail sending is not set up yet: add GMAIL_USER and GMAIL_APP_PASSWORD in Supabase → Edge Functions → Secrets.' }, 501);
    }

    const { email, kind, siteUrl } = await req.json();
    const to = String(email ?? '').trim().toLowerCase();
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

    // Look the code up server-side: the browser never chooses what is sent.
    let code: string | null = null;
    let company: string | null = null;
    if (kind === 'admin') {
      const { data } = await admin.from('admin_emails').select('access_code').eq('email', to).maybeSingle();
      code = data?.access_code ?? null;
    } else {
      const { data } = await admin.from('invitations').select('access_code, companies(name)').eq('email', to)
        .order('created_at', { ascending: false }).limit(1).maybeSingle();
      code = data?.access_code ?? null;
      company = (data?.companies as { name?: string } | null)?.name ?? null;
    }
    if (!code) return json({ error: 'No access code found for this e-mail address.' }, 404);

    const site = String(Deno.env.get('SITE_URL') ?? siteUrl ?? '').replace(/\/$/, '');
    const signIn = `${site}/#/sign-in`;
    const who = kind === 'admin' ? 'a club admin of the Nyota Africa Career Fair' : `${company ?? 'your company'}'s space on the Nyota Africa Career Fair`;
    const html = `
<div style="font-family:Montserrat,Arial,sans-serif;color:#053129;max-width:520px;margin:0 auto;padding:24px">
  <div style="background:#053129;color:#F8F7F2;padding:16px 24px;border-radius:12px 12px 0 0;font-weight:700;letter-spacing:1px">NYOTA</div>
  <div style="border:1px solid #EAE2CD;border-top:0;border-radius:0 0 12px 12px;padding:24px">
    <h1 style="font-size:20px;margin:0 0 12px">Your access code</h1>
    <p style="font-size:15px;line-height:1.6;color:#4E6C65">You have been invited as ${esc(who)}. Create your account with this e-mail address (${esc(to)}), a password of your choice and this code:</p>
    <p style="font-size:26px;font-weight:700;letter-spacing:4px;background:#EAE2CD;border-radius:8px;padding:12px 16px;display:inline-block">${esc(code)}</p>
    <p><a href="${esc(signIn)}" style="display:inline-block;padding:12px 22px;background:#053129;color:#fff;border-radius:999px;text-decoration:none;font-weight:700">Create my account</a></p>
    <p style="font-size:13px;color:#4E6C65">On the sign-in page, choose “Create my account”. The code only works with this e-mail address.</p>
  </div>
</div>`;
    if (gmailUser && gmailPass) {
      // Port 465 (TLS): Supabase Edge Functions block ports 25 and 587.
      const transport = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user: gmailUser, pass: gmailPass } });
      try {
        await transport.sendMail({ from: `"Nyota Africa Career Fair" <${gmailUser}>`, to, subject: 'Your Nyota access code', html });
      } catch (e) {
        return json({ error: `Gmail refused the e-mail: ${(e as Error).message}` }, 502);
      }
      return json({ sent: true });
    }
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: 'Nyota Africa Career Fair', email: sender },
        to: [{ email: to }],
        subject: 'Your Nyota access code',
        htmlContent: html,
      }),
    });
    if (!res.ok) return json({ error: `The e-mail could not be sent (${res.status}): ${await res.text()}` }, 502);
    return json({ sent: true });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
