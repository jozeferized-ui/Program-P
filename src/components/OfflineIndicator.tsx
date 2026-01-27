'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function OfflineIndicator() {
    // Use lazy initialization to get initial online state
    const [isOnline, setIsOnline] = useState(() =>
        typeof window !== 'undefined' ? navigator.onLine : true
    );
    const [showBanner, setShowBanner] = useState(false);
    const isFirstRender = useRef(true);

    useEffect(() => {
        // Skip setting state on first render since we already have the correct initial value
        if (isFirstRender.current) {
            isFirstRender.current = false;
            // Only check if server-rendered value differs from client
            if (typeof window !== 'undefined' && navigator.onLine !== isOnline) {
                setIsOnline(navigator.onLine);
            }
        }

        const handleOnline = () => {
            setIsOnline(true);
            setShowBanner(true);
            toast.success('Połączenie przywrócone');

            // Hide banner after 3 seconds
            setTimeout(() => setShowBanner(false), 3000);

            // Trigger background sync if available
            if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
                navigator.serviceWorker.ready.then((registration) => {
                    (registration as any).sync?.register('sync-data');
                });
            }
        };

        const handleOffline = () => {
            setIsOnline(false);
            setShowBanner(true);
            toast.error('Brak połączenia z internetem');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [isOnline]);

    if (isOnline && !showBanner) return null;

    return (
        <div
            className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-2 rounded-lg shadow-lg transition-all ${isOnline
                ? 'bg-green-500 text-white'
                : 'bg-amber-500 text-white animate-pulse'
                }`}
        >
            {isOnline ? (
                <>
                    <Wifi className="w-4 h-4" />
                    <span className="text-sm font-medium">Online</span>
                </>
            ) : (
                <>
                    <WifiOff className="w-4 h-4" />
                    <span className="text-sm font-medium">Tryb offline</span>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-white hover:bg-white/20"
                        onClick={() => window.location.reload()}
                    >
                        <RefreshCw className="w-3 h-3" />
                    </Button>
                </>
            )}
        </div>
    );
}
