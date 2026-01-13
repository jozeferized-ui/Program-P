import { format } from 'date-fns';

export interface CalendarEvent {
    title: string;
    description?: string;
    startDate: Date;
    endDate?: Date;
    allDay?: boolean;
    location?: string;
}

export function generateICal(events: CalendarEvent[]): string {
    const formatDate = (date: Date) => format(date, "yyyyMMdd'T'HHmmss");
    const formatDateAllDay = (date: Date) => format(date, "yyyyMMdd");

    const ical = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Antigravity//Project Manager//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH'
    ];

    events.forEach(event => {
        ical.push('BEGIN:VEVENT');
        ical.push(`DTSTAMP:${formatDate(new Date())}Z`);
        ical.push(`UID:${crypto.randomUUID()}`);
        ical.push(`SUMMARY:${event.title}`);

        if (event.description) {
            ical.push(`DESCRIPTION:${event.description}`);
        }

        if (event.location) {
            ical.push(`LOCATION:${event.location}`);
        }

        if (event.allDay) {
            ical.push(`DTSTART;VALUE=DATE:${formatDateAllDay(event.startDate)}`);
            // iCal end date for all-day events is exclusive, so we might need to add 1 day if it's a single day event
            // For simplicity here, we assume single day if no end date
            const endDate = event.endDate || event.startDate;
            // We actually need to add 1 day to end date for iCal all-day events to include the end date
            const nextDay = new Date(endDate);
            nextDay.setDate(nextDay.getDate() + 1);
            ical.push(`DTEND;VALUE=DATE:${formatDateAllDay(nextDay)}`);
        } else {
            ical.push(`DTSTART:${formatDate(event.startDate)}`);
            if (event.endDate) {
                ical.push(`DTEND:${formatDate(event.endDate)}`);
            }
        }

        ical.push('END:VEVENT');
    });

    ical.push('END:VCALENDAR');

    return ical.join('\r\n');
}

export function downloadICal(events: CalendarEvent[], filename: string = 'calendar.ics') {
    const content = generateICal(events);
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
