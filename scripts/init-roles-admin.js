// Run this script once to initialize default roles and admin user
// Usage: node scripts/init-roles-admin.js

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const DEFAULT_ROLES = {
    'Administrator': {
        description: 'Pełny dostęp do wszystkich funkcji',
        permissions: ['dashboard', 'finances', 'clients', 'projects', 'production', 'management', 'history', 'suppliers', 'warehouse', 'documents', 'calendar', 'trash', 'settings', 'users', 'roles'],
    },
    'Manager': {
        description: 'Dostęp do większości funkcji bez zarządzania użytkownikami',
        permissions: ['dashboard', 'finances', 'clients', 'projects', 'production', 'management', 'history', 'suppliers', 'warehouse', 'documents', 'calendar', 'trash', 'settings'],
    },
    'Użytkownik': {
        description: 'Podstawowy dostęp do codziennej pracy',
        permissions: ['dashboard', 'clients', 'projects', 'production', 'management', 'warehouse', 'calendar'],
    },
    'Podgląd': {
        description: 'Tylko podgląd podstawowych informacji',
        permissions: ['dashboard', 'projects', 'calendar'],
    },
};

async function init() {
    const prisma = new PrismaClient();

    try {
        console.log('=== Inicjalizacja ról i użytkowników ===\n');

        // 1. Create default roles
        console.log('Tworzenie domyślnych ról...');
        const adminRole = await prisma.role.upsert({
            where: { name: 'Administrator' },
            update: {},
            create: {
                name: 'Administrator',
                description: DEFAULT_ROLES['Administrator'].description,
                permissions: JSON.stringify(DEFAULT_ROLES['Administrator'].permissions),
                isSystem: true,
            },
        });
        console.log('  ✓ Administrator');

        for (const [name, data] of Object.entries(DEFAULT_ROLES)) {
            if (name === 'Administrator') continue;
            await prisma.role.upsert({
                where: { name },
                update: {},
                create: {
                    name,
                    description: data.description,
                    permissions: JSON.stringify(data.permissions),
                    isSystem: true,
                },
            });
            console.log(`  ✓ ${name}`);
        }

        // 2. Create admin user
        console.log('\nTworzenie użytkownika admin...');
        const existingAdmin = await prisma.user.findUnique({ where: { email: 'j.fedko@fedpol.pl' } });

        if (!existingAdmin) {
            const hashedPassword = await bcrypt.hash('admin123', 12);
            await prisma.user.create({
                data: {
                    email: 'j.fedko@fedpol.pl',
                    password: hashedPassword,
                    firstName: 'Józef',
                    lastName: 'Fedko',
                    roleId: adminRole.id,
                    isActive: true,
                },
            });
            console.log('  ✓ Admin utworzony');
            console.log('\n  Email: j.fedko@fedpol.pl');
            console.log('  Hasło: admin123');
        } else {
            console.log('  ⚠ Admin już istnieje');
        }

        console.log('\n=== Inicjalizacja zakończona ===');
    } catch (error) {
        console.error('Błąd:', error);
    } finally {
        await prisma.$disconnect();
    }
}

init();
