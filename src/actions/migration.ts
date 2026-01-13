'use server';

import { prisma } from '@/lib/prisma';
import {
    Client, Project, Task, Expense, Resource, Supplier,
    QuotationItem, Order, OrderTemplate, ClientCategory,
    SupplierCategory, CostEstimateItem, Notification,
    Employee, Tool, WarehouseItem, WarehouseHistoryItem
} from '@/types';

interface MigrationData {
    clients: Client[];
    projects: Project[];
    tasks: Task[];
    expenses: Expense[];
    resources: Resource[];
    suppliers: Supplier[];
    quotationItems: QuotationItem[];
    orders: Order[];
    orderTemplates: OrderTemplate[];
    clientCategories: ClientCategory[];
    supplierCategories: SupplierCategory[];
    costEstimates: CostEstimateItem[];
    notifications: Notification[];
    employees: Employee[];
    tools: Tool[];
    warehouseItems: WarehouseItem[];
    warehouseHistory: WarehouseHistoryItem[];
}

export async function migrateData(data: MigrationData) {
    console.log('Starting migration...');
    try {
        await prisma.$transaction(async (tx) => {
            // 1. Cleanup: Delete all existing data in reverse dependency order
            console.log('Cleaning up existing data...');

            // Level 4: Depend on Orders
            await tx.expense.deleteMany();

            // Level 3: Depend on Tasks/Projects/Suppliers
            await tx.order.deleteMany();

            // Level 2: Depend on Projects
            await tx.task.deleteMany();
            await tx.resource.deleteMany();
            await tx.quotationItem.deleteMany();
            await tx.costEstimateItem.deleteMany();

            // Level 1: Projects (Handle self-relation by setting parentId to null first)
            await tx.project.updateMany({ data: { parentProjectId: null } });
            await tx.project.deleteMany();

            // Level 0: Independent / Base entities
            await tx.tool.deleteMany(); // Depends on Employee? Schema says `assignedTo` -> Employee. So delete Tool first.
            await tx.employee.deleteMany();
            await tx.warehouseHistoryItem.deleteMany();
            await tx.warehouseItem.deleteMany();
            await tx.client.deleteMany();
            await tx.supplier.deleteMany();
            await tx.clientCategory.deleteMany();
            await tx.supplierCategory.deleteMany();
            await tx.orderTemplate.deleteMany();
            await tx.notification.deleteMany();

            console.log('Cleanup complete. Starting import...');

            // 2. Import Base Entities
            if (data.clientCategories.length) await tx.clientCategory.createMany({ data: data.clientCategories });
            if (data.supplierCategories.length) await tx.supplierCategory.createMany({ data: data.supplierCategories });
            if (data.orderTemplates.length) await tx.orderTemplate.createMany({ data: data.orderTemplates });
            if (data.notifications.length) await tx.notification.createMany({ data: data.notifications });

            // Employees
            for (const emp of data.employees) {
                const { id, ...empData } = emp as any;
                await tx.employee.create({ data: empData });
            }

            // Tools (depend on Employees)
            for (const tool of data.tools) {
                const { id, assignedEmployees, category, ...rest } = tool as any;
                const employeeIds = tool.assignedEmployees?.map((e: any) => e.id) || [];
                await tx.tool.create({
                    data: {
                        ...rest,
                        assignedEmployees: employeeIds.length > 0 ? {
                            connect: employeeIds.map((eid: number) => ({ id: eid }))
                        } : undefined
                    }
                });
            }

            // Warehouse
            if (data.warehouseItems.length) await tx.warehouseItem.createMany({ data: data.warehouseItems });
            if (data.warehouseHistory.length) await tx.warehouseHistoryItem.createMany({ data: data.warehouseHistory });

            // Clients & Suppliers (depend on Categories)
            for (const client of data.clients) {
                await tx.client.create({ data: client });
            }
            for (const supplier of data.suppliers) {
                await tx.supplier.create({ data: supplier });
            }

            // 3. Import Projects (Two passes)
            // Pass 1: Create projects without relations
            console.log(`Importing ${data.projects.length} projects...`);
            for (const p of data.projects) {
                const project = p as any; // Cast to any to handle potential extra fields from Dexie export
                const {
                    supplierIds, employeeIds, parentProjectId,
                    client, suppliers, employees, subProjects, // Exclude included relations from Dexie
                    ...rest
                } = project;

                await tx.project.create({
                    data: {
                        ...rest,
                        clientId: rest.clientId,
                        parentProjectId: null, // Set later
                        // Ensure optional fields are null if undefined
                        description: rest.description || null,
                        startDate: rest.startDate || null,
                        endDate: rest.endDate || null,
                        quoteDueDate: rest.quoteDueDate || null,
                        quoteStatus: rest.quoteStatus || null,
                        quotationTitle: rest.quotationTitle || null,
                        acceptedDate: rest.acceptedDate || null,
                        address: rest.address || null,
                        lat: rest.lat || null,
                        lng: rest.lng || null,
                        deletedAt: rest.deletedAt || null,
                    }
                });
            }

            // Pass 2: Update projects with relations (Parent, Suppliers, Employees)
            for (const project of data.projects) {
                await tx.project.update({
                    where: { id: project.id },
                    data: {
                        parentProjectId: project.parentProjectId || null,
                        suppliers: project.supplierIds && project.supplierIds.length > 0 ? {
                            connect: project.supplierIds.map(id => ({ id }))
                        } : undefined,
                        employees: project.employeeIds && project.employeeIds.length > 0 ? {
                            connect: project.employeeIds.map(id => ({ id }))
                        } : undefined,
                    }
                });
            }

            // 4. Import Project Dependents
            // Tasks
            if (data.tasks.length) {
                await tx.task.createMany({
                    data: data.tasks.map(t => ({
                        ...t,
                        description: t.description || null,
                        dueDate: t.dueDate || null,
                        subtasks: t.subtasks ? (typeof t.subtasks === 'string' ? t.subtasks : JSON.stringify(t.subtasks)) : null,
                        checklist: t.checklist ? (typeof t.checklist === 'string' ? t.checklist : JSON.stringify(t.checklist)) : null,
                        deletedAt: t.deletedAt || null
                    }))
                });
            }

            // Resources
            if (data.resources.length) {
                await tx.resource.createMany({
                    data: data.resources.map(r => {
                        const res = r as any;
                        return {
                            ...r,
                            contentBlob: res.contentBlob || null,
                            contentUrl: res.contentUrl || null,
                            folder: res.folder || null,
                            deletedAt: res.deletedAt || null
                        };
                    })
                });
            }

            // Quotation Items
            if (data.quotationItems.length) {
                await tx.quotationItem.createMany({
                    data: data.quotationItems.map(q => ({
                        ...q,
                        margin: q.margin || null,
                        priceWithMargin: q.priceWithMargin || null,
                        section: q.section || null
                    }))
                });
            }

            // Cost Estimate Items
            if (data.costEstimates.length) {
                await tx.costEstimateItem.createMany({ data: data.costEstimates });
            }

            // Orders (depend on Projects, Tasks, Suppliers)
            if (data.orders.length) {
                await tx.order.createMany({
                    data: data.orders.map(o => ({
                        ...o,
                        taskId: o.taskId || null,
                        supplierId: o.supplierId || null,
                        netAmount: o.netAmount || null,
                        taxRate: o.taxRate || null,
                        quantity: o.quantity || null,
                        unit: o.unit || null,
                        notes: o.notes || null,
                        url: o.url || null,
                        deletedAt: o.deletedAt || null,
                        addedToWarehouse: o.addedToWarehouse || false
                    }))
                });
            }

            // Expenses (depend on Projects, Orders)
            if (data.expenses.length) {
                await tx.expense.createMany({
                    data: data.expenses.map(e => ({
                        ...e,
                        netAmount: e.netAmount || null,
                        taxRate: e.taxRate || null,
                        orderId: e.orderId || null,
                        deletedAt: e.deletedAt || null
                    }))
                });
            }
        });

        console.log('Migration completed successfully.');
        return { success: true };
    } catch (error) {
        console.error('Migration failed:', error);
        return { success: false, error: String(error) };
    }
}
