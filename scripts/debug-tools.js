// Debug script to check what's in PostgreSQL
const { PrismaClient } = require('@prisma/client');

async function debug() {
    const prisma = new PrismaClient();
    try {
        const tools = await prisma.tool.findMany({ take: 5 });
        console.log('First 5 tools in PostgreSQL:');
        tools.forEach(t => console.log(`  [${t.id}] ${t.name} - ${t.serialNumber}`));

        // Try to find a specific tool
        const test = await prisma.tool.findFirst({ where: { serialNumber: '48128401016459J2022' } });
        console.log('\nSzukam 48128401016459J2022:', test ? `Znaleziono ID ${test.id}` : 'NIE ZNALEZIONO');

        // Count all tools
        const count = await prisma.tool.count();
        console.log(`\nŁącznie narzędzi w PostgreSQL: ${count}`);
    } finally {
        await prisma.$disconnect();
    }
}
debug();
