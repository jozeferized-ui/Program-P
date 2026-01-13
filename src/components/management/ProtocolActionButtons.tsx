'use client';

import React from 'react';
import { Printer, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

interface ProtocolActionButtonsProps {
    toolId: string | number;
}

export function ProtocolActionButtons({ toolId }: ProtocolActionButtonsProps) {
    return (
        <div className="w-full max-w-[210mm] px-4 pt-6 pb-4 flex justify-between items-center bg-transparent z-10">
            <Link
                href={`/tools/${toolId}`}
                className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-primary transition-colors group"
            >
                <ChevronLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                Powrót
            </Link>

            <div className="flex gap-2">
                <button
                    onClick={() => window.print()}
                    className="bg-white p-2 rounded-xl shadow-sm border border-slate-200 text-slate-600 hover:text-primary hover:border-primary transition-all active:scale-95"
                    title="Drukuj Protokół"
                >
                    <Printer className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
