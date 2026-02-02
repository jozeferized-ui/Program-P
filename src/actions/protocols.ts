/**
 * @file protocols.ts
 * @description Protokoły kontrolne/przeglądy narzędzi
 * 
 * Odpowiada za:
 * - Zapisywanie protokołów kontrolnych
 * - Automatyczne generowanie numerów protokołów
 * - Aktualizację dat przeglądów w narzędziach
 * - Pobieranie historii protokołów
 * 
 * @module actions/protocols
 */
'use server'

import { prisma } from "@/lib/prisma"
import { ProtocolData } from "@/types"
import { revalidatePath } from "next/cache"

/**
 * Zapisuje nowy protokół kontrolny dla narzędzia
 * Automatycznie generuje numer protokołu: YYYY-MM-DD/N
 * Aktualizuje daty przeglądów w narzędziu
 * 
 * @param data - Dane protokołu:
 *   - date: Data przeglądu
 *   - inspectorName: Imię i nazwisko kontrolera
 *   - result: Wynik kontroli (pozytywny/negatywny)
 *   - nextInspectionDate: Data następnej kontroli
 *   - ...inne dane specyficzne dla protokołu
 * @param toolId - ID narzędzia
 * @returns Obiekt z success i protocolNumber
 */
export async function saveProtocol(data: ProtocolData, toolId: number) {
    try {
        // Generuj numer protokołu: data/numer_sekwencyjny
        const dateStr = new Date(data.date).toISOString().split('T')[0];  // YYYY-MM-DD

        // Zlicz istniejące protokoły z tego dnia dla tego narzędzia
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

        // Zapisz protokół
        await (prisma as any).protocol.create({
            data: {
                toolId,
                date: new Date(data.date),
                inspectorName: data.inspectorName,
                result: data.result,
                content: JSON.stringify(data),  // Pełne dane jako JSON
            }
        });

        // Zaktualizuj narzędzie z datami przeglądów
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

/**
 * Pobiera wszystkie protokoły dla narzędzia
 * @param toolId - ID narzędzia
 * @returns Obiekt z success i data (tablica protokołów)
 */
export async function getToolProtocols(toolId: number) {
    try {
        const protocols = await (prisma as any).protocol.findMany({
            where: { toolId },
            orderBy: { date: 'desc' }  // Najnowsze na górze
        });
        return { success: true, data: protocols };
    } catch (error) {
        console.error("Error fetching protocols:", error);
        return { success: false, error: "Failed to fetch protocols" };
    }
}

/**
 * Pobiera pojedynczy protokół z danymi narzędzia
 * @param id - ID protokołu
 * @returns Protokół z powiązanym narzędziem lub null
 */
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

/**
 * Aktualizuje istniejący protokół
 * Automatycznie aktualizuje daty przeglądów w narzędziu
 * 
 * @param id - ID protokołu
 * @param data - Nowe dane protokołu
 * @returns Obiekt z success i error
 */
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

        // Zaktualizuj również daty w narzędziu
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
