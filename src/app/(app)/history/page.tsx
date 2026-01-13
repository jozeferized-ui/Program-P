'use client';

import { History } from 'lucide-react';
import { HistoryTabs } from '@/components/history/HistoryTabs';

export default function HistoryPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <History className="h-8 w-8 text-primary" />
                    <h1 className="text-3xl font-bold">Historia</h1>
                </div>
            </div>

            <HistoryTabs />
        </div>
    );
}
