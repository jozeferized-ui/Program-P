/**
 * @file middleware.ts
 * @description Middleware Next.js dla autoryzacji i kontroli dostępu
 * 
 * Odpowiada za:
 * - Weryfikację tokena JWT przy każdym żądaniu
 * - Przekierowanie niezalogowanych do /login
 * - Kontrolę uprawnień dla chronionych tras
 * - Przekazywanie danych użytkownika przez nagłówki
 * 
 * @module middleware
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

/** Sekret JWT zakodowany dla JOSE */
const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET
);

if (!process.env.JWT_SECRET) {
    console.error('WARNING: JWT_SECRET not configured!');
}

/**
 * Mapowanie tras na wymagane uprawnienia
 * Klucz: ścieżka URL, Wartość: ID uprawnienia
 */
const ROUTE_PERMISSIONS: Record<string, string> = {
    '/finances': 'finances',
    '/clients': 'clients',
    '/projects': 'projects',
    '/production': 'production',
    '/management': 'management',
    '/history': 'history',
    '/suppliers': 'suppliers',
    '/warehouse': 'warehouse',
    '/documents': 'documents',
    '/calendar': 'calendar',
    '/trash': 'trash',
    '/settings': 'settings',
};

/**
 * Główna funkcja middleware
 * 
 * Przepływ:
 * 1. Przepuszcza publiczne trasy (/tools/*, /login, /_next, /api)
 * 2. Sprawdza token auth-token w cookies
 * 3. Weryfikuje JWT i dekoduje payload
 * 4. Sprawdza uprawnienia dla chronionych tras
 * 5. Przekazuje dane użytkownika przez nagłówki x-user-*
 * 
 * @param request - Żądanie Next.js
 * @returns Odpowiedź (next, redirect, lub z modyfikowanymi nagłówkami)
 */
export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // ─────────────────────────────────────────────────────────────────────
    // TRASY PUBLICZNE
    // ─────────────────────────────────────────────────────────────────────

    // Publiczny dostęp do narzędzi (QR code)
    if (pathname.startsWith('/tools/')) {
        return NextResponse.next();
    }

    // Strona logowania i zasoby statyczne
    if (
        pathname === '/login' ||
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api') ||
        pathname.includes('favicon.ico')
    ) {
        return NextResponse.next();
    }

    // ─────────────────────────────────────────────────────────────────────
    // WERYFIKACJA TOKENA
    // ─────────────────────────────────────────────────────────────────────

    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
        // Brak tokena → przekieruj na login
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
    }

    try {
        // Weryfikuj i dekoduj JWT
        const { payload } = await jwtVerify(token, JWT_SECRET);
        const permissions = payload.permissions as string[];

        // ─────────────────────────────────────────────────────────────────
        // KONTROLA UPRAWNIEŃ
        // ─────────────────────────────────────────────────────────────────

        for (const [route, requiredPermission] of Object.entries(ROUTE_PERMISSIONS)) {
            if (pathname.startsWith(route)) {
                if (!permissions.includes(requiredPermission)) {
                    // Brak uprawnień → przekieruj na stronę główną
                    const homeUrl = new URL('/', request.url);
                    return NextResponse.redirect(homeUrl);
                }
                break;
            }
        }

        // ─────────────────────────────────────────────────────────────────
        // PRZEKAZANIE DANYCH UŻYTKOWNIKA
        // ─────────────────────────────────────────────────────────────────

        // Dane użytkownika dostępne w Server Components przez nagłówki
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set('x-user-id', String(payload.userId));
        requestHeaders.set('x-user-role', String(payload.roleName));
        requestHeaders.set('x-user-permissions', JSON.stringify(permissions));

        return NextResponse.next({
            request: {
                headers: requestHeaders,
            },
        });
    } catch {
        // Nieprawidłowy/wygasły token → wyczyść i przekieruj na login
        const loginUrl = new URL('/login', request.url);
        const response = NextResponse.redirect(loginUrl);
        response.cookies.delete('auth-token');
        return response;
    }
}

/**
 * Konfiguracja matchera - określa które ścieżki mają przechodzić przez middleware
 */
export const config = {
    matcher: [
        /*
         * Dopasuj wszystkie ścieżki OPRÓCZ:
         * - api (API routes)
         * - _next/static (pliki statyczne)
         * - _next/image (optymalizacja obrazów)
         * - favicon.ico
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
