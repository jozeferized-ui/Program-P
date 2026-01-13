'use client';

import { useEffect, useState } from 'react';
import { MapPin, Loader2, Navigation } from 'lucide-react';

interface ScanTrackerProps {
    toolId: number;
}

export function ScanTracker({ toolId }: ScanTrackerProps) {
    const [status, setStatus] = useState<'idle' | 'requesting' | 'success' | 'error'>('idle');
    const [hasLocation, setHasLocation] = useState(false);
    const [scanRecorded, setScanRecorded] = useState(false);

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
            setScanRecorded(true);
            if (latitude && longitude) {
                setHasLocation(true);
            }
            setStatus('success');
        } catch (error) {
            console.error('Failed to record scan:', error);
            setStatus('error');
        }
    };

    const requestLocation = () => {
        setStatus('requesting');

        if (!navigator.geolocation) {
            // No geolocation support - just record scan
            recordScan();
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                recordScan(
                    position.coords.latitude,
                    position.coords.longitude,
                    position.coords.accuracy
                );
            },
            (error) => {
                console.log('Geolocation error:', error.message);
                // Record scan without location
                recordScan();
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0,
            }
        );
    };

    // Auto-dismiss after success
    useEffect(() => {
        if (status === 'success') {
            const timer = setTimeout(() => {
                setStatus('idle');
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [status]);

    return (
        <div className="fixed bottom-4 left-4 right-4 z-50 flex justify-center pointer-events-none">
            <div className="pointer-events-auto">
                {status === 'idle' && !scanRecorded && (
                    <button
                        onClick={requestLocation}
                        className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-blue-600 text-white shadow-xl hover:bg-blue-700 active:scale-95 transition-all animate-pulse"
                    >
                        <Navigation className="w-5 h-5" />
                        <span className="font-bold">Potwierdź skan i udostępnij lokalizację</span>
                    </button>
                )}

                {status === 'requesting' && (
                    <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white shadow-xl border">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                        <span className="text-slate-600 font-medium">Pobieranie lokalizacji...</span>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-emerald-500 text-white shadow-xl">
                        <MapPin className="w-5 h-5" />
                        <span className="font-bold">
                            {hasLocation ? 'Skan z lokalizacją zapisany!' : 'Skan zapisany (bez lokalizacji)'}
                        </span>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-rose-500 text-white shadow-xl">
                        <MapPin className="w-5 h-5" />
                        <span className="font-bold">Błąd zapisu skanu</span>
                    </div>
                )}
            </div>
        </div>
    );
}
