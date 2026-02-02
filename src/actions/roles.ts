/**
 * @file roles.ts
 * @description Zarządzanie rolami użytkowników i uprawnieniami systemowymi
 * 
 * Odpowiada za:
 * - CRUD ról użytkowników
 * - Zarządzanie uprawnieniami przypisanymi do ról
 * - Ochrona ról systemowych przed usunięciem
 * - Inicjalizacja domyślnych ról
 * 
 * @module actions/roles
 */
'use server';

import { prisma } from '@/lib/prisma';
import { DEFAULT_ROLES } from '@/lib/permissions';

/**
 * Interfejs danych roli
 */
export interface RoleData {
    /** ID roli */
    id: number;
    /** Nazwa roli (unikalna) */
    name: string;
    /** Opis roli */
    description: string | null;
    /** Lista uprawnień (jako tablica stringów) */
    permissions: string[];
    /** Czy rola systemowa (nie można usunąć) */
    isSystem: boolean;
    /** Data utworzenia */
    createdAt: Date;
    /** Liczba użytkowników z tą rolą (opcjonalne) */
    userCount?: number;
}

/**
 * Pobiera wszystkie role z liczbą przypisanych użytkowników
 * @returns Tablica ról posortowana od najstarszych
 */
export async function getRoles(): Promise<RoleData[]> {
    const roles = await prisma.role.findMany({
        include: {
            _count: {
                select: { users: true }  // Zlicz użytkowników
            }
        },
        orderBy: { createdAt: 'asc' },
    });

    return roles.map(role => ({
        id: role.id,
        name: role.name,
        description: role.description,
        permissions: JSON.parse(role.permissions) as string[],  // Parsuj JSON
        isSystem: role.isSystem,
        createdAt: role.createdAt,
        userCount: role._count.users,
    }));
}

/**
 * Pobiera rolę po ID
 * @param id - ID roli
 * @returns Rola lub null jeśli nie znaleziono
 */
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

/**
 * Tworzy nową rolę (niestandardową)
 * @param data - Dane roli:
 *   - name: Nazwa roli (unikalna)
 *   - description: Opis (opcjonalne)
 *   - permissions: Tablica uprawnień
 * @returns Obiekt z success, error, role
 */
export async function createRole(data: {
    name: string;
    description?: string;
    permissions: string[];
}): Promise<{ success: boolean; error?: string; role?: RoleData }> {
    try {
        // Sprawdź czy nazwa jest zajęta
        const existing = await prisma.role.findUnique({ where: { name: data.name } });
        if (existing) {
            return { success: false, error: 'Rola o tej nazwie już istnieje' };
        }

        const role = await prisma.role.create({
            data: {
                name: data.name,
                description: data.description || null,
                permissions: JSON.stringify(data.permissions),  // Serializuj do JSON
                isSystem: false,  // Nowe role nie są systemowe
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

/**
 * Aktualizuje rolę
 * @param id - ID roli
 * @param data - Dane do aktualizacji
 * @returns Obiekt z success i error
 */
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

        // Nie pozwól zmieniać nazwy roli systemowej
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

/**
 * Usuwa rolę (hard delete)
 * Nie można usunąć roli systemowej lub przypisanej do użytkowników
 * @param id - ID roli do usunięcia
 * @returns Obiekt z success i error
 */
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

/**
 * Inicjalizuje domyślne role systemowe (uruchom raz przy starcie)
 * Tworzy role z DEFAULT_ROLES z lib/permissions.ts
 * @returns Obiekt z success i message
 */
export async function initializeDefaultRoles(): Promise<{ success: boolean; message: string }> {
    try {
        const existingRoles = await prisma.role.count();
        if (existingRoles > 0) {
            return { success: false, message: 'Role już istnieją' };
        }

        // Utwórz domyślne role
        for (const [name, permissions] of Object.entries(DEFAULT_ROLES)) {
            await prisma.role.create({
                data: {
                    name,
                    description: `Domyślna rola: ${name}`,
                    permissions: JSON.stringify(permissions),
                    isSystem: true,  // Oznacz jako systemową
                },
            });
        }

        return { success: true, message: 'Domyślne role utworzone' };
    } catch (error) {
        console.error('Initialize roles error:', error);
        return { success: false, message: 'Błąd inicjalizacji ról' };
    }
}
