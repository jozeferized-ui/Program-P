'use server';

import { cookies } from 'next/headers';

const APP_PIN = process.env.APP_PIN || '1234';

export async function verifyPin(pin: string) {
    if (pin === APP_PIN) {
        const cookieStore = await cookies();
        cookieStore.set('auth_session', 'true', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 1 week
            path: '/',
        });
        return { success: true };
    }
    return { success: false, error: 'Nieprawidłowy kod PIN' };
}

export async function logout() {
    const cookieStore = await cookies();
    cookieStore.delete('auth_session');
    return { success: true };
}
