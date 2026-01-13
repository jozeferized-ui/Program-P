'use client';

import { PackageOpen } from 'lucide-react';

export default function ProductionPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Produkcja</h1>
                <PackageOpen className="h-8 w-8 text-primary" />
            </div>

            <div className="text-center py-12 text-muted-foreground">
                <p>Strona w przygotowaniu...</p>
            </div>
        </div>
    );
}
