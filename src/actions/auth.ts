/**
 * @file auth.ts
 * @description Moduł autentykacji użytkowników
 * 
 * Odpowiada za:
 * - Weryfikację kodu PIN
 * - Zarządzanie sesją (cookies)
 * - Wylogowywanie użytkowników
 * 
 * @module actions/auth
 */
'use server';

import { cookies } from 'next/headers';

/** Kod PIN aplikacji - domyślnie '1234', można zmienić w .env */
const APP_PIN = process.env.APP_PIN || '1234';

/**
 * Weryfikuje kod PIN i tworzy sesję użytkownika
 * @param pin - Kod PIN wprowadzony przez użytkownika
 * @returns Obiekt z polem success (true/false) i opcjonalnie error
 */
export async function verifyPin(pin: string) {
    if (pin === APP_PIN) {
        const cookieStore = await cookies();
        // Ustawia cookie sesji na 1 tydzień
        cookieStore.set('auth_session', 'true', {
            httpOnly: true,                              // Niedostępne dla JavaScript
            secure: process.env.NODE_ENV === 'production', // HTTPS tylko w produkcji
            sameSite: 'lax',                             // Ochrona CSRF
            maxAge: 60 * 60 * 24 * 7,                    // 7 dni
            path: '/',
        });
        return { success: true };
    }
    return { success: false, error: 'Nieprawidłowy kod PIN' };
}

/**
 * Wylogowuje użytkownika usuwając cookie sesji
 * @returns Obiekt z polem success: true
 */
export async function logout() {
    const cookieStore = await cookies();
    cookieStore.delete('auth_session');
    return { success: true };
}
