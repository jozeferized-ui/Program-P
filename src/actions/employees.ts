'use server'; // updated schema check

import { prisma } from '@/lib/prisma';
import { Employee } from '@/types';
import { revalidatePath } from 'next/cache';

export async function getEmployees() {
    try {
        const employees = await prisma.employee.findMany({
            where: {
                isDeleted: 0,
            },
            include: {
                employeePermissions: true,
            },
            orderBy: {
                lastName: 'asc',
            },
        });
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

export async function createEmployee(data: Employee) {
    try {
        const { id, ...rest } = data;
        const employee = await prisma.employee.create({
            data: {
                firstName: rest.firstName,
                lastName: rest.lastName,
                position: rest.position,
                phone: rest.phone,
                email: rest.email,
                rate: rest.rate,
                status: rest.status,
                isDeleted: 0,
            },
        });
        revalidatePath('/management'); // Assuming employees are managed in settings
        return employee;
    } catch (error) {
        console.error('Error creating employee:', error);
        throw error;
    }
}

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

export async function deleteEmployee(id: number) {
    try {
        await prisma.employee.update({
            where: { id },
            data: {
                isDeleted: 1,
            },
        });
        revalidatePath('/management');
    } catch (error) {
        console.error('Error deleting employee:', error);
        throw error;
    }
}

export async function addEmployeePermission(employeeId: number, data: { name: string, issueDate: Date, expiryDate?: Date | null, number?: string }) {
    try {
        const permission = await prisma.employeePermission.create({
            data: {
                employeeId,
                name: data.name,
                issueDate: data.issueDate,
                expiryDate: data.expiryDate,
                number: data.number,
            },
        });
        revalidatePath('/management');
        return permission;
    } catch (error) {
        console.error('Error adding employee permission:', error);
        throw error;
    }
}

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
