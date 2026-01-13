// Run this script once to create the initial admin user
// Usage: node scripts/create-admin.js

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function createAdmin() {
    const prisma = new PrismaClient();

    try {
        // Check if admin already exists
        const existingAdmin = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        if (existingAdmin) {
            console.log('Admin już istnieje:', existingAdmin.email);
            return;
        }

        // Create admin user
        const hashedPassword = await bcrypt.hash('admin123', 12);
        const admin = await prisma.user.create({
            data: {
                email: 'j.fedko@fedpol.pl',
                password: hashedPassword,
                firstName: 'Józef',
                lastName: 'Fedko',
                role: 'ADMIN',
                isActive: true,
            },
        });

        console.log('Admin utworzony pomyślnie!');
        console.log('Email:', admin.email);
        console.log('Hasło: admin123');
        console.log('\n⚠️ Zmień hasło po pierwszym logowaniu!');
    } catch (error) {
        console.error('Błąd:', error);
    } finally {
        await prisma.$disconnect();
    }
}

createAdmin();
