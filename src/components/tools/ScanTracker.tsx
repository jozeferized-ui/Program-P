'use client';

import { useEffect, useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';

interface ScanTrackerProps {
    toolId: number;
}

export function ScanTracker({ toolId }: ScanTrackerProps) {
    const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'denied'>('loading');
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

    useEffect(() => {
        const recordScan = async (latitude?: number, longitude?: number, accuracy?: number) => {
            try {
                await fetch('/api/scans', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        toolId,
                        latitude,
                        longitude,
                        accuracy,
                    }),
                });
                setStatus('success');
                if (latitude && longitude) {
                    setLocation({ lat: latitude, lng: longitude });
                }
            } catch (error) {
                console.error('Failed to record scan:', error);
                setStatus('error');
            }
        };

        // Try to get geolocation
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    recordScan(
                        position.coords.latitude,
                        position.coords.longitude,
                        position.coords.accuracy
                    );
                },
                (error) => {
                    console.log('Geolocation denied or error:', error.message);
                    setStatus('denied');
                    // Record scan without location
                    recordScan();
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0,
                }
            );
        } else {
            // Geolocation not supported
            recordScan();
        }
    }, [toolId]);

    // Don't show anything prominent - just a small indicator
    return (
        <div className="fixed bottom-4 left-4 z-50">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur shadow-lg border text-xs">
                {status === 'loading' && (
                    <>
                        <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                        <span className="text-slate-500">Wykrywanie lokalizacji...</span>
                    </>
                )}
                {status === 'success' && location && (
                    <>
                        <MapPin className="w-3 h-3 text-emerald-500" />
                        <span className="text-emerald-600">Lokalizacja zapisana</span>
                    </>
                )}
                {status === 'success' && !location && (
                    <>
                        <MapPin className="w-3 h-3 text-amber-500" />
                        <span className="text-amber-600">Skan zapisany</span>
                    </>
                )}
                {status === 'denied' && (
                    <>
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span className="text-slate-500">Skan zapisany</span>
                    </>
                )}
                {status === 'error' && (
                    <>
                        <MapPin className="w-3 h-3 text-rose-500" />
                        <span className="text-rose-600">Błąd zapisu</span>
                    </>
                )}
            </div>
        </div>
    );
}
