/**
 * @file db.ts
 * @description Konfiguracja lokalnej bazy danych Dexie (IndexedDB)
 * 
 * Ten plik zawiera:
 * - Definicję schematu bazy danych Dexie
 * - Historię migracji (wersje 9-21)
 * - Eksport singleton instancji `db`
 * 
 * UWAGA: Ta baza jest używana jako fallback/offline storage.
 * Główna baza danych to PostgreSQL (przez Prisma).
 * 
 * @module lib/db
 */

import Dexie, { Table } from 'dexie';
import { Client, Project, Task, Expense, Resource, Supplier, QuotationItem, Order, OrderTemplate, ClientCategory, SupplierCategory, CostEstimateItem, Notification, Employee, Tool, WarehouseItem, WarehouseHistoryItem } from '@/types';

/**
 * Klasa bazy danych Dexie dla zarządzania projektami
 * Rozszerza Dexie i definiuje wszystkie tabele
 */
export class ProjectManagementDB extends Dexie {
    /** Tabela klientów */
    clients!: Table<Client>;
    /** Tabela projektów */
    projects!: Table<Project>;
    /** Tabela zadań */
    tasks!: Table<Task>;
    /** Tabela wydatków */
    expenses!: Table<Expense>;
    /** Tabela zasobów/plików */
    resources!: Table<Resource>;
    /** Tabela dostawców */
    suppliers!: Table<Supplier>;
    /** Tabela pozycji wycen */
    quotationItems!: Table<QuotationItem>;
    /** Tabela zamówień */
    orders!: Table<Order>;
    /** Tabela szablonów zamówień */
    orderTemplates!: Table<OrderTemplate>;
    /** Tabela kategorii klientów */
    clientCategories!: Table<ClientCategory>;
    /** Tabela kategorii dostawców */
    supplierCategories!: Table<SupplierCategory>;
    /** Tabela wycen kosztów */
    costEstimates!: Table<CostEstimateItem>;
    /** Tabela powiadomień */
    notifications!: Table<Notification>;
    /** Tabela pracowników */
    employees!: Table<Employee>;
    /** Tabela narzędzi */
    tools!: Table<Tool>;
    /** Tabela pozycji magazynowych */
    warehouseItems!: Table<WarehouseItem>;
    /** Tabela historii magazynu */
    warehouseHistory!: Table<WarehouseHistoryItem>;

    constructor() {
        super('ProjectManagementDB');

        // ─────────────────────────────────────────────────────────────────────
        // WERSJA 9: Bazowy schemat
        // ─────────────────────────────────────────────────────────────────────
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

        // ─────────────────────────────────────────────────────────────────────
        // WERSJA 10: Dodanie netAmount i taxRate do wydatków
        // ─────────────────────────────────────────────────────────────────────
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
            // Migracja: Oblicz netAmount dla istniejących wydatków
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

        // ─────────────────────────────────────────────────────────────────────
        // WERSJA 11: Dodanie quoteStatus i acceptedDate do projektów
        // ─────────────────────────────────────────────────────────────────────
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
            // Migracja: Ustaw domyślny quoteStatus
            const projects = await tx.table('projects').toArray();

            for (const project of projects) {
                if (!project.quoteStatus) {
                    await tx.table('projects').update(project.id, {
                        quoteStatus: 'W trakcie'
                    });
                }
            }
        });

        // ─────────────────────────────────────────────────────────────────────
        // WERSJA 12: Dodanie quotationTitle i priceWithMargin
        // ─────────────────────────────────────────────────────────────────────
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

        // ─────────────────────────────────────────────────────────────────────
        // WERSJA 13: Reset quoteStatus 'W trakcie' -> undefined
        // ─────────────────────────────────────────────────────────────────────
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

        // ─────────────────────────────────────────────────────────────────────
        // WERSJA 14: Soft Delete (isDeleted) dla głównych tabel
        // ─────────────────────────────────────────────────────────────────────
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
            // Inicjalizuj isDeleted = 0 dla istniejących rekordów
            const tables = ['clients', 'projects', 'tasks', 'expenses', 'resources', 'suppliers', 'orders'];
            for (const tableName of tables) {
                await tx.table(tableName).toCollection().modify({ isDeleted: 0 });
            }
        });

        // ─────────────────────────────────────────────────────────────────────
        // WERSJA 15: Tabela powiadomień
        // ─────────────────────────────────────────────────────────────────────
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

        // ─────────────────────────────────────────────────────────────────────
        // WERSJA 16: Tabele pracowników i narzędzi
        // ─────────────────────────────────────────────────────────────────────
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

        // ─────────────────────────────────────────────────────────────────────
        // WERSJA 17: Adres i lokalizacja w projektach
        // ─────────────────────────────────────────────────────────────────────
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

        // ─────────────────────────────────────────────────────────────────────
        // WERSJA 18: employeeIds w projektach
        // ─────────────────────────────────────────────────────────────────────
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

        // ─────────────────────────────────────────────────────────────────────
        // WERSJA 19: Tabela magazynu
        // ─────────────────────────────────────────────────────────────────────
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

        // ─────────────────────────────────────────────────────────────────────
        // WERSJA 20: quantity i unit w zamówieniach
        // ─────────────────────────────────────────────────────────────────────
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

        // ─────────────────────────────────────────────────────────────────────
        // WERSJA 21: addedToWarehouse w zamówieniach (aktualna)
        // ─────────────────────────────────────────────────────────────────────
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

/** Singleton instancja bazy danych Dexie */
export const db = new ProjectManagementDB();
