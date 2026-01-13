
'use server'

import { prisma } from "@/lib/prisma"
import { ProtocolData } from "@/types"
import { revalidatePath } from "next/cache"

export async function saveProtocol(data: ProtocolData, toolId: number) {
    try {
        // Generate protocol number: date/sequence
        const dateStr = new Date(data.date).toISOString().split('T')[0]; // YYYY-MM-DD
        const existingCount = await (prisma as any).protocol.count({
            where: {
                toolId,
                date: {
                    gte: new Date(dateStr + 'T00:00:00.000Z'),
                    lt: new Date(dateStr + 'T23:59:59.999Z')
                }
            }
        });
        const protocolNumber = `${dateStr}/${existingCount + 1}`;

        await (prisma as any).protocol.create({
            data: {
                toolId,
                date: new Date(data.date),
                inspectorName: data.inspectorName,
                result: data.result,
                content: JSON.stringify(data),
            }
        });

        // Update the tool's inspection dates and protocol number
        await (prisma as any).tool.update({
            where: { id: toolId },
            data: {
                lastInspectionDate: new Date(data.date),
                inspectionExpiryDate: data.nextInspectionDate ? new Date(data.nextInspectionDate) : null,
                protocolNumber: protocolNumber,
            }
        });

        revalidatePath('/management');
        return { success: true, protocolNumber };
    } catch (error) {
        console.error("Error saving protocol:", error);
        return { success: false, error: "Failed to save protocol" };
    }
}

export async function getToolProtocols(toolId: number) {
    try {
        const protocols = await (prisma as any).protocol.findMany({
            where: { toolId },
            orderBy: { date: 'desc' }
        });
        return { success: true, data: protocols };
    } catch (error) {
        console.error("Error fetching protocols:", error);
        return { success: false, error: "Failed to fetch protocols" };
    }
}

export async function getProtocolById(id: number) {
    try {
        const protocol = await (prisma as any).protocol.findUnique({
            where: { id },
            include: {
                tool: {
                    select: {
                        name: true,
                        brand: true,
                        serialNumber: true
                    }
                }
            }
        });
        return protocol;
    } catch (error) {
        console.error("Error fetching protocol:", error);
        return null;
    }
}
export async function updateProtocol(id: number, data: ProtocolData) {
    try {
        const protocol = await (prisma as any).protocol.update({
            where: { id },
            data: {
                date: new Date(data.date),
                inspectorName: data.inspectorName,
                result: data.result,
                content: JSON.stringify(data),
            }
        });

        // Also update the tool's inspection dates if it's the latest protocol (or just always update for simplicity if that's the intention)
        if (protocol.toolId) {
            await (prisma as any).tool.update({
                where: { id: protocol.toolId },
                data: {
                    lastInspectionDate: new Date(data.date),
                    inspectionExpiryDate: data.nextInspectionDate ? new Date(data.nextInspectionDate) : null,
                }
            });
        }

        revalidatePath('/management');
        return { success: true };
    } catch (error) {
        console.error("Error updating protocol:", error);
        return { success: false, error: "Failed to update protocol" };
    }
}
