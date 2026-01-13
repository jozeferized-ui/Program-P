import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function createPrismaClient() {
    // Check if we're using Turso (production) or local SQLite (development)
    const tursoUrl = process.env.TURSO_DATABASE_URL;
    const tursoToken = process.env.TURSO_AUTH_TOKEN;

    if (tursoUrl && tursoToken) {
        // Production: Use Turso
        const libsql = createClient({
            url: tursoUrl,
            authToken: tursoToken,
        });
        const adapter = new PrismaLibSql(libsql as any);
        return new PrismaClient({ adapter } as any);
    } else {
        // Development: Use local SQLite
        return new PrismaClient({
            log: process.env.NODE_ENV === 'development' ? ['query'] : [],
        });
    }
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}
