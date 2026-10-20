import { downloadIcs, googleCalendarUrl, outlookCalendarUrl, type CalendarEvent } from '../lib/calendar';
import { Calendar } from './icons';

export function AddToCalendar({ event }: { event: CalendarEvent }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1.5 text-[13px] font-semibold text-muted"><Calendar size={14} />Add to calendar</span>
      <div className="flex flex-wrap gap-1.5">
        <a href={googleCalendarUrl(event)} target="_blank" rel="noreferrer" className="btn-small text-[13px]">Google</a>
        <a href={outlookCalendarUrl(event)} target="_blank" rel="noreferrer" className="btn-small text-[13px]">Outlook</a>
        <button type="button" onClick={() => downloadIcs(event)} className="btn-small text-[13px]">Apple / .ics</button>
      </div>
    </div>
  );
}
