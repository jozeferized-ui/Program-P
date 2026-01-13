const { PrismaClient } = require('@prisma/client');
const Database = require('better-sqlite3');

async function migrateRest() {
    const prisma = new PrismaClient();
    const sqlite = new Database('./prisma/dev.db', { readonly: true });

    try {
        console.log('=== Migrating Suppliers and Orders ===');

        // 1. Migrate Suppliers
        const suppliers = sqlite.prepare('SELECT * FROM Supplier WHERE isDeleted = 0').all();
        console.log(`Found ${suppliers.length} suppliers`);
        for (const s of suppliers) {
            await prisma.supplier.create({
                data: {
                    name: s.name,
                    contactPerson: s.contactPerson || null,
                    email: s.email || null,
                    phone: s.phone || null,
                    address: s.address || null,
                    website: s.website || null,
                    notes: s.notes || null,
                    isDeleted: s.isDeleted || 0,
                }
            });
            console.log(`Supplier "${s.name}" migrated`);
        }

        // 2. Get mappings
        const oldProjects = sqlite.prepare('SELECT id, name FROM Project WHERE isDeleted = 0').all();
        const newProjects = await prisma.project.findMany({ where: { isDeleted: 0 } });
        const projectMap = {};
        for (const oldP of oldProjects) {
            const newP = newProjects.find(p => p.name === oldP.name);
            if (newP) projectMap[oldP.id] = newP.id;
        }

        const oldSuppliers = sqlite.prepare('SELECT id, name FROM Supplier WHERE isDeleted = 0').all();
        const newSuppliers = await prisma.supplier.findMany({ where: { isDeleted: 0 } });
        const supplierMap = {};
        for (const oldS of oldSuppliers) {
            const newS = newSuppliers.find(s => s.name === oldS.name);
            if (newS) supplierMap[oldS.id] = newS.id;
        }

        // 3. Migrate Orders
        const orders = sqlite.prepare('SELECT * FROM [Order] WHERE isDeleted = 0').all();
        console.log(`Found ${orders.length} orders`);
        for (const o of orders) {
            const newProjectId = projectMap[o.projectId];
            const newSupplierId = o.supplierId ? supplierMap[o.supplierId] : null;
            if (!newProjectId) {
                console.log(`Skipping order ${o.id} - no project mapping`);
                continue;
            }
            await prisma.order.create({
                data: {
                    projectId: newProjectId,
                    taskId: null,
                    supplierId: newSupplierId,
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

        console.log('=== Migration completed! ===');
    } catch (error) {
        console.error('Migration error:', error);
    } finally {
        await prisma.$disconnect();
        sqlite.close();
    }
}

migrateRest();
