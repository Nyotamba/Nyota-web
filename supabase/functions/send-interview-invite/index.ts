// Supabase Edge Function: when a student books an interview slot, the student and the company each receive a calendar invite.
// Each person gets their own email, so the student's address is never shown to the company.
// The invite points to the Nyota page, never to the video link itself (it is only given out 15 minutes before).
// Uses the same Gmail secrets as send-access-code: GMAIL_USER and GMAIL_APP_PASSWORD. Optional: SITE_URL.
import { createClient } from 'npm:@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@6';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const ics = (s: string) => s.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/[,;]/g, (m) => `\\${m}`);
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: me } = await caller.rpc('my_candidate');
    if (!me) return json({ error: 'Only students can send interview invites.' }, 403);

    const gmailUser = Deno.env.get('GMAIL_USER');
    const gmailPass = Deno.env.get('GMAIL_APP_PASSWORD')?.replace(/\s+/g, '');
    if (!gmailUser || !gmailPass) return json({ error: 'Email sending is not set up.' }, 501);

    const { slotId } = await req.json();
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
    const { data: slot } = await admin.from('interview_slots')
      .select('id, company_id, candidate_id, starts_at, duration_min, companies(name)').eq('id', slotId).maybeSingle();
    // Only the student who holds this slot can trigger its invites.
    if (!slot || slot.candidate_id !== me) return json({ error: 'This slot is not booked by you.' }, 403);

    const { data: student } = await admin.from('candidates').select('first_name, last_name, email').eq('id', me).single();
    const { data: team } = await admin.from('profiles').select('email').eq('company_id', slot.company_id).eq('role', 'company');
    const company = (slot.companies as { name?: string } | null)?.name ?? 'the company';
    const studentName = `${student?.first_name ?? ''} ${student?.last_name ?? ''}`.trim() || 'A candidate';
    const site = String(Deno.env.get('SITE_URL') ?? 'https://nyota-mba.vercel.app').replace(/\/$/, '');
    const start = new Date(slot.starts_at);
    const end = new Date(start.getTime() + slot.duration_min * 60_000);
    const when = start.toLocaleString('en-GB', { timeZone: 'Europe/Madrid', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

    const send = (to: string, title: string, path: string) => {
      const page = `${site}/#${path}`;
      const event = [
        'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Nyota Africa Career Fair//EN', 'CALSCALE:GREGORIAN', 'METHOD:REQUEST',
        'BEGIN:VEVENT', `UID:${slot.id}-${stamp(start)}@nyota.mba`, `DTSTAMP:${stamp(new Date())}`,
        `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`, `SUMMARY:${ics(title)}`,
        `DESCRIPTION:${ics(`Join from Nyota. The video link appears 15 minutes before: ${page}`)}`, `LOCATION:${ics(page)}`,
        `ORGANIZER;CN=Nyota:mailto:${gmailUser}`, `ATTENDEE;RSVP=TRUE:mailto:${to}`,
        'STATUS:CONFIRMED', 'END:VEVENT', 'END:VCALENDAR',
      ].join('\r\n');
      const html = `<div style="font-family:Montserrat,Arial,sans-serif;color:#053129;max-width:520px;margin:0 auto;padding:24px">
  <h1 style="font-size:20px;margin:0 0 12px">${esc(title)}</h1>
  <p style="font-size:15px;line-height:1.6;color:#4E6C65">${esc(when)} (Barcelona time). The invite is attached for your calendar.</p>
  <p><a href="${esc(page)}" style="display:inline-block;padding:12px 22px;background:#053129;color:#fff;border-radius:999px;text-decoration:none;font-weight:700">Open Nyota</a></p>
</div>`;
      return transport.sendMail({
        from: `"Nyota Africa Career Fair" <${gmailUser}>`, to, subject: title, html,
        icalEvent: { method: 'REQUEST', filename: 'nyota-interview.ics', content: event },
      });
    };
    // Port 465 (TLS): Supabase Edge Functions block ports 25 and 587.
    const transport = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user: gmailUser, pass: gmailPass } });

    const sends = [
      ...(student?.email ? [send(student.email, `Nyota interview with ${company}`, '/student/meetings')] : []),
      ...(team ?? []).map((m) => send(m.email, `Nyota interview with ${studentName}`, '/company/meetings')),
    ];
    const results = await Promise.allSettled(sends);
    return json({ sent: results.filter((r) => r.status === 'fulfilled').length, failed: results.filter((r) => r.status === 'rejected').length });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
