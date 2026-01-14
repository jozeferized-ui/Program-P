// Final assignment script - uses findFirst then update by ID
const { PrismaClient } = require('@prisma/client');
const Database = require('better-sqlite3');

async function assignTools() {
    const prisma = new PrismaClient();
    const sqlite = new Database('./prisma/dev.db', { readonly: true });

    try {
        console.log('=== Przypisywanie narzędzi do pracowników ===\n');

        // Get employees from PostgreSQL
        const mariusz = await prisma.employee.findFirst({ where: { firstName: 'Mariusz', lastName: 'Duda' } });
        const stanislaw = await prisma.employee.findFirst({ where: { firstName: 'Stanisław', lastName: 'Frączek' } });
        const jozef = await prisma.employee.findFirst({ where: { firstName: 'Józef', lastName: 'Fedko' } });

        console.log('Pracownicy:');
        if (mariusz) console.log(`  ✓ Mariusz Duda: ID ${mariusz.id}`);
        if (stanislaw) console.log(`  ✓ Stanisław Frączek: ID ${stanislaw.id}`);
        if (jozef) console.log(`  ✓ Józef Fedko: ID ${jozef.id}`);

        // SQLite _ToolEmployees: A = EmployeeID, B = ToolID
        // Employee IDs in SQLite: 1=Józef, 3=Mariusz, 4=Stanisław

        const assignments = [
            { sqliteEmpId: 1, pgEmployee: jozef, name: 'Józef Fedko' },
            { sqliteEmpId: 3, pgEmployee: mariusz, name: 'Mariusz Duda' },
            { sqliteEmpId: 4, pgEmployee: stanislaw, name: 'Stanisław Frączek' },
        ];

        let totalUpdated = 0;

        for (const { sqliteEmpId, pgEmployee, name } of assignments) {
            if (!pgEmployee) continue;

            // Get tools assigned to this employee in SQLite
            const tools = sqlite.prepare(`
                SELECT t.serialNumber 
                FROM _ToolEmployees te 
                JOIN Tool t ON te.B = t.id 
                WHERE te.A = ? AND t.isDeleted = 0
            `).all(sqliteEmpId);

            console.log(`\n${name}: ${tools.length} narzędzi do przypisania`);

            for (const { serialNumber } of tools) {
                // Find tool in PostgreSQL
                const pgTool = await prisma.tool.findFirst({ where: { serialNumber } });

                if (pgTool) {
                    // Connect employee to tool
                    await prisma.tool.update({
                        where: { id: pgTool.id },
                        data: {
                            assignedEmployees: {
                                connect: { id: pgEmployee.id }
                            }
                        }
                    });
                    totalUpdated++;
                    console.log(`  ✓ [${pgTool.id}] ${pgTool.name} (${serialNumber})`);
                }
            }
        }

        console.log(`\n✅ Przypisano łącznie ${totalUpdated} narzędzi!`);

    } catch (error) {
        console.error('Błąd:', error);
    } finally {
        await prisma.$disconnect();
        sqlite.close();
    }
}

assignTools();
