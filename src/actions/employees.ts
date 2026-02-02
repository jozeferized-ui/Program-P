/**
 * @file employees.ts
 * @description Zarządzanie pracownikami i ich uprawnieniami/certyfikatami
 * 
 * Odpowiada za:
 * - CRUD pracowników (tworzenie, odczyt, aktualizacja, usuwanie)
 * - Zarządzanie uprawnieniami/certyfikatami (w tym Paszport BP)
 * - Soft delete (oznaczanie jako usunięte zamiast fizycznego usuwania)
 * 
 * @module actions/employees
 */
'use server';

import { prisma } from '@/lib/prisma';
import { Employee } from '@/types';
import { revalidatePath } from 'next/cache';

/**
 * Pobiera listę wszystkich aktywnych pracowników
 * @returns Tablica pracowników z ich uprawnieniami, posortowana po nazwisku
 */
export async function getEmployees() {
    try {
        const employees = await prisma.employee.findMany({
            where: {
                isDeleted: 0,  // Tylko nieusunięci pracownicy
            },
            include: {
                employeePermissions: true,  // Dołącz uprawnienia/certyfikaty
            },
            orderBy: {
                lastName: 'asc',  // Sortuj alfabetycznie po nazwisku
            },
        });
        // Mapowanie typów Prisma na typy aplikacji
        return employees.map(e => ({
            ...e,
            status: e.status as 'Active' | 'Inactive',
            isDeleted: e.isDeleted || undefined,
        }));
    } catch (error) {
        console.error('Error fetching employees:', error);
        return [];
    }
}

/**
 * Tworzy nowego pracownika w bazie danych
 * @param data - Dane pracownika (imię, nazwisko, stanowisko, kontakt, stawka)
 * @returns Utworzony rekord pracownika
 * @throws Error w przypadku błędu bazy danych
 */
export async function createEmployee(data: Employee) {
    try {
        const { id: _id, ...rest } = data;  // Ignoruj ID, baza przydzieli automatycznie
        const employee = await prisma.employee.create({
            data: {
                firstName: rest.firstName,
                lastName: rest.lastName,
                position: rest.position,
                phone: rest.phone,
                email: rest.email,
                rate: rest.rate,         // Stawka godzinowa
                status: rest.status,     // 'Active' lub 'Inactive'
                isDeleted: 0,            // Nowy = nieusunięty
            },
        });
        revalidatePath('/management');  // Odśwież cache strony zarządzania
        return employee;
    } catch (error) {
        console.error('Error creating employee:', error);
        throw error;
    }
}

/**
 * Aktualizuje dane istniejącego pracownika
 * @param id - ID pracownika do aktualizacji
 * @param data - Częściowe dane do zaktualizowania
 * @returns Zaktualizowany rekord pracownika
 * @throws Error w przypadku błędu bazy danych
 */
export async function updateEmployee(id: number, data: Partial<Employee>) {
    try {
        const employee = await prisma.employee.update({
            where: { id },
            data: {
                firstName: data.firstName,
                lastName: data.lastName,
                position: data.position,
                phone: data.phone,
                email: data.email,
                rate: data.rate,
                status: data.status,
            },
        });
        revalidatePath('/management');
        return employee;
    } catch (error) {
        console.error('Error updating employee:', error);
        throw error;
    }
}

/**
 * Usuwa pracownika (soft delete - oznacza jako usunięty)
 * @param id - ID pracownika do usunięcia
 * @throws Error w przypadku błędu bazy danych
 */
export async function deleteEmployee(id: number) {
    try {
        await prisma.employee.update({
            where: { id },
            data: {
                isDeleted: 1,  // Oznacz jako usunięty (soft delete)
            },
        });
        revalidatePath('/management');
    } catch (error) {
        console.error('Error deleting employee:', error);
        throw error;
    }
}

