/**
 * @file toolTransfer.ts
 * @description System przekazywania narzędzi między pracownikami
 * 
 * Odpowiada za:
 * - Autentykację użytkownika dla przekazania (strona QR)
 * - Przekazywanie narzędzi między pracownikami
 * - Historia przekazań narzędzi
 * - Zwrot narzędzi (czyszczenie przekazania)
 * 
 * @module actions/toolTransfer
 */
'use server';

import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { jwtVerify, SignJWT } from 'jose';

/** Sekret JWT do podpisywania tokenów przekazania */
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

/**
 * Autentykuje użytkownika dla przekazania narzędzia (przez QR kod)
 * Tworzy tymczasowy token sesji na 1 godzinę
 * 
 * @param email - Email użytkownika
 * @param password - Hasło użytkownika
 * @param toolId - ID narzędzia do przekazania
 * @returns Obiekt z success, user (id, imię, nazwisko) lub error
 */
export async function authenticateForToolTransfer(email: string, password: string, toolId: number) {
    try {
        // Znajdź użytkownika po emailu
        const user = await (prisma as any).user.findUnique({
            where: { email },
            include: { role: true }
        });

        if (!user) {
            return { success: false, error: 'Nieprawidłowy email lub hasło' };
        }

        // Weryfikuj hasło
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return { success: false, error: 'Nieprawidłowy email lub hasło' };
        }

        // Pobierz narzędzie z przypisanymi pracownikami
        const tool = await (prisma as any).tool.findUnique({
            where: { id: toolId },
            include: { assignedEmployees: true }
        });

        if (!tool) {
            return { success: false, error: 'Narzędzie nie znalezione' };
        }

        // Utwórz tymczasowy token dla tej sesji przekazania
        const token = await new SignJWT({
            userId: user.id,
            toolId: toolId,
            purpose: 'tool-transfer'  // Oznacz cel tokena
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setExpirationTime('1h')  // Ważny 1 godzinę
            .sign(JWT_SECRET);

        // Ustaw cookie dla sesji przekazania
        const cookieStore = await cookies();
        cookieStore.set('tool-transfer-token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60,  // 1 godzina
        });

        return {
            success: true,
            user: {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName
            }
        };
    } catch (error) {
        console.error('Auth error:', error);
        return { success: false, error: 'Błąd uwierzytelniania' };
    }
}

/**
 * Przekazuje narzędzie innemu pracownikowi
 * Wymaga ważnego tokena przekazania z cookie
 * 
 * @param toolId - ID narzędzia
 * @param toEmployeeId - ID pracownika docelowego
 * @param notes - Notatki dot. przekazania (opcjonalne)
 * @returns Obiekt z success lub error
 */
export async function transferTool(toolId: number, toEmployeeId: number, notes?: string) {
    try {
        // Weryfikuj token przekazania
        const cookieStore = await cookies();
        const token = cookieStore.get('tool-transfer-token')?.value;

        if (!token) {
            return { success: false, error: 'Sesja wygasła. Zaloguj się ponownie.' };
        }

        const { payload } = await jwtVerify(token, JWT_SECRET);
        if (payload.toolId !== toolId || payload.purpose !== 'tool-transfer') {
            return { success: false, error: 'Nieprawidłowy token' };
        }

        // Pobierz aktualny stan narzędzia
        const tool = await (prisma as any).tool.findUnique({
            where: { id: toolId },
            include: { assignedEmployees: true, transferredTo: true }
        });

        if (!tool) {
            return { success: false, error: 'Narzędzie nie znalezione' };
        }

        // Ustal "od kogo" - aktualny odbiorca lub pierwszy przypisany
        const fromEmployeeId = tool.transferredToId || tool.assignedEmployees[0]?.id;

        if (!fromEmployeeId) {
            return { success: false, error: 'Brak przypisanej osoby' };
        }

        // Zaktualizuj narzędzie z nowym przekazaniem
        await (prisma as any).tool.update({
            where: { id: toolId },
            data: {
                transferredToId: toEmployeeId,
                transferredAt: new Date(),
                transferNotes: notes || null,
            }
        });

        // Utwórz wpis historii przekazania
        await (prisma as any).toolTransfer.create({
            data: {
                toolId,
                fromEmployeeId,
                toEmployeeId,
                notes: notes || null,
            }
        });

        // Wyczyść cookie po zakończeniu
        cookieStore.delete('tool-transfer-token');

        return { success: true };
    } catch (error) {
        console.error('Transfer error:', error);
        return { success: false, error: 'Błąd przekazania' };
    }
}

/**
 * Pobiera historię przekazań narzędzia
 * @param toolId - ID narzędzia
 * @returns Obiekt z success, transfers (tablica historii) lub error
 */
export async function getToolTransferHistory(toolId: number) {
    try {
        const transfers = await (prisma as any).toolTransfer.findMany({
            where: { toolId },
            include: {
                fromEmployee: { select: { firstName: true, lastName: true } },
                toEmployee: { select: { firstName: true, lastName: true } }
            },
            orderBy: { transferredAt: 'desc' }  // Najnowsze na górze
        });

        return { success: true, transfers };
    } catch (error) {
        console.error('History error:', error);
        return { success: false, error: 'Błąd pobierania historii' };
    }
}

