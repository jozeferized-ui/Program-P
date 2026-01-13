const { PrismaClient } = require('@prisma/client');
const Database = require('better-sqlite3');

async function migrateTasksOrders() {
    const prisma = new PrismaClient();
    const sqlite = new Database('./prisma/dev.db', { readonly: true });

    try {
        console.log('Migrating Tasks and Orders...');

        // Get project ID mapping (old -> new)
        const oldProjects = sqlite.prepare('SELECT id, name FROM Project WHERE isDeleted = 0').all();
        const newProjects = await prisma.project.findMany({ where: { isDeleted: 0 } });

        // Map old project IDs to new ones by name
        const projectMap = {};
        for (const oldP of oldProjects) {
            const newP = newProjects.find(p => p.name === oldP.name);
            if (newP) projectMap[oldP.id] = newP.id;
        }
        console.log('Project mapping:', projectMap);

        // Migrate Tasks
        const tasks = sqlite.prepare('SELECT * FROM Task WHERE isDeleted = 0').all();
        console.log(`Found ${tasks.length} tasks`);
        for (const t of tasks) {
            const newProjectId = projectMap[t.projectId];
            if (!newProjectId) {
                console.log(`Skipping task ${t.id} - no project mapping`);
                continue;
            }
            await prisma.task.create({
                data: {
                    projectId: newProjectId,
                    title: t.title,
                    description: t.description || null,
                    status: t.status || 'Todo',
                    priority: t.priority || 'Medium',
                    dueDate: t.dueDate ? new Date(t.dueDate) : null,
                    subtasks: t.subtasks || null,
                    checklist: t.checklist || null,
                    createdAt: t.createdAt ? new Date(t.createdAt) : new Date(),
                    isDeleted: t.isDeleted || 0,
                }
            });
        }
        console.log('Tasks migrated');

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
                    taskId: null, // Tasks have different IDs now
                    supplierId: o.supplierId || null,
                    name: o.name || 'Zamówienie',
                    grossAmount: o.grossAmount || 0,
                    netAmount: o.netAmount || null,
                    taxRate: o.taxRate || null,
                    status: o.status || 'Pending',
                    expectedDelivery: o.expectedDelivery ? new Date(o.expectedDelivery) : null,
                    quantity: o.quantity || null,
                    unit: o.unit || null,
                    notes: o.notes || null,
                    url: o.url || null,
                    isDeleted: o.isDeleted || 0,
                    addedToWarehouse: o.addedToWarehouse === 1,
                }
            });
        }
        console.log('Orders migrated');

        console.log('Migration of Tasks and Orders completed!');
    } catch (error) {
        console.error('Migration error:', error);
    } finally {
        await prisma.$disconnect();
        sqlite.close();
    }
}

migrateTasksOrders();
