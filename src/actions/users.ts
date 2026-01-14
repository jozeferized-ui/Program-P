'use server';

import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET!;

export interface UserData {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    roleId: number;
    roleName: string;
    permissions: string[];
    isActive: boolean;
    createdAt: Date;
}

// Get all users
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

// Get user by ID
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

// Create new user
export async function createUser(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    roleId: number;
}): Promise<{ success: boolean; error?: string; user?: UserData }> {
    try {
        // Check if email exists
        const existing = await prisma.user.findUnique({ where: { email: data.email } });
        if (existing) {
            return { success: false, error: 'Email już istnieje' };
        }

        // Check if role exists
        const role = await prisma.role.findUnique({ where: { id: data.roleId } });
        if (!role) {
            return { success: false, error: 'Rola nie istnieje' };
        }

        // Hash password
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

// Update user
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

// Reset password
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

// Login
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

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return { success: false, error: 'Nieprawidłowy email lub hasło' };
        }

        const permissions = JSON.parse(user.role.permissions) as string[];

        // Create JWT token
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

        // Set cookie
        const cookieStore = await cookies();
        cookieStore.set('auth-token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 days
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

// Logout
export async function logoutUser(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete('auth-token');
}

// Get current user from token
export async function getCurrentUser(): Promise<UserData | null> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth-token')?.value;

        if (!token) return null;

        const decoded = jwt.verify(token, JWT_SECRET) as {
            userId: number;
            email: string;
            roleId: number;
            roleName: string;
            permissions: string[];
            firstName: string;
            lastName: string;
        };

        // Get fresh user data from database
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
        return null;
    }
}

// Check if current user has permission
export async function hasPermission(permissionId: string): Promise<boolean> {
    const user = await getCurrentUser();
    if (!user) return false;
    return user.permissions.includes(permissionId);
}

// Check if current user has any of the permissions
export async function hasAnyPermission(permissionIds: string[]): Promise<boolean> {
    const user = await getCurrentUser();
    if (!user) return false;
    return permissionIds.some(p => user.permissions.includes(p));
}
