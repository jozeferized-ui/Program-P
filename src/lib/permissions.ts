/**
 * @file permissions.ts
 * @description Definicja systemu uprawnień i ról
 * 
 * Zawiera:
 * - Listę wszystkich dostępnych uprawnień (sekcje/zakładki)
 * - Domyślne zestawy uprawnień dla ról
 * - Funkcję grupowania uprawnień wg kategorii dla UI
 * 
 * @module lib/permissions
 */

/**
 * Wszystkie dostępne uprawnienia w systemie
 * Każde uprawnienie odpowiada sekcji/zakładce w aplikacji
 */
export const ALL_PERMISSIONS = [
    // Główne sekcje
    { id: 'dashboard', label: 'Dashboard', category: 'Główne' },
    { id: 'finances', label: 'Finanse', category: 'Główne' },
    { id: 'clients', label: 'Klienci', category: 'Główne' },
    { id: 'projects', label: 'Projekty', category: 'Główne' },
    { id: 'production', label: 'Produkcja', category: 'Główne' },
    { id: 'management', label: 'Zarządzanie', category: 'Główne' },
    { id: 'history', label: 'Historia', category: 'Główne' },
    { id: 'suppliers', label: 'Dostawcy', category: 'Główne' },
    { id: 'warehouse', label: 'Magazyn', category: 'Główne' },
    { id: 'documents', label: 'Dokumenty', category: 'Główne' },
    { id: 'calendar', label: 'Kalendarz', category: 'Główne' },
    { id: 'trash', label: 'Kosz', category: 'Główne' },

    // Sekcje administracyjne
    { id: 'settings', label: 'Ustawienia', category: 'Admin' },
    { id: 'users', label: 'Zarządzanie użytkownikami', category: 'Admin' },
    { id: 'roles', label: 'Zarządzanie rolami', category: 'Admin' },
] as const;

/** Typ ID uprawnienia */
export type PermissionId = typeof ALL_PERMISSIONS[number]['id'];

/**
 * Grupuje uprawnienia wg kategorii dla wyświetlenia w UI
 * 
 * @returns Obiekt z kategoriami jako kluczami i tablicami uprawnień jako wartościami
 * @example
 * { 'Główne': [...], 'Admin': [...] }
 */
export function getPermissionsByCategory() {
    const grouped: Record<string, typeof ALL_PERMISSIONS[number][]> = {};

    for (const perm of ALL_PERMISSIONS) {
        if (!grouped[perm.category]) {
            grouped[perm.category] = [];
        }
        grouped[perm.category].push(perm);
    }

    return grouped;
}

/**
 * Domyślne zestawy uprawnień dla standardowych ról
 * Używane przy inicjalizacji ról
 */
export const DEFAULT_ROLES = {
    /** Pełny dostęp do wszystkich funkcji */
    'Administrator': ALL_PERMISSIONS.map(p => p.id),
    /** Zarządzanie bez administracji użytkownikami */
    'Manager': ['dashboard', 'finances', 'clients', 'projects', 'production', 'management', 'history', 'suppliers', 'warehouse', 'documents', 'calendar', 'trash', 'settings'],
    /** Podstawowy dostęp operacyjny */
    'Użytkownik': ['dashboard', 'clients', 'projects', 'production', 'management', 'warehouse', 'calendar'],
    /** Tylko podgląd */
    'Podgląd': ['dashboard', 'projects', 'calendar'],
} as const;
