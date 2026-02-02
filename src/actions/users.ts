/**
 * @file users.ts
 * @description Zarządzanie użytkownikami i autentykacja
 * 
 * Odpowiada za:
 * - CRUD użytkowników z rolami
 * - Logowanie/wylogowanie z JWT
 * - Zarządzanie hasłami (bcrypt)
 * - Sprawdzanie uprawnień
 * 
 * @module actions/users
 */
'use server';

import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

/** Sekret JWT do podpisywania tokenów */
const JWT_SECRET = process.env.JWT_SECRET!;

/**
 * Interfejs danych użytkownika (bez hasła)
 */
export interface UserData {
    /** ID użytkownika */
    id: number;
    /** Email (login) */
    email: string;
    /** Imię */
    firstName: string;
    /** Nazwisko */
    lastName: string;
    /** ID roli */
    roleId: number;
    /** Nazwa roli */
    roleName: string;
    /** Lista uprawnień użytkownika */
    permissions: string[];
    /** Czy konto aktywne */
    isActive: boolean;
    /** Data utworzenia konta */
    createdAt: Date;
}

/**
 * Pobiera wszystkich użytkowników z rolami
 * @returns Tablica użytkowników posortowana od najnowszych
 */
export async function getUsers(): Promise<UserData[]> {
    const users = await prisma.user.findMany({
        include: { role: true },
        orderBy: { createdAt: 'desc' },
    });

    return users.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roleId: user.roleId,
        roleName: user.role.name,
        permissions: JSON.parse(user.role.permissions) as string[],
        isActive: user.isActive,
        createdAt: user.createdAt,
    }));
}

/**
 * Pobiera użytkownika po ID
 * @param id - ID użytkownika
 * @returns Dane użytkownika lub null
 */
export async function getUserById(id: number): Promise<UserData | null> {
    const user = await prisma.user.findUnique({
        where: { id },
        include: { role: true },
    });

    if (!user) return null;

    return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roleId: user.roleId,
        roleName: user.role.name,
        permissions: JSON.parse(user.role.permissions) as string[],
        isActive: user.isActive,
        createdAt: user.createdAt,
    };
}

/**
 * Tworzy nowego użytkownika
 * Hashuje hasło przed zapisem (bcrypt, salt 12)
 * 
 * @param data - Dane użytkownika:
 *   - email: Email (musi być unikalny)
 *   - password: Hasło (plain text)
 *   - firstName, lastName: Imię i nazwisko
 *   - roleId: ID roli
 * @returns Obiekt z success, error, user
 */
export async function createUser(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    roleId: number;
}): Promise<{ success: boolean; error?: string; user?: UserData }> {
    try {
        // Sprawdź unikalność emaila
        const existing = await prisma.user.findUnique({ where: { email: data.email } });
        if (existing) {
            return { success: false, error: 'Email już istnieje' };
        }

        // Sprawdź czy rola istnieje
        const role = await prisma.role.findUnique({ where: { id: data.roleId } });
        if (!role) {
            return { success: false, error: 'Rola nie istnieje' };
        }

        // Hashuj hasło
        const hashedPassword = await bcrypt.hash(data.password, 12);

        const user = await prisma.user.create({
            data: {
                email: data.email,
                password: hashedPassword,
                firstName: data.firstName,
                lastName: data.lastName,
                roleId: data.roleId,
            },
            include: { role: true },
        });

        return {
            success: true,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                roleId: user.roleId,
                roleName: user.role.name,
                permissions: JSON.parse(user.role.permissions) as string[],
                isActive: user.isActive,
                createdAt: user.createdAt,
            },
        };
    } catch (error) {
        console.error('Create user error:', error);
        return { success: false, error: 'Błąd tworzenia użytkownika' };
    }
}

/**
 * Aktualizuje dane użytkownika (bez hasła)
 * @param id - ID użytkownika
 * @param data - Częściowe dane do aktualizacji
 * @returns Obiekt z success i error
 */
