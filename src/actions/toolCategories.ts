'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { ToolCategory } from "@/types"

export async function getToolCategories() {
    try {
        const categories = await (prisma as any).toolCategory.findMany({
            orderBy: { name: 'asc' }
        });
        return categories as ToolCategory[];
    } catch (error) {
        console.error("Error fetching tool categories:", error);
        return [];
    }
}

export async function createToolCategory(name: string) {
    try {
        const category = await (prisma as any).toolCategory.create({
            data: { name }
        });
        revalidatePath('/management');
        return { success: true, data: category };
    } catch (error) {
        console.error("Error creating tool category:", error);
        return { success: false, error: "Failed to create category" };
    }
}

export async function deleteToolCategory(id: number) {
    try {
        await (prisma as any).toolCategory.delete({
            where: { id }
        });
        revalidatePath('/management');
        return { success: true };
    } catch (error) {
        console.error("Error deleting tool category:", error);
        return { success: false, error: "Failed to delete category" };
    }
}
