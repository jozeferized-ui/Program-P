import Dexie, { Table } from 'dexie';
import { Client, Project, Task, Expense, Resource, Supplier, QuotationItem, Order, OrderTemplate, ClientCategory, SupplierCategory, CostEstimateItem, Notification, Employee, Tool, WarehouseItem, WarehouseHistoryItem } from '@/types';

export class ProjectManagementDB extends Dexie {
    clients!: Table<Client>;
    projects!: Table<Project>;
    tasks!: Table<Task>;
    expenses!: Table<Expense>;
    resources!: Table<Resource>;
    suppliers!: Table<Supplier>;
    quotationItems!: Table<QuotationItem>;
    orders!: Table<Order>;
    orderTemplates!: Table<OrderTemplate>;
    clientCategories!: Table<ClientCategory>;
    supplierCategories!: Table<SupplierCategory>;
    costEstimates!: Table<CostEstimateItem>;
    notifications!: Table<Notification>;
    employees!: Table<Employee>;
    tools!: Table<Tool>;
    warehouseItems!: Table<WarehouseItem>;
    warehouseHistory!: Table<WarehouseHistoryItem>;

    constructor() {
        super('ProjectManagementDB');
        this.version(9).stores({
            clients: '++id, name, categoryId',
            projects: '++id, clientId, parentProjectId, *supplierIds, status, quoteDueDate, createdAt',
            tasks: '++id, projectId, status, priority, dueDate, checklist',
            expenses: '++id, projectId, type, orderId',
            resources: '++id, projectId, type',
            suppliers: '++id, name, categoryId',
            quotationItems: '++id, projectId, description, quantity, unit, unitPrice, margin, total, section',
            costEstimates: '++id, projectId, section',
            orders: '++id, projectId, taskId, supplierId, status, date',
            orderTemplates: '++id, title',
            clientCategories: '++id, name',
            supplierCategories: '++id, name'
        });

        // Version 10: Add netAmount and taxRate to expenses
        this.version(10).stores({
            clients: '++id, name, categoryId',
            projects: '++id, clientId, parentProjectId, *supplierIds, status, quoteDueDate, createdAt',
            tasks: '++id, projectId, status, priority, dueDate, checklist',
            expenses: '++id, projectId, type, orderId',
            resources: '++id, projectId, type',
            suppliers: '++id, name, categoryId',
            quotationItems: '++id, projectId, description, quantity, unit, unitPrice, margin, total, section',
            costEstimates: '++id, projectId, section',
            orders: '++id, projectId, taskId, supplierId, status, date',
            orderTemplates: '++id, title',
            clientCategories: '++id, name',
            supplierCategories: '++id, name'
        }).upgrade(async (tx) => {
            // Migration: Calculate netAmount for existing expenses
            const expenses = await tx.table('expenses').toArray();

            for (const expense of expenses) {
                if (!expense.netAmount && expense.amount) {
                    const taxRate = expense.taxRate || 23;
                    const netAmount = expense.amount / (1 + taxRate / 100);

                    await tx.table('expenses').update(expense.id, {
                        netAmount: netAmount,
                        taxRate: taxRate
                    });
                }
            }
        });

        // Version 11: Add quoteStatus and acceptedDate to projects
        this.version(11).stores({
            clients: '++id, name, categoryId',
            projects: '++id, clientId, parentProjectId, *supplierIds, status, quoteDueDate, quoteStatus, acceptedDate, createdAt',
            tasks: '++id, projectId, status, priority, dueDate, checklist',
            expenses: '++id, projectId, type, orderId',
            resources: '++id, projectId, type',
            suppliers: '++id, name, categoryId',
            quotationItems: '++id, projectId, description, quantity, unit, unitPrice, margin, total, section',
            costEstimates: '++id, projectId, section',
            orders: '++id, projectId, taskId, supplierId, status, date',
            orderTemplates: '++id, title',
            clientCategories: '++id, name',
            supplierCategories: '++id, name'
        }).upgrade(async (tx) => {
            // Migration: Set default quoteStatus for existing projects
            const projects = await tx.table('projects').toArray();

            for (const project of projects) {
                if (!project.quoteStatus) {
                    await tx.table('projects').update(project.id, {
                        quoteStatus: 'W trakcie'
                    });
                }
            }
        });
        // Version 12: Add quotationTitle to projects and priceWithMargin to quotationItems
        this.version(12).stores({
            clients: '++id, name, categoryId',
            projects: '++id, clientId, parentProjectId, *supplierIds, status, quoteDueDate, quoteStatus, acceptedDate, createdAt',
            tasks: '++id, projectId, status, priority, dueDate, checklist',
            expenses: '++id, projectId, type, orderId',
            resources: '++id, projectId, type',
            suppliers: '++id, name, categoryId',
            quotationItems: '++id, projectId, description, quantity, unit, unitPrice, margin, priceWithMargin, total, section',
            costEstimates: '++id, projectId, section',
            orders: '++id, projectId, taskId, supplierId, status, date',
            orderTemplates: '++id, title',
            clientCategories: '++id, name',
            supplierCategories: '++id, name'
        });

        // Version 13: Reset quoteStatus 'W trakcie' to undefined to show 'Brak' by default
        this.version(13).stores({
            clients: '++id, name, categoryId',
            projects: '++id, clientId, parentProjectId, *supplierIds, status, quoteDueDate, quoteStatus, acceptedDate, createdAt',
            tasks: '++id, projectId, status, priority, dueDate, checklist',
            expenses: '++id, projectId, type, orderId',
            resources: '++id, projectId, type',
            suppliers: '++id, name, categoryId',
            quotationItems: '++id, projectId, description, quantity, unit, unitPrice, margin, priceWithMargin, total, section',
            costEstimates: '++id, projectId, section',
            orders: '++id, projectId, taskId, supplierId, status, date',
            orderTemplates: '++id, title',
            clientCategories: '++id, name',
            supplierCategories: '++id, name'
        }).upgrade(async (tx) => {
            const projects = await tx.table('projects').toArray();
            for (const project of projects) {
                if (project.quoteStatus === 'W trakcie') {
                    await tx.table('projects').update(project.id, {
                        quoteStatus: undefined
                    });
                }
            }
        });
        // Version 14: Add isDeleted to major tables for Soft Delete
        this.version(14).stores({
            clients: '++id, name, categoryId, isDeleted',
            projects: '++id, clientId, parentProjectId, *supplierIds, status, quoteDueDate, quoteStatus, acceptedDate, createdAt, isDeleted',
            tasks: '++id, projectId, status, priority, dueDate, checklist, isDeleted',
            expenses: '++id, projectId, type, orderId, isDeleted',
            resources: '++id, projectId, type, isDeleted',
            suppliers: '++id, name, categoryId, isDeleted',
            quotationItems: '++id, projectId, description, quantity, unit, unitPrice, margin, priceWithMargin, total, section',
            costEstimates: '++id, projectId, section',
            orders: '++id, projectId, taskId, supplierId, status, date, isDeleted',
            orderTemplates: '++id, title',
            clientCategories: '++id, name',
            supplierCategories: '++id, name'
        }).upgrade(async (tx) => {
            // Initialize isDeleted = 0 for existing records
            const tables = ['clients', 'projects', 'tasks', 'expenses', 'resources', 'suppliers', 'orders'];
            for (const tableName of tables) {
                await tx.table(tableName).toCollection().modify({ isDeleted: 0 });
            }
        });

        // Version 15: Add notifications table
        this.version(15).stores({
            clients: '++id, name, categoryId, isDeleted',
            projects: '++id, clientId, parentProjectId, *supplierIds, status, quoteDueDate, quoteStatus, acceptedDate, createdAt, isDeleted',
            tasks: '++id, projectId, status, priority, dueDate, checklist, isDeleted',
            expenses: '++id, projectId, type, orderId, isDeleted',
            resources: '++id, projectId, type, isDeleted',
            suppliers: '++id, name, categoryId, isDeleted',
            quotationItems: '++id, projectId, description, quantity, unit, unitPrice, margin, priceWithMargin, total, section',
            costEstimates: '++id, projectId, section',
            orders: '++id, projectId, taskId, supplierId, status, date, isDeleted',
            orderTemplates: '++id, title',
            clientCategories: '++id, name',
            supplierCategories: '++id, name',
            notifications: '++id, type, read, createdAt, relatedType, relatedId'
        });

        // Version 16: Add employees and tools tables
        this.version(16).stores({
            clients: '++id, name, categoryId, isDeleted',
            projects: '++id, clientId, parentProjectId, *supplierIds, status, quoteDueDate, quoteStatus, acceptedDate, createdAt, isDeleted',
            tasks: '++id, projectId, status, priority, dueDate, checklist, isDeleted',
            expenses: '++id, projectId, type, orderId, isDeleted',
            resources: '++id, projectId, type, isDeleted',
            suppliers: '++id, name, categoryId, isDeleted',
            quotationItems: '++id, projectId, description, quantity, unit, unitPrice, margin, priceWithMargin, total, section',
            costEstimates: '++id, projectId, section',
            orders: '++id, projectId, taskId, supplierId, status, date, isDeleted',
            orderTemplates: '++id, title',
            clientCategories: '++id, name',
            supplierCategories: '++id, name',
            notifications: '++id, type, read, createdAt, relatedType, relatedId',
            employees: '++id, firstName, lastName, status, isDeleted',
            tools: '++id, name, brand, status, assignedTo, isDeleted'
        });

        // Version 17: Add address and location to projects
        this.version(17).stores({
            clients: '++id, name, categoryId, isDeleted',
            projects: '++id, clientId, parentProjectId, *supplierIds, status, quoteDueDate, quoteStatus, acceptedDate, createdAt, address, lat, lng, isDeleted',
            tasks: '++id, projectId, status, priority, dueDate, checklist, isDeleted',
            expenses: '++id, projectId, type, orderId, isDeleted',
            resources: '++id, projectId, type, isDeleted',
            suppliers: '++id, name, categoryId, isDeleted',
            quotationItems: '++id, projectId, description, quantity, unit, unitPrice, margin, priceWithMargin, total, section',
            costEstimates: '++id, projectId, section',
            orders: '++id, projectId, taskId, supplierId, status, date, isDeleted',
            orderTemplates: '++id, title',
            clientCategories: '++id, name',
            supplierCategories: '++id, name',
            notifications: '++id, type, read, createdAt, relatedType, relatedId',
            employees: '++id, firstName, lastName, status, isDeleted',
            tools: '++id, name, brand, status, assignedTo, isDeleted'
        });

        // Version 18: Add employeeIds to projects
        this.version(18).stores({
            clients: '++id, name, categoryId, isDeleted',
            projects: '++id, clientId, parentProjectId, *supplierIds, *employeeIds, status, quoteDueDate, quoteStatus, acceptedDate, createdAt, address, lat, lng, isDeleted',
            tasks: '++id, projectId, status, priority, dueDate, checklist, isDeleted',
            expenses: '++id, projectId, type, orderId, isDeleted',
            resources: '++id, projectId, type, isDeleted',
            suppliers: '++id, name, categoryId, isDeleted',
            quotationItems: '++id, projectId, description, quantity, unit, unitPrice, margin, priceWithMargin, total, section',
            costEstimates: '++id, projectId, section',
            orders: '++id, projectId, taskId, supplierId, status, date, isDeleted',
            orderTemplates: '++id, title',
            clientCategories: '++id, name',
            supplierCategories: '++id, name',
            notifications: '++id, type, read, createdAt, relatedType, relatedId',
            employees: '++id, firstName, lastName, status, isDeleted',
            tools: '++id, name, brand, status, assignedTo, isDeleted'
        });

        // Version 19: Add warehouseItems table
        this.version(19).stores({
            clients: '++id, name, categoryId, isDeleted',
            projects: '++id, clientId, parentProjectId, *supplierIds, *employeeIds, status, quoteDueDate, quoteStatus, acceptedDate, createdAt, address, lat, lng, isDeleted',
            tasks: '++id, projectId, status, priority, dueDate, checklist, isDeleted',
            expenses: '++id, projectId, type, orderId, isDeleted',
            resources: '++id, projectId, type, isDeleted',
            suppliers: '++id, name, categoryId, isDeleted',
            quotationItems: '++id, projectId, description, quantity, unit, unitPrice, margin, priceWithMargin, total, section',
            costEstimates: '++id, projectId, section',
            orders: '++id, projectId, taskId, supplierId, status, date, isDeleted',
            orderTemplates: '++id, title',
            clientCategories: '++id, name',
            supplierCategories: '++id, name',
            notifications: '++id, type, read, createdAt, relatedType, relatedId',
            employees: '++id, firstName, lastName, status, isDeleted',
            tools: '++id, name, brand, status, assignedTo, isDeleted',
            warehouseItems: '++id, name, category, location, isDeleted',
            warehouseHistory: '++id, itemId, type, date'
        });

        // Version 20: Add quantity and unit to orders
        this.version(20).stores({
            clients: '++id, name, categoryId, isDeleted',
            projects: '++id, clientId, parentProjectId, *supplierIds, *employeeIds, status, quoteDueDate, quoteStatus, acceptedDate, createdAt, address, lat, lng, isDeleted',
            tasks: '++id, projectId, status, priority, dueDate, checklist, isDeleted',
            expenses: '++id, projectId, type, orderId, isDeleted',
            resources: '++id, projectId, type, isDeleted',
            suppliers: '++id, name, categoryId, isDeleted',
            quotationItems: '++id, projectId, description, quantity, unit, unitPrice, margin, priceWithMargin, total, section',
            costEstimates: '++id, projectId, section',
            orders: '++id, projectId, taskId, supplierId, status, date, quantity, unit, isDeleted',
            orderTemplates: '++id, title',
            clientCategories: '++id, name',
            supplierCategories: '++id, name',
            notifications: '++id, type, read, createdAt, relatedType, relatedId',
            employees: '++id, firstName, lastName, status, isDeleted',
            tools: '++id, name, brand, status, assignedTo, isDeleted',
            warehouseItems: '++id, name, category, location, isDeleted',
            warehouseHistory: '++id, itemId, type, date'
        });

        // Version 21: Add addedToWarehouse to orders
        this.version(21).stores({
            clients: '++id, name, categoryId, isDeleted',
            projects: '++id, clientId, parentProjectId, *supplierIds, *employeeIds, status, quoteDueDate, quoteStatus, acceptedDate, createdAt, address, lat, lng, isDeleted',
            tasks: '++id, projectId, status, priority, dueDate, checklist, isDeleted',
            expenses: '++id, projectId, type, orderId, isDeleted',
            resources: '++id, projectId, type, isDeleted',
            suppliers: '++id, name, categoryId, isDeleted',
            quotationItems: '++id, projectId, description, quantity, unit, unitPrice, margin, priceWithMargin, total, section',
            costEstimates: '++id, projectId, section',
            orders: '++id, projectId, taskId, supplierId, status, date, quantity, unit, addedToWarehouse, isDeleted',
            orderTemplates: '++id, title',
            clientCategories: '++id, name',
            supplierCategories: '++id, name',
            notifications: '++id, type, read, createdAt, relatedType, relatedId',
            employees: '++id, firstName, lastName, status, isDeleted',
            tools: '++id, name, brand, status, assignedTo, isDeleted',
            warehouseItems: '++id, name, category, location, isDeleted',
            warehouseHistory: '++id, itemId, type, date'
        });
    }
}

export const db = new ProjectManagementDB();