export async function updateUser(
    id: number,
    data: {
        email?: string;
        firstName?: string;
        lastName?: string;
        roleId?: number;
        isActive?: boolean;
    }
): Promise<{ success: boolean; error?: string }> {
    try {
        await prisma.user.update({
            where: { id },
            data,
        });
        return { success: true };
    } catch (error) {
        console.error('Update user error:', error);
        return { success: false, error: 'Błąd aktualizacji użytkownika' };
    }
}

/**
 * Resetuje hasło użytkownika
 * @param id - ID użytkownika
 * @param newPassword - Nowe hasło (plain text)
 * @returns Obiekt z success i error
 */
export async function resetUserPassword(
    id: number,
    newPassword: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        await prisma.user.update({
            where: { id },
            data: { password: hashedPassword },
        });
        return { success: true };
    } catch (error) {
        console.error('Reset password error:', error);
        return { success: false, error: 'Błąd zmiany hasła' };
    }
}

/**
 * Loguje użytkownika
 * Weryfikuje email/hasło, tworzy JWT token, ustawia cookie
 * 
 * @param email - Email użytkownika
 * @param password - Hasło (plain text)
 * @returns Obiekt z success, error, user
 */
export async function loginUser(
    email: string,
    password: string
): Promise<{ success: boolean; error?: string; user?: UserData }> {
    try {
        const user = await prisma.user.findUnique({
            where: { email },
            include: { role: true },
        });

        if (!user) {
            return { success: false, error: 'Nieprawidłowy email lub hasło' };
        }

        if (!user.isActive) {
            return { success: false, error: 'Konto jest nieaktywne' };
        }

        // Weryfikuj hasło
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return { success: false, error: 'Nieprawidłowy email lub hasło' };
        }

        const permissions = JSON.parse(user.role.permissions) as string[];

        // Utwórz token JWT (ważny 7 dni)
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                roleId: user.roleId,
                roleName: user.role.name,
                permissions,
                firstName: user.firstName,
                lastName: user.lastName,
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Ustaw cookie auth-token
        const cookieStore = await cookies();
        cookieStore.set('auth-token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,  // 7 dni
            path: '/',
        });

        return {
            success: true,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                roleId: user.roleId,
                roleName: user.role.name,
                permissions,
                isActive: user.isActive,
                createdAt: user.createdAt,
            },
        };
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: 'Błąd logowania' };
    }
}

/**
 * Wylogowuje użytkownika (usuwa cookie auth-token)
 */
export async function logoutUser(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete('auth-token');
}

/**
 * Pobiera aktualnie zalogowanego użytkownika z tokena JWT
 * Weryfikuje token i pobiera świeże dane z bazy
 * 
 * @returns Dane użytkownika lub null jeśli niezalogowany
 */
export async function getCurrentUser(): Promise<UserData | null> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth-token')?.value;

        if (!token) return null;

        // Dekoduj i weryfikuj token
        const decoded = jwt.verify(token, JWT_SECRET) as {
            userId: number;
            email: string;
            roleId: number;
            roleName: string;
            permissions: string[];
            firstName: string;
            lastName: string;
        };

        // Pobierz świeże dane użytkownika z bazy
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            include: { role: true },
        });

        if (!user || !user.isActive) return null;

        return {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            roleId: user.roleId,
            roleName: user.role.name,
            permissions: JSON.parse(user.role.permissions) as string[],
            isActive: user.isActive,
            createdAt: user.createdAt,
        };
    } catch {
        return null;  // Token nieważny lub wygasły
    }
}

/**
 * Sprawdza czy aktualny użytkownik ma dane uprawnienie
 * @param permissionId - ID uprawnienia do sprawdzenia
 * @returns true jeśli użytkownik ma uprawnienie
 */
export async function hasPermission(permissionId: string): Promise<boolean> {
    const user = await getCurrentUser();
    if (!user) return false;
    return user.permissions.includes(permissionId);
}

/**
 * Sprawdza czy aktualny użytkownik ma którekolwiek z podanych uprawnień
 * @param permissionIds - Tablica ID uprawnień
 * @returns true jeśli użytkownik ma przynajmniej jedno uprawnienie
 */
export async function hasAnyPermission(permissionIds: string[]): Promise<boolean> {
    const user = await getCurrentUser();
    if (!user) return false;
    return permissionIds.some(p => user.permissions.includes(p));
}
