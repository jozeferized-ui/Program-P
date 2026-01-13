const { PrismaClient } = require('@prisma/client');
const Database = require('better-sqlite3');

async function migrateOrders() {
    const prisma = new PrismaClient();
    const sqlite = new Database('./prisma/dev.db', { readonly: true });

    try {
        console.log('Migrating Orders...');

        // Get project ID mapping (old -> new)
        const oldProjects = sqlite.prepare('SELECT id, name FROM Project WHERE isDeleted = 0').all();
        const newProjects = await prisma.project.findMany({ where: { isDeleted: 0 } });

        const projectMap = {};
        for (const oldP of oldProjects) {
            const newP = newProjects.find(p => p.name === oldP.name);
            if (newP) projectMap[oldP.id] = newP.id;
        }

        // Migrate Orders
        const orders = sqlite.prepare('SELECT * FROM [Order] WHERE isDeleted = 0').all();
        console.log(`Found ${orders.length} orders`);
        for (const o of orders) {
            const newProjectId = projectMap[o.projectId];
            if (!newProjectId) {
                console.log(`Skipping order ${o.id} - no project mapping`);
                continue;
            }
            await prisma.order.create({
                data: {
                    projectId: newProjectId,
                    taskId: null,
                    supplierId: o.supplierId || null,
                    title: o.title || 'Zamówienie',
                    amount: o.amount || 0,
                    netAmount: o.netAmount || null,
                    taxRate: o.taxRate || null,
                    status: o.status || 'Pending',
                    date: o.date ? new Date(o.date) : new Date(),
                    quantity: o.quantity || null,
                    unit: o.unit || null,
                    notes: o.notes || null,
                    url: o.url || null,
                    isDeleted: o.isDeleted || 0,
                    addedToWarehouse: o.addedToWarehouse === 1 || o.addedToWarehouse === true,
                }
            });
            console.log(`Order "${o.title}" migrated`);
        }
        console.log('Orders migration completed!');
    } catch (error) {
        console.error('Migration error:', error);
    } finally {
        await prisma.$disconnect();
        sqlite.close();
    }
}

migrateOrders();
