/**
 * @file migration.ts
 * @description Migracja danych z IndexedDB (Dexie) do PostgreSQL
 * 
 * Odpowiada za:
 * - Import wszystkich danych z lokalnej bazy Dexie
 * - Zachowanie relacji między encjami
 * - Obsługę self-relacji (projekty-podprojekty)
 * - Transakcyjne czyszczenie i import
 * 
 * @module actions/migration
 */
'use server';

import { prisma } from '@/lib/prisma';
import {
    Client, Project, Task, Expense, Resource, Supplier,
    QuotationItem, Order, OrderTemplate, ClientCategory,
    SupplierCategory, CostEstimateItem, Notification,
    Employee, Tool, WarehouseItem, WarehouseHistoryItem
} from '@/types';

/**
 * Struktura danych do migracji
 * Zawiera wszystkie encje z lokalnej bazy Dexie
 */
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

/**
 * Migruje wszystkie dane z IndexedDB do PostgreSQL
 * 
 * Kolejność operacji:
 * 1. Czyszczenie bazy (w odwrotnej kolejności zależności)
 * 2. Import encji bazowych (kategorie, szablony, powiadomienia)
 * 3. Import pracowników i narzędzi
 * 4. Import magazynu
 * 5. Import klientów i dostawców
 * 6. Import projektów (dwa przebiegi dla self-relacji)
 * 7. Import zależnych danych projektów (zadania, zasoby, wyceny, zamówienia)
 * 8. Import wydatków
 * 
 * @param data - Pełne dane do migracji
 * @returns Obiekt z success i opcjonalnie error
 */
export async function migrateData(data: MigrationData) {
    console.log('Starting migration...');
    try {
        await prisma.$transaction(async (tx) => {
            // ─────────────────────────────────────────────────────────
            // 1. CZYSZCZENIE ISTNIEJĄCYCH DANYCH
            // Kolejność: od najbardziej zależnych do niezależnych
            // ─────────────────────────────────────────────────────────
            console.log('Cleaning up existing data...');

            // Poziom 4: Zależne od Orders
            await tx.expense.deleteMany();

            // Poziom 3: Zależne od Tasks/Projects/Suppliers
            await tx.order.deleteMany();

            // Poziom 2: Zależne od Projects
            await tx.task.deleteMany();
            await tx.resource.deleteMany();
            await tx.quotationItem.deleteMany();
            await tx.costEstimateItem.deleteMany();

            // Poziom 1: Projekty (self-relacja - najpierw usuń parentId)
            await tx.project.updateMany({ data: { parentProjectId: null } });
            await tx.project.deleteMany();

            // Poziom 0: Encje bazowe
            await tx.tool.deleteMany();       // Zależne od Employee
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

            // ─────────────────────────────────────────────────────────
            // 2. IMPORT ENCJI BAZOWYCH
            // ─────────────────────────────────────────────────────────
            if (data.clientCategories.length) await tx.clientCategory.createMany({ data: data.clientCategories });
            if (data.supplierCategories.length) await tx.supplierCategory.createMany({ data: data.supplierCategories });
            if (data.orderTemplates.length) await tx.orderTemplate.createMany({ data: data.orderTemplates });
            if (data.notifications.length) await tx.notification.createMany({ data: data.notifications });

            // ─────────────────────────────────────────────────────────
            // 3. PRACOWNICY I NARZĘDZIA
            // ─────────────────────────────────────────────────────────
            for (const emp of data.employees) {
                const { id: _id, ...empData } = emp as any;
                await tx.employee.create({ data: empData });
            }

            // Narzędzia z przypisaniami do pracowników
            for (const tool of data.tools) {
                const { id: _id, assignedEmployees: _assignedEmployees, category: _category, ...rest } = tool as any;
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

            // ─────────────────────────────────────────────────────────
            // 4. MAGAZYN
            // ─────────────────────────────────────────────────────────
            if (data.warehouseItems.length) await tx.warehouseItem.createMany({ data: data.warehouseItems });
            if (data.warehouseHistory.length) await tx.warehouseHistoryItem.createMany({ data: data.warehouseHistory });

            // ─────────────────────────────────────────────────────────
            // 5. KLIENCI I DOSTAWCY
            // ─────────────────────────────────────────────────────────
            for (const client of data.clients) {
                await tx.client.create({ data: client });
            }
            for (const supplier of data.suppliers) {
                await tx.supplier.create({ data: supplier });
            }

            // ─────────────────────────────────────────────────────────
            // 6. PROJEKTY (dwa przebiegi dla self-relacji)
            // ─────────────────────────────────────────────────────────
            console.log(`Importing ${data.projects.length} projects...`);

            // Przebieg 1: Utwórz projekty bez relacji
            for (const p of data.projects) {
                const project = p as any;
                const {
                    supplierIds: _supplierIds, employeeIds: _employeeIds, parentProjectId: _parentProjectId,
                    client: _client, suppliers: _suppliers, employees: _employees, subProjects: _subProjects,
                    ...rest
                } = project;

                await tx.project.create({
                    data: {
                        ...rest,
                        clientId: rest.clientId,
                        parentProjectId: null,  // Ustaw później
                        // Zamień undefined na null dla bazy danych
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

            // Przebieg 2: Ustaw relacje (parent, suppliers, employees)
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

            // ─────────────────────────────────────────────────────────
            // 7. DANE ZALEŻNE OD PROJEKTÓW
            // ─────────────────────────────────────────────────────────

            // Zadania
            if (data.tasks.length) {
                await tx.task.createMany({
                    data: data.tasks.map(t => ({
                        ...t,
                        description: t.description || null,
                        dueDate: t.dueDate || null,
                        // Serializuj tablice do JSON jeśli nie są już stringami
                        subtasks: t.subtasks ? (typeof t.subtasks === 'string' ? t.subtasks : JSON.stringify(t.subtasks)) : null,
                        checklist: t.checklist ? (typeof t.checklist === 'string' ? t.checklist : JSON.stringify(t.checklist)) : null,
                        deletedAt: t.deletedAt || null
                    }))
                });
            }

            // Zasoby
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

            // Pozycje wycen
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

            // Wyceny kosztów
            if (data.costEstimates.length) {
                await tx.costEstimateItem.createMany({ data: data.costEstimates });
            }

            // Zamówienia
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

            // ─────────────────────────────────────────────────────────
            // 8. WYDATKI (zależne od projektów i zamówień)
            // ─────────────────────────────────────────────────────────
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
