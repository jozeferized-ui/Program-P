/**
 * @file validations.ts
 * @description Schematy walidacji Zod dla formularzy
 * 
 * Zawiera schematy walidacji dla:
 * - Projektów i zadań
 * - Klientów i dostawców
 * - Zamówień i wydatków
 * - Użytkowników i logowania
 * - Komentarzy
 * 
 * @module lib/validations
 */

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// PROJEKTY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Schemat walidacji projektu
 */
export const ProjectSchema = z.object({
    name: z.string().min(1, 'Nazwa jest wymagana').max(200),
    clientId: z.number().int().positive(),
    description: z.string().max(5000).optional(),
    status: z.enum(['Active', 'Completed', 'On Hold', 'To Quote']),
    startDate: z.date().optional().nullable(),
    endDate: z.date().optional().nullable(),
    totalValue: z.number().min(0).default(0),
    address: z.string().max(500).optional(),
    lat: z.number().optional().nullable(),
    lng: z.number().optional().nullable(),
    colorMarker: z.string().max(50).optional().nullable(),
    parentProjectId: z.number().int().positive().optional().nullable(),
});

/** Schemat aktualizacji projektu (wszystkie pola opcjonalne) */
export const ProjectUpdateSchema = ProjectSchema.partial();

// ─────────────────────────────────────────────────────────────────────────────
// ZADANIA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Schemat walidacji zadania
 */
export const TaskSchema = z.object({
    projectId: z.number().int().positive(),
    title: z.string().min(1, 'Tytuł jest wymagany').max(500),
    description: z.string().max(5000).optional(),
    status: z.enum(['To Do', 'In Progress', 'Done']),
    priority: z.enum(['Low', 'Medium', 'High']),
    dueDate: z.date().optional().nullable(),
    checklist: z.array(z.object({
        id: z.string(),
        text: z.string(),
        done: z.boolean(),
    })).optional(),
    subtasks: z.array(z.object({
        id: z.string(),
        text: z.string(),
        done: z.boolean(),
    })).optional(),
});

/** Schemat aktualizacji zadania */
export const TaskUpdateSchema = TaskSchema.partial();

// ─────────────────────────────────────────────────────────────────────────────
// KLIENCI
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Schemat walidacji klienta
 */
export const ClientSchema = z.object({
    name: z.string().min(1, 'Nazwa jest wymagana').max(200),
    email: z.string().email('Nieprawidłowy email').optional().or(z.literal('')),
    phone: z.string().max(50).optional(),
    notes: z.string().max(5000).optional(),
    color: z.string().max(50).optional(),
    categoryId: z.number().int().positive().optional().nullable(),
});

// ─────────────────────────────────────────────────────────────────────────────
// ZAMÓWIENIA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Schemat walidacji zamówienia
 */
export const OrderSchema = z.object({
    projectId: z.number().int().positive(),
    taskId: z.number().int().positive().optional().nullable(),
    supplierId: z.number().int().positive().optional().nullable(),
    title: z.string().min(1, 'Tytuł jest wymagany').max(500),
    amount: z.number().min(0),
    netAmount: z.number().min(0).optional().nullable(),
    taxRate: z.number().min(0).max(100).optional().nullable(),
    status: z.enum(['To Order', 'Ordered', 'Delivered', 'Cancelled']),
    date: z.date(),
    quantity: z.number().min(0).optional().nullable(),
    unit: z.string().max(50).optional().nullable(),
    notes: z.string().max(5000).optional().nullable(),
    url: z.string().url().optional().or(z.literal('')).nullable(),
});

// ─────────────────────────────────────────────────────────────────────────────
// UŻYTKOWNICY I LOGOWANIE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Schemat walidacji logowania
 */
export const LoginSchema = z.object({
    email: z.string().email('Nieprawidłowy email'),
    password: z.string().min(4, 'Hasło musi mieć min. 4 znaki'),
});

/**
 * Schemat tworzenia nowego użytkownika
 */
export const CreateUserSchema = z.object({
    email: z.string().email('Nieprawidłowy email'),
    password: z.string().min(6, 'Hasło musi mieć min. 6 znaków'),
    firstName: z.string().min(1, 'Imię jest wymagane').max(100),
    lastName: z.string().min(1, 'Nazwisko jest wymagane').max(100),
    roleId: z.number().int().positive(),
});

// ─────────────────────────────────────────────────────────────────────────────
// KOMENTARZE I WYDATKI
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Schemat walidacji komentarza
 */
export const CommentSchema = z.object({
    projectId: z.number().int().positive(),
    content: z.string().min(1, 'Treść jest wymagana').max(10000),
});

/**
 * Schemat walidacji wydatku
 */
export const ExpenseSchema = z.object({
    projectId: z.number().int().positive(),
    title: z.string().min(1, 'Nazwa jest wymagana').max(500),
    amount: z.number().min(0),
    date: z.date(),
    category: z.string().max(100).optional(),
    notes: z.string().max(5000).optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// DOSTAWCY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Schemat walidacji dostawcy
 */
export const SupplierSchema = z.object({
    name: z.string().min(1, 'Nazwa jest wymagana').max(200),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().max(50).optional(),
    address: z.string().max(500).optional(),
    notes: z.string().max(5000).optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// TYPY EKSPORTOWE
// ─────────────────────────────────────────────────────────────────────────────

/** Typ wejściowy projektu */
export type ProjectInput = z.infer<typeof ProjectSchema>;
/** Typ wejściowy zadania */
export type TaskInput = z.infer<typeof TaskSchema>;
/** Typ wejściowy klienta */
export type ClientInput = z.infer<typeof ClientSchema>;
/** Typ wejściowy zamówienia */
export type OrderInput = z.infer<typeof OrderSchema>;
/** Typ wejściowy logowania */
export type LoginInput = z.infer<typeof LoginSchema>;
/** Typ tworzenia użytkownika */
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
/** Typ wejściowy komentarza */
export type CommentInput = z.infer<typeof CommentSchema>;
/** Typ wejściowy wydatku */
export type ExpenseInput = z.infer<typeof ExpenseSchema>;
/** Typ wejściowy dostawcy */
export type SupplierInput = z.infer<typeof SupplierSchema>;
