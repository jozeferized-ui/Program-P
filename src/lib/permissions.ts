// List of all available permissions (tabs/sections)
export const ALL_PERMISSIONS = [
    // Main sections
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

    // Settings & Admin
    { id: 'settings', label: 'Ustawienia', category: 'Admin' },
    { id: 'users', label: 'Zarządzanie użytkownikami', category: 'Admin' },
    { id: 'roles', label: 'Zarządzanie rolami', category: 'Admin' },
] as const;

export type PermissionId = typeof ALL_PERMISSIONS[number]['id'];

// Group permissions by category for UI
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

// Default role permissions
export const DEFAULT_ROLES = {
    'Administrator': ALL_PERMISSIONS.map(p => p.id),
    'Manager': ['dashboard', 'finances', 'clients', 'projects', 'production', 'management', 'history', 'suppliers', 'warehouse', 'documents', 'calendar', 'trash', 'settings'],
    'Użytkownik': ['dashboard', 'clients', 'projects', 'production', 'management', 'warehouse', 'calendar'],
    'Podgląd': ['dashboard', 'projects', 'calendar'],
} as const;