/**
 * Pobiera listę pracowników do wyboru przy przekazaniu
 * @returns Obiekt z success, employees (id, imię, nazwisko) lub error
 */
export async function getEmployeesForTransfer() {
    try {
        const employees = await (prisma as any).employee.findMany({
            where: { isDeleted: 0 },
            select: { id: true, firstName: true, lastName: true },
            orderBy: { firstName: 'asc' }
        });

        return { success: true, employees };
    } catch (error) {
        console.error('Employees error:', error);
        return { success: false, error: 'Błąd pobierania pracowników' };
    }
}

/**
 * Wylogowuje z sesji przekazania narzędzia
 * @returns Obiekt z success: true
 */
export async function logoutToolTransfer() {
    const cookieStore = await cookies();
    cookieStore.delete('tool-transfer-token');
    return { success: true };
}

/**
 * Czyści przekazanie (zwrot narzędzia)
 * @param toolId - ID narzędzia
 * @returns Obiekt z success lub error
 */
export async function clearTransfer(toolId: number) {
    try {
        // Weryfikuj token przekazania
        const cookieStore = await cookies();
        const token = cookieStore.get('tool-transfer-token')?.value;

        if (!token) {
            return { success: false, error: 'Sesja wygasła. Zaloguj się ponownie.' };
        }

        const { payload } = await jwtVerify(token, JWT_SECRET);
        if (payload.toolId !== toolId || payload.purpose !== 'tool-transfer') {
            return { success: false, error: 'Nieprawidłowy token' };
        }

        // Wyczyść dane przekazania z narzędzia
        await (prisma as any).tool.update({
            where: { id: toolId },
            data: {
                transferredToId: null,
                transferredAt: null,
                transferNotes: null,
            }
        });

        // Wyczyść cookie
        cookieStore.delete('tool-transfer-token');

        return { success: true };
    } catch {
        return { success: false, error: 'Błąd usuwania przekazania' };
    }
}

/**
 * Szybkie przekazanie narzędzia z panelu zarządzania
 * Używa głównego tokena auth zamiast osobnej sesji przekazania
 * 
 * @param toolId - ID narzędzia
 * @param toEmployeeId - ID pracownika docelowego
 * @param transferDate - Data przekazania (opcjonalnie, domyślnie dziś)
 * @param notes - Notatki dot. przekazania (opcjonalne)
 * @returns Obiekt z success i updatedTool lub error
 */
export async function quickTransferTool(
    toolId: number,
    toEmployeeId: number,
    transferDate?: string,
    notes?: string
) {
    try {
        // Weryfikuj główny token auth z cookie
        const cookieStore = await cookies();
        const authToken = cookieStore.get('auth_token')?.value;

        if (!authToken) {
            return { success: false, error: 'Brak autoryzacji. Zaloguj się do systemu.' };
        }

        // Weryfikuj token
        await jwtVerify(authToken, JWT_SECRET);

        // Pobierz aktualny stan narzędzia
        const tool = await (prisma as any).tool.findUnique({
            where: { id: toolId },
            include: { assignedEmployees: true, transferredTo: true }
        });

        if (!tool) {
            return { success: false, error: 'Narzędzie nie znalezione' };
        }

        // Pobierz pracownika docelowego
        const toEmployee = await (prisma as any).employee.findUnique({
            where: { id: toEmployeeId },
            select: { id: true, firstName: true, lastName: true }
        });

        if (!toEmployee) {
            return { success: false, error: 'Pracownik nie znaleziony' };
        }

        // Ustal "od kogo" - aktualny odbiorca lub pierwszy przypisany
        const fromEmployeeId = tool.transferredToId || tool.assignedEmployees[0]?.id;

        // Data przekazania
        const parsedDate = transferDate ? new Date(transferDate) : new Date();

        // Zaktualizuj narzędzie z nowym przekazaniem
        const updatedTool = await (prisma as any).tool.update({
            where: { id: toolId },
            data: {
                transferredToId: toEmployeeId,
                transferredAt: parsedDate,
                transferNotes: notes || null,
            },
            include: {
                assignedEmployees: true,
                transferredTo: { select: { id: true, firstName: true, lastName: true } }
            }
        });

        // Utwórz wpis historii przekazania jeśli jest "od kogo"
        if (fromEmployeeId) {
            await (prisma as any).toolTransfer.create({
                data: {
                    toolId,
                    fromEmployeeId,
                    toEmployeeId,
                    notes: notes || null,
                    transferredAt: parsedDate,
                }
            });
        }

        return {
            success: true,
            updatedTool: {
                ...updatedTool,
                id: updatedTool.id,
                transferredTo: toEmployee
            }
        };
    } catch (error) {
        console.error('Quick transfer error:', error);
        return { success: false, error: 'Błąd przekazania narzędzia' };
    }
}