/**
 * Dodaje nowe uprawnienie/certyfikat do pracownika
 * Obsługuje zarówno standardowe uprawnienia jak i Paszport BP
 * 
 * @param employeeId - ID pracownika
 * @param data - Dane uprawnienia:
 *   - name: Nazwa uprawnienia (lub "Paszport BP")
 *   - issueDate: Data wystawienia
 *   - expiryDate: Data ważności (opcjonalna)
 *   - number: Numer dokumentu (opcjonalny)
 *   - company: Firma (tylko Paszport BP)
 *   - issuer: Wystawca (tylko Paszport BP)
 *   - registryNumber: Numer rejestru (tylko Paszport BP)
 *   - isAuthorizer: Czy polecający (tylko Paszport BP)
 *   - isApprover: Czy dopuszczający (tylko Paszport BP)
 *   - isTeamLeader: Czy kierujący (tylko Paszport BP)
 *   - isCoordinator: Czy koordynujący (tylko Paszport BP)
 * @returns Utworzone uprawnienie
 * @throws Error z komunikatem po polsku
 */
export async function addEmployeePermission(
    employeeId: number,
    data: {
        name: string,
        issueDate: Date,
        expiryDate?: Date | null,
        number?: string,
        company?: string,
        issuer?: string,
        registryNumber?: string,
        isAuthorizer?: boolean,
        isApprover?: boolean,
        isTeamLeader?: boolean,
        isCoordinator?: boolean,
    }
) {
    try {
        const permission = await prisma.employeePermission.create({
            data: {
                employee: {
                    connect: { id: employeeId }  // Połącz z pracownikiem
                },
                name: data.name,
                issueDate: data.issueDate,
                expiryDate: data.expiryDate,
                number: data.number,
                // Pola specyficzne dla Paszportu BP
                company: data.company,
                issuer: data.issuer,
                registryNumber: data.registryNumber,
                isAuthorizer: data.isAuthorizer ?? false,
                isApprover: data.isApprover ?? false,
                isTeamLeader: data.isTeamLeader ?? false,
                isCoordinator: data.isCoordinator ?? false,
            },
        });
        revalidatePath('/management');
        return permission;
    } catch (error) {
        console.error('Error adding employee permission:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Nie udało się dodać uprawnienia: ${message}`);
    }
}

/**
 * Usuwa uprawnienie/certyfikat pracownika (hard delete)
 * @param id - ID uprawnienia do usunięcia
 * @throws Error w przypadku błędu bazy danych
 */
export async function deleteEmployeePermission(id: number) {
    try {
        await prisma.employeePermission.delete({
            where: { id },
        });
        revalidatePath('/management');
    } catch (error) {
        console.error('Error deleting employee permission:', error);
        throw error;
    }
}

/**
 * Aktualizuje istniejące uprawnienie/certyfikat pracownika
 * @param id - ID uprawnienia do aktualizacji
 * @param data - Częściowe dane do zaktualizowania
 * @returns Zaktualizowane uprawnienie
 * @throws Error z komunikatem po polsku
 */
export async function updateEmployeePermission(
    id: number,
    data: {
        name?: string,
        issueDate?: Date,
        expiryDate?: Date | null,
        number?: string,
        company?: string,
        issuer?: string,
        registryNumber?: string,
        isAuthorizer?: boolean,
        isApprover?: boolean,
        isTeamLeader?: boolean,
        isCoordinator?: boolean,
    }
) {
    try {
        const permission = await prisma.employeePermission.update({
            where: { id },
            data: {
                name: data.name,
                issueDate: data.issueDate,
                expiryDate: data.expiryDate,
                number: data.number,
                company: data.company,
                issuer: data.issuer,
                registryNumber: data.registryNumber,
                isAuthorizer: data.isAuthorizer,
                isApprover: data.isApprover,
                isTeamLeader: data.isTeamLeader,
                isCoordinator: data.isCoordinator,
            },
        });
        revalidatePath('/management');
        return permission;
    } catch (error) {
        console.error('Error updating employee permission:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Nie udało się zaktualizować uprawnienia: ${message}`);
    }
}
