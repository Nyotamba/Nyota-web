// Fair times are shown in Barcelona time (brand book: "7:00 PM – 9:00 PM CEST", "Monday, 28 September 2026").
export const FAIR_TZ = 'Europe/Madrid';

/** Minutes east of UTC for Barcelona at a given instant (60 in winter, 120 in summer). */
function offsetMinutes(at: Date) {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: FAIR_TZ, timeZoneName: 'shortOffset' })
    .formatToParts(at)
    .find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+1';
  const m = name.match(/GMT([+-])(\d+)(?::(\d+))?/);
  return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0)) : 60;
}
export const tzLabel = (at: Date) => (offsetMinutes(at) === 120 ? 'CEST' : 'CET');

/** "YYYY-MM-DDTHH:mm" typed as Barcelona time → ISO instant. */
export function fairInputToIso(value: string) {
  const asUtc = Date.parse(`${value}:00Z`);
  let t = asUtc - offsetMinutes(new Date(asUtc)) * 60_000;
  t = asUtc - offsetMinutes(new Date(t)) * 60_000; // second pass settles DST edges
  return new Date(t).toISOString();
}

/** ISO instant → "YYYY-MM-DDTHH:mm" in Barcelona time, for datetime-local inputs. */
export function isoToFairInput(iso: string) {
  const d = new Date(iso);
  const local = new Date(d.getTime() + offsetMinutes(d) * 60_000);
  return local.toISOString().slice(0, 16);
}

const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => new Date(iso).toLocaleString('en-GB', { timeZone: FAIR_TZ, ...o });
const clock = (d: Date) => d.toLocaleString('en-US', { timeZone: FAIR_TZ, hour: 'numeric', minute: '2-digit' });

/** "Tuesday, 16 February 2027" */
export const fairDay = (iso: string) => fmt(iso, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
/** "7:00 PM – 7:45 PM CET" */
export function fairTimeRange(iso: string, durationMin: number) {
  const start = new Date(iso);
  const end = new Date(start.getTime() + durationMin * 60_000);
  return `${clock(start)} – ${clock(end)} ${tzLabel(start)}`;
}
/** Sort/group key: the Barcelona calendar day. */
export const fairDayKey = (iso: string) => isoToFairInput(iso).slice(0, 10);

/** Video links open from 15 minutes before the start until 30 minutes after the end. */
export function joinWindow(iso: string, durationMin: number, now = Date.now()) {
  const start = Date.parse(iso);
  const opens = start - 15 * 60_000;
  const closes = start + (durationMin + 30) * 60_000;
  return { open: now >= opens && now <= closes, upcoming: now < opens, over: now > closes, opensAt: opens };
}
