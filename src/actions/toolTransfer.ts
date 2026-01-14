'use server';

import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { jwtVerify, SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

// Authenticate user for tool transfer (via QR page)
export async function authenticateForToolTransfer(email: string, password: string, toolId: number) {
    try {
        // Find user by email
        const user = await (prisma as any).user.findUnique({
            where: { email },
            include: { role: true }
        });

        if (!user) {
            return { success: false, error: 'Nieprawidłowy email lub hasło' };
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return { success: false, error: 'Nieprawidłowy email lub hasło' };
        }

        // Get tool with assigned employees
        const tool = await (prisma as any).tool.findUnique({
            where: { id: toolId },
            include: { assignedEmployees: true }
        });

        if (!tool) {
            return { success: false, error: 'Narzędzie nie znalezione' };
        }

        // Check if user is linked to an employee who is assigned to this tool
        // For simplicity, we'll allow any logged-in user to transfer
        // In production, you might want to verify employee-user link

        // Create a temporary token for this session
        const token = await new SignJWT({
            userId: user.id,
            toolId: toolId,
            purpose: 'tool-transfer'
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setExpirationTime('1h')
            .sign(JWT_SECRET);

        // Set cookie for tool transfer session
        const cookieStore = await cookies();
        cookieStore.set('tool-transfer-token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60, // 1 hour
        });

        return {
            success: true,
            user: {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName
            }
        };
    } catch (error) {
        console.error('Auth error:', error);
        return { success: false, error: 'Błąd uwierzytelniania' };
    }
}

// Transfer tool to another employee
export async function transferTool(toolId: number, toEmployeeId: number, notes?: string) {
    try {
        // Verify transfer token
        const cookieStore = await cookies();
        const token = cookieStore.get('tool-transfer-token')?.value;

        if (!token) {
            return { success: false, error: 'Sesja wygasła. Zaloguj się ponownie.' };
        }

        const { payload } = await jwtVerify(token, JWT_SECRET);
        if (payload.toolId !== toolId || payload.purpose !== 'tool-transfer') {
            return { success: false, error: 'Nieprawidłowy token' };
        }

        // Get current tool state
        const tool = await (prisma as any).tool.findUnique({
            where: { id: toolId },
            include: { assignedEmployees: true, transferredTo: true }
        });

        if (!tool) {
            return { success: false, error: 'Narzędzie nie znalezione' };
        }

        // Get the "from" employee (current transferredTo or first assigned)
        const fromEmployeeId = tool.transferredToId || tool.assignedEmployees[0]?.id;

        if (!fromEmployeeId) {
            return { success: false, error: 'Brak przypisanej osoby' };
        }

        // Update tool with new transfer
        await (prisma as any).tool.update({
            where: { id: toolId },
            data: {
                transferredToId: toEmployeeId,
                transferredAt: new Date(),
                transferNotes: notes || null,
            }
        });

        // Create transfer history record
        await (prisma as any).toolTransfer.create({
            data: {
                toolId,
                fromEmployeeId,
                toEmployeeId,
                notes: notes || null,
            }
        });

        // Clear transfer cookie
        cookieStore.delete('tool-transfer-token');

        return { success: true };
    } catch (error) {
        console.error('Transfer error:', error);
        return { success: false, error: 'Błąd przekazania' };
    }
}

// Get transfer history for a tool
export async function getToolTransferHistory(toolId: number) {
    try {
        const transfers = await (prisma as any).toolTransfer.findMany({
            where: { toolId },
            include: {
                fromEmployee: { select: { firstName: true, lastName: true } },
                toEmployee: { select: { firstName: true, lastName: true } }
            },
            orderBy: { transferredAt: 'desc' }
        });

        return { success: true, transfers };
    } catch (error) {
        console.error('History error:', error);
        return { success: false, error: 'Błąd pobierania historii' };
    }
}

// Get all employees for dropdown
export async function getEmployeesForTransfer() {
    try {
        const employees = await (prisma as any).employee.findMany({
            where: { isDeleted: 0 },
            select: { id: true, firstName: true, lastName: true },
            orderBy: { firstName: 'asc' }
        });

        return { success: true, employees };
    } catch (error) {
        console.error('Employees error:', error);
        return { success: false, error: 'Błąd pobierania pracowników' };
    }
}

// Logout from tool transfer session
export async function logoutToolTransfer() {
    const cookieStore = await cookies();
    cookieStore.delete('tool-transfer-token');
    return { success: true };
}
