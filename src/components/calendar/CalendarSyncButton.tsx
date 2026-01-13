'use client';

import React, { useState } from 'react';
import { Calendar, Copy, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export function CalendarSyncButton() {
    const [copied, setCopied] = useState(false);

    const calendarUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/api/calendar`
        : '/api/calendar';

    const googleCalendarUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(calendarUrl)}`;

    const handleCopy = async () => {
        await navigator.clipboard.writeText(calendarUrl);
        setCopied(true);
        toast.success('Link skopiowany!');
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Calendar className="w-4 h-4 mr-2" />
                    Sync z kalendarzem
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-primary" />
                        Synchronizacja z kalendarzem
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <p className="text-sm text-muted-foreground mb-2">
                            Dodaj projekty i zadania do swojego kalendarza Google, Apple lub Outlook.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Link do subskrypcji:</label>
                        <div className="flex gap-2">
                            <Input value={calendarUrl} readOnly className="text-xs" />
                            <Button variant="outline" size="icon" onClick={handleCopy}>
                                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <a
                            href={googleCalendarUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full p-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                        >
                            <Calendar className="w-5 h-5" />
                            Dodaj do Google Calendar
                            <ExternalLink className="w-4 h-4" />
                        </a>

                        <a
                            href={calendarUrl}
                            download="projects.ics"
                            className="flex items-center justify-center gap-2 w-full p-3 rounded-lg border hover:bg-muted transition-colors"
                        >
                            Pobierz plik .ics
                        </a>
                    </div>

                    <p className="text-xs text-muted-foreground">
                        Kalendarz będzie automatycznie aktualizowany o nowe projekty i zadania.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
