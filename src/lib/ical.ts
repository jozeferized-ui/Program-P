/**
 * @file ical.ts
 * @description Generator plików iCal (.ics) dla eksportu kalendarza
 * 
 * Pozwala na:
 * - Generowanie zdarzeń kalendarza w formacie iCal
 * - Obsługę wydarzeń całodniowych i czasowych
 * - Pobieranie pliku .ics
 * 
 * @module lib/ical
 */

import { format } from 'date-fns';

/**
 * Zdarzenie kalendarza
 */
export interface CalendarEvent {
    /** Tytuł zdarzenia */
    title: string;
    /** Opis zdarzenia (opcjonalnie) */
    description?: string;
    /** Data początkowa */
    startDate: Date;
    /** Data końcowa (opcjonalnie) */
    endDate?: Date;
    /** Czy zdarzenie całodniowe */
    allDay?: boolean;
    /** Lokalizacja (opcjonalnie) */
    location?: string;
}

/**
 * Generuje string iCal z tablicy zdarzeń
 * 
 * @param events - Tablica zdarzeń kalendarza
 * @returns String w formacie iCal (RFC 5545)
 */
export function generateICal(events: CalendarEvent[]): string {
    // Formatowanie daty dla zdarzeń czasowych: YYYYMMDDTHHMMSS
    const formatDate = (date: Date) => format(date, "yyyyMMdd'T'HHmmss");
    // Formatowanie daty dla zdarzeń całodniowych: YYYYMMDD
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
            // Zdarzenia całodniowe
            ical.push(`DTSTART;VALUE=DATE:${formatDateAllDay(event.startDate)}`);
            // iCal: data końcowa jest exclusive, więc dodajemy 1 dzień
            const endDate = event.endDate || event.startDate;
            const nextDay = new Date(endDate);
            nextDay.setDate(nextDay.getDate() + 1);
            ical.push(`DTEND;VALUE=DATE:${formatDateAllDay(nextDay)}`);
        } else {
            // Zdarzenia czasowe
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

/**
 * Generuje i pobiera plik iCal
 * 
 * @param events - Tablica zdarzeń kalendarza
 * @param filename - Nazwa pliku (domyślnie 'calendar.ics')
 */
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
