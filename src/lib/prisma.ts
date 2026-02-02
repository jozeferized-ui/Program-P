/**
 * @file prisma.ts
 * @description Konfiguracja klienta Prisma ORM
 * 
 * Implementuje singleton pattern dla instancji PrismaClient
 * aby uniknąć tworzenia wielu połączeń w trybie development
 * (hot reload Next.js)
 * 
 * @module lib/prisma
 */

import { PrismaClient } from '@prisma/client';

/** Global store dla singleton instancji */
const globalForPrisma = global as unknown as { prisma: PrismaClient };

/**
 * Singleton instancja klienta Prisma
 * W development loguje zapytania SQL do konsoli
 */
export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query'] : [],
    });

// Zachowaj instancję w globalnym obiekcie w development
if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}
