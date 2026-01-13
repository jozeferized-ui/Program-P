const { PrismaClient } = require('@prisma/client');
const Database = require('better-sqlite3');

async function migrate() {
    // Connect to Neon PostgreSQL
    const prisma = new PrismaClient();

    // Connect to local SQLite
    const sqlite = new Database('./prisma/dev.db', { readonly: true });

    try {
        console.log('Starting migration...');

        // 1. Migrate Clients
        const clients = sqlite.prepare('SELECT * FROM Client WHERE isDeleted = 0').all();
        console.log(`Found ${clients.length} clients`);
        for (const c of clients) {
            await prisma.client.create({
                data: {
                    name: c.name,
                    email: c.email || null,
                    phone: c.phone || null,
                    notes: c.notes || null,
                    color: c.color || null,
                    isDeleted: c.isDeleted || 0,
                }
            });
        }
        console.log('Clients migrated');

        // 2. Migrate Employees
        const employees = sqlite.prepare('SELECT * FROM Employee WHERE isDeleted = 0').all();
        console.log(`Found ${employees.length} employees`);
        for (const e of employees) {
            await prisma.employee.create({
                data: {
                    firstName: e.firstName,
                    lastName: e.lastName,
                    position: e.position,
                    phone: e.phone || '',
                    email: e.email || '',
                    rate: e.rate || 0,
                    status: e.status || 'Active',
                    isDeleted: e.isDeleted || 0,
                }
            });
        }
        console.log('Employees migrated');

        // 3. Migrate Tools
        const tools = sqlite.prepare('SELECT * FROM Tool WHERE isDeleted = 0').all();
        console.log(`Found ${tools.length} tools`);
        for (const t of tools) {
            await prisma.tool.create({
                data: {
                    name: t.name,
                    brand: t.brand || null,
                    model: t.model || null,
                    serialNumber: t.serialNumber || null,
                    status: t.status || 'Available',
                    purchaseDate: t.purchaseDate ? new Date(t.purchaseDate) : new Date(),
                    price: t.price || 0,
                    lastInspectionDate: t.lastInspectionDate ? new Date(t.lastInspectionDate) : null,
                    inspectionExpiryDate: t.inspectionExpiryDate ? new Date(t.inspectionExpiryDate) : null,
                    protocolNumber: t.protocolNumber || null,
                    isDeleted: t.isDeleted || 0,
                }
            });
        }
        console.log('Tools migrated');

        // 4. Migrate Projects
        const projects = sqlite.prepare('SELECT * FROM Project WHERE isDeleted = 0').all();
        console.log(`Found ${projects.length} projects`);
        for (const p of projects) {
            await prisma.project.create({
                data: {
                    clientId: p.clientId,
                    name: p.name,
                    description: p.description || null,
                    status: p.status || 'Active',
                    startDate: p.startDate ? new Date(p.startDate) : null,
                    endDate: p.endDate ? new Date(p.endDate) : null,
                    totalValue: p.totalValue || 0,
                    createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
                    isDeleted: p.isDeleted || 0,
                }
            });
        }
        console.log('Projects migrated');

        console.log('Migration completed successfully!');
    } catch (error) {
        console.error('Migration error:', error);
    } finally {
        await prisma.$disconnect();
        sqlite.close();
    }
}

migrate();
