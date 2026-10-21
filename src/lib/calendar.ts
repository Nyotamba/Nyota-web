// "Add to calendar" for sessions and interviews: Google, Outlook (web) and an .ics file (Apple Calendar, Outlook desktop).
// The event points to the Nyota page, never to the video link itself: that link is only given out 15 min before.

export interface CalendarEvent {
  title: string;
  startsAt: string; // ISO
  durationMin: number;
  details: string;
  pagePath: string; // e.g. "/student/sessions"
}

const pageUrl = (path: string) => `${window.location.origin}${window.location.pathname}#${path}`;
const endOf = (e: CalendarEvent) => new Date(Date.parse(e.startsAt) + e.durationMin * 60_000);
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); // 20270216T170000Z
const body = (e: CalendarEvent) => `${e.details}\n\nJoin from Nyota (the video link appears 15 minutes before): ${pageUrl(e.pagePath)}`;

export function googleCalendarUrl(e: CalendarEvent) {
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates: `${stamp(new Date(e.startsAt))}/${stamp(endOf(e))}`,
    details: body(e),
    location: pageUrl(e.pagePath),
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}

export function outlookCalendarUrl(e: CalendarEvent) {
  const q = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: e.title,
    startdt: new Date(e.startsAt).toISOString(),
    enddt: endOf(e).toISOString(),
    body: body(e),
    location: pageUrl(e.pagePath),
  });
  return `https://outlook.office.com/calendar/0/deeplink/compose?${q}`;
}

const icsText = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, (m) => `\\${m}`);

const vevent = (e: CalendarEvent) => [
  'BEGIN:VEVENT',
  `UID:${Date.parse(e.startsAt)}-${e.title.replace(/\W+/g, '-').toLowerCase()}@nyota.mba`,
  `DTSTAMP:${stamp(new Date())}`,
  `DTSTART:${stamp(new Date(e.startsAt))}`,
  `DTEND:${stamp(endOf(e))}`,
  `SUMMARY:${icsText(e.title)}`,
  `DESCRIPTION:${icsText(body(e))}`,
  `URL:${pageUrl(e.pagePath)}`,
  'BEGIN:VALARM', 'TRIGGER:-PT15M', 'ACTION:DISPLAY', `DESCRIPTION:${icsText(e.title)}`, 'END:VALARM',
  'END:VEVENT',
];

/** One event, or a whole agenda in one file (same UID per event, so importing again updates instead of duplicating). */
export function downloadIcs(e: CalendarEvent | CalendarEvent[], fileName?: string) {
  const list = Array.isArray(e) ? e : [e];
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Nyota Africa Career Fair//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    ...list.flatMap(vevent),
    'END:VCALENDAR',
  ].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  a.download = fileName ?? `${list[0].title.replace(/[^\w -]+/g, '').slice(0, 60) || 'nyota-session'}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
