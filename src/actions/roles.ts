'use server';

import { prisma } from '@/lib/prisma';
import { DEFAULT_ROLES } from '@/lib/permissions';

export interface RoleData {
    id: number;
    name: string;
    description: string | null;
    permissions: string[];
    isSystem: boolean;
    createdAt: Date;
    userCount?: number;
}

// Get all roles
export async function getRoles(): Promise<RoleData[]> {
    const roles = await prisma.role.findMany({
        include: {
            _count: {
                select: { users: true }
            }
        },
        orderBy: { createdAt: 'asc' },
    });

    return roles.map(role => ({
        id: role.id,
        name: role.name,
        description: role.description,
        permissions: JSON.parse(role.permissions) as string[],
        isSystem: role.isSystem,
        createdAt: role.createdAt,
        userCount: role._count.users,
    }));
}

// Get role by ID
export async function getRoleById(id: number): Promise<RoleData | null> {
    const role = await prisma.role.findUnique({
        where: { id },
        include: {
            _count: {
                select: { users: true }
            }
        },
    });

    if (!role) return null;

    return {
        id: role.id,
        name: role.name,
        description: role.description,
        permissions: JSON.parse(role.permissions) as string[],
        isSystem: role.isSystem,
        createdAt: role.createdAt,
        userCount: role._count.users,
    };
}

// Create new role
export async function createRole(data: {
    name: string;
    description?: string;
    permissions: string[];
}): Promise<{ success: boolean; error?: string; role?: RoleData }> {
    try {
        // Check if name exists
        const existing = await prisma.role.findUnique({ where: { name: data.name } });
        if (existing) {
            return { success: false, error: 'Rola o tej nazwie już istnieje' };
        }

        const role = await prisma.role.create({
            data: {
                name: data.name,
                description: data.description || null,
                permissions: JSON.stringify(data.permissions),
                isSystem: false,
            },
        });

        return {
            success: true,
            role: {
                id: role.id,
                name: role.name,
                description: role.description,
                permissions: data.permissions,
                isSystem: role.isSystem,
                createdAt: role.createdAt,
            },
        };
    } catch (error) {
        console.error('Create role error:', error);
        return { success: false, error: 'Błąd tworzenia roli' };
    }
}

// Update role
export async function updateRole(
    id: number,
    data: {
        name?: string;
        description?: string;
        permissions?: string[];
    }
): Promise<{ success: boolean; error?: string }> {
    try {
        const role = await prisma.role.findUnique({ where: { id } });
        if (!role) {
            return { success: false, error: 'Rola nie istnieje' };
        }

        // Check if trying to change system role name
        if (role.isSystem && data.name && data.name !== role.name) {
            return { success: false, error: 'Nie można zmienić nazwy roli systemowej' };
        }

        await prisma.role.update({
            where: { id },
            data: {
                name: data.name,
                description: data.description,
                permissions: data.permissions ? JSON.stringify(data.permissions) : undefined,
            },
        });

        return { success: true };
    } catch (error) {
        console.error('Update role error:', error);
        return { success: false, error: 'Błąd aktualizacji roli' };
    }
}

// Delete role
export async function deleteRole(id: number): Promise<{ success: boolean; error?: string }> {
    try {
        const role = await prisma.role.findUnique({
            where: { id },
            include: { _count: { select: { users: true } } },
        });

        if (!role) {
            return { success: false, error: 'Rola nie istnieje' };
        }

        if (role.isSystem) {
            return { success: false, error: 'Nie można usunąć roli systemowej' };
        }

        if (role._count.users > 0) {
            return { success: false, error: 'Nie można usunąć roli przypisanej do użytkowników' };
        }

        await prisma.role.delete({ where: { id } });

        return { success: true };
    } catch (error) {
        console.error('Delete role error:', error);
        return { success: false, error: 'Błąd usuwania roli' };
    }
}

// Initialize default roles (run once)
export async function initializeDefaultRoles(): Promise<{ success: boolean; message: string }> {
    try {
        const existingRoles = await prisma.role.count();
        if (existingRoles > 0) {
            return { success: false, message: 'Role już istnieją' };
        }

        // Create default roles
        for (const [name, permissions] of Object.entries(DEFAULT_ROLES)) {
            await prisma.role.create({
                data: {
                    name,
                    description: `Domyślna rola: ${name}`,
                    permissions: JSON.stringify(permissions),
                    isSystem: true,
                },
            });
        }

        return { success: true, message: 'Domyślne role utworzone' };
    } catch (error) {
        console.error('Initialize roles error:', error);
        return { success: false, message: 'Błąd inicjalizacji ról' };
    }
}
