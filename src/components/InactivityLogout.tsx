'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { logoutUser } from '@/actions/users';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Clock } from 'lucide-react';

const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes in ms
const WARNING_BEFORE_LOGOUT = 60 * 1000; // 1 minute warning

export function InactivityLogout() {
    const router = useRouter();
    const pathname = usePathname();
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [showWarning, setShowWarning] = useState(false);
    const [countdown, setCountdown] = useState(60);
    const countdownRef = useRef<NodeJS.Timeout | null>(null);

    // Skip for login page
    const isLoginPage = pathname === '/login';

    const performLogout = useCallback(async () => {
        setShowWarning(false);
        await logoutUser();
        router.push('/login');
        router.refresh();
    }, [router]);

    const startCountdown = useCallback(() => {
        setCountdown(60);
        setShowWarning(true);

        countdownRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    if (countdownRef.current) clearInterval(countdownRef.current);
                    performLogout();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, [performLogout]);

    const resetTimer = useCallback(() => {
        // Clear existing timeouts
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);

        // Hide warning if showing
        setShowWarning(false);

        if (isLoginPage) return;

        // Set warning timeout (14 minutes)
        warningTimeoutRef.current = setTimeout(() => {
            startCountdown();
        }, INACTIVITY_TIMEOUT - WARNING_BEFORE_LOGOUT);

        // Set logout timeout (15 minutes) - backup in case countdown fails
        timeoutRef.current = setTimeout(() => {
            performLogout();
        }, INACTIVITY_TIMEOUT);
    }, [isLoginPage, startCountdown, performLogout]);

    const handleStayLoggedIn = useCallback(() => {
        if (countdownRef.current) clearInterval(countdownRef.current);
        setShowWarning(false);
        resetTimer();
    }, [resetTimer]);

    useEffect(() => {
        if (isLoginPage) return;

        // Activity events to track
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

        // Throttled handler to avoid too many timer resets
        let lastReset = Date.now();
        const throttledReset = () => {
            const now = Date.now();
            if (now - lastReset > 1000) { // Max once per second
                lastReset = now;
                resetTimer();
            }
        };

        // Add event listeners
        events.forEach(event => {
            document.addEventListener(event, throttledReset, { passive: true });
        });

        // Initial timer start
        resetTimer();

        // Cleanup
        return () => {
            events.forEach(event => {
                document.removeEventListener(event, throttledReset);
            });
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
            if (countdownRef.current) clearInterval(countdownRef.current);
        };
    }, [isLoginPage, resetTimer]);

    // Don't render warning dialog on login page
    if (isLoginPage) return null;

    return (
        <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
            <AlertDialogContent className="max-w-sm">
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-orange-500" />
                        Brak aktywności
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-center">
                        <span className="block text-sm mb-4">
                            Zostaniesz wylogowany za brak aktywności.
                        </span>
                        <span className="text-4xl font-bold text-orange-500 block">
                            {countdown}s
                        </span>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="sm:justify-center">
                    <AlertDialogAction onClick={handleStayLoggedIn} className="w-full">
                        Pozostań zalogowany
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
