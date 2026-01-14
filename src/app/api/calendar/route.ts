import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

// Helper to verify auth token
async function verifyAuth(request: NextRequest): Promise<boolean> {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return false;

    try {
        await jwtVerify(token, JWT_SECRET);
        return true;
    } catch {
        return false;
    }
}

// Generate iCal format for Google Calendar import
export async function GET(request: NextRequest) {
    // Verify authentication
    const isAuth = await verifyAuth(request);
    if (!isAuth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Dynamic import to avoid edge runtime issues
    const { prisma } = await import('@/lib/prisma');
    const { format } = await import('date-fns');

    try {
        const projects = await prisma.project.findMany({
            where: {
                isDeleted: 0,
                OR: [
                    { startDate: { not: null } },
                    { endDate: { not: null } },
                ],
            },
            include: {
                client: true,
                tasks: {
                    where: { isDeleted: 0 },
                },
            },
        });

        const events: string[] = [];

        // Add projects as events
        for (const project of projects) {
            if (project.startDate || project.endDate) {
                const startDate = project.startDate || project.endDate;
                const endDate = project.endDate || project.startDate;

                events.push(createVEvent({
                    uid: `project-${project.id}@projectmanager`,
                    summary: `[Projekt] ${project.name}`,
                    description: `Klient: ${project.client.name}\\nStatus: ${project.status}\\nWartość: ${project.totalValue} PLN`,
                    start: startDate!,
                    end: endDate!,
                    location: project.address || undefined,
                }, format));
            }

            // Add tasks as events
            for (const task of project.tasks) {
                if (task.dueDate) {
                    events.push(createVEvent({
                        uid: `task-${task.id}@projectmanager`,
                        summary: `[Zadanie] ${task.title}`,
                        description: `Projekt: ${project.name}\\nStatus: ${task.status}`,
                        start: task.dueDate,
                        end: task.dueDate,
                    }, format));
                }
            }
        }

        const ical = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Project Manager//Calendar//PL',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'X-WR-CALNAME:Project Manager',
            'X-WR-TIMEZONE:Europe/Warsaw',
            ...events,
            'END:VCALENDAR',
        ].join('\r\n');

        return new NextResponse(ical, {
            headers: {
                'Content-Type': 'text/calendar; charset=utf-8',
                'Content-Disposition': 'attachment; filename="projects.ics"',
            },
        });
    } catch (error) {
        console.error('Calendar export error:', error);
        return NextResponse.json({ error: 'Failed to generate calendar' }, { status: 500 });
    }
}

function createVEvent(event: {
    uid: string;
    summary: string;
    description?: string;
    start: Date;
    end: Date;
    location?: string;
}, format: typeof import('date-fns').format): string {
    const formatICalDateOnly = (date: Date) => format(new Date(date), 'yyyyMMdd');
    const formatICalDate = (date: Date) => format(new Date(date), "yyyyMMdd'T'HHmmss'Z'");

    const lines = [
        'BEGIN:VEVENT',
        `UID:${event.uid}`,
        `DTSTAMP:${formatICalDate(new Date())}`,
        `DTSTART;VALUE=DATE:${formatICalDateOnly(event.start)}`,
        `DTEND;VALUE=DATE:${formatICalDateOnly(event.end)}`,
        `SUMMARY:${escapeIcal(event.summary)}`,
    ];

    if (event.description) {
        lines.push(`DESCRIPTION:${escapeIcal(event.description)}`);
    }

    if (event.location) {
        lines.push(`LOCATION:${escapeIcal(event.location)}`);
    }

    lines.push('END:VEVENT');
    return lines.join('\r\n');
}

function escapeIcal(text: string): string {
    return text
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');
}
