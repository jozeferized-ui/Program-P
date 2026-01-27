import { getToolById } from '@/actions/tools';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';
import { Calendar, Hammer, User, Tag, ShieldCheck, AlertTriangle, ChevronLeft, ArrowRightLeft } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { PrintStyles } from '@/components/management/PrintStyles';
import { ScanTracker } from '@/components/tools/ScanTracker';
import { TransferSection } from '@/components/tools/TransferSection';

export default async function ToolInfoPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const toolId = parseInt(id);
    const tool = await getToolById(toolId);

    if (!tool) {
        notFound();
    }

    const now = new Date();
    const fourteenDaysFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const isExpired = tool.inspectionExpiryDate && new Date(tool.inspectionExpiryDate) < now;
    const isSoonExpired = tool.inspectionExpiryDate &&
        new Date(tool.inspectionExpiryDate) > now &&
        new Date(tool.inspectionExpiryDate) < fourteenDaysFromNow;

    const currentAssignee = tool.assignedEmployees.length > 0
        ? tool.assignedEmployees.map((e: any) => `${e.firstName} ${e.lastName}`).join(', ')
        : undefined;

    return (
        <div className="min-h-screen overflow-y-auto touch-pan-y bg-slate-50 p-4 md:p-8 font-sans antialiased text-slate-900 flex justify-center">
            <ScanTracker toolId={toolId} />
            <PrintStyles />
            {/* Watermark / Background */}
            <div className="fixed inset-0 opacity-[0.03] pointer-events-none select-none overflow-hidden flex flex-wrap gap-20 p-20">
                {Array.from({ length: 20 }).map((_, i) => (
                    <Hammer key={i} className="w-32 h-32 -rotate-12 outline-primary" />
                ))}
            </div>

            <div className="max-w-2xl w-full space-y-6 relative">
                <div className="absolute -top-12 left-0 right-0 text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400">
                        Publiczny Certyfikat Sprzętu
                    </p>
                </div>

                <Card className="border-none shadow-2xl overflow-hidden bg-white/95 backdrop-blur-md rounded-[2.5rem] relative">
                    {/* Decorative Background Element */}
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                        <Hammer className="w-48 h-48 rotate-12" />
                    </div>

                    <CardHeader className="text-center pb-2 relative">
                        <div className="mx-auto bg-primary/10 p-4 rounded-3xl w-fit mb-4 text-primary shadow-inner">
                            <Hammer className="w-10 h-10" />
                        </div>
                        <CardTitle className="text-3xl font-black uppercase tracking-tighter text-slate-900 leading-none mb-1">
                            {tool.name}
                        </CardTitle>
                        <p className="text-primary font-bold tracking-[0.2em] uppercase text-[10px]">{tool.brand}</p>
                    </CardHeader>

                    <CardContent className="space-y-6 relative">
                        {/* Status Badge */}
                        <div className="flex justify-center">
                            <Badge className={cn(
                                "px-6 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg border-2",
                                tool.status === 'Available' ? "bg-emerald-500 border-emerald-400 text-white" :
                                    tool.status === 'In Use' ? "bg-blue-600 border-blue-500 text-white" :
                                        tool.status === 'Maintenance' ? "bg-amber-500 border-amber-400 text-white" :
                                            "bg-rose-600 border-rose-500 text-white"
                            )}>
                                {tool.status === 'Available' ? 'Dostępne' :
                                    tool.status === 'In Use' ? 'W użyciu' :
                                        tool.status === 'Maintenance' ? 'W serwisie' : 'Zgubione'}
                            </Badge>
                        </div>

                        {/* Inspection Box */}
                        <div className={cn(
                            "p-5 rounded-2xl border-2 flex items-center gap-5 transition-all shadow-md group",
                            isExpired ? "bg-rose-50 border-rose-200 text-rose-900" :
                                isSoonExpired ? "bg-amber-50 border-amber-200 text-amber-900" :
                                    "bg-emerald-50 border-emerald-200 text-emerald-900"
                        )}>
                            <div className={cn(
                                "p-3 rounded-xl shadow-sm group-hover:scale-110 transition-transform",
                                isExpired ? "bg-rose-500 text-white" :
                                    isSoonExpired ? "bg-amber-500 text-white" :
                                        "bg-emerald-500 text-white"
                            )}>
                                {isExpired ? <AlertTriangle className="w-6 h-6 animate-pulse" /> : <ShieldCheck className="w-6 h-6" />}
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-0.5">Ważność przeglądu</p>
                                <p className="text-xl font-black tabular-nums">
                                    {tool.inspectionExpiryDate
                                        ? format(new Date(tool.inspectionExpiryDate), 'dd MMMM yyyy', { locale: pl })
                                        : 'Brak danych'}
                                </p>
                            </div>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-1 gap-3">
                            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm">
                                <div className="p-2 bg-white rounded-lg border shadow-sm text-slate-400">
                                    <Tag className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Numer Seryjny</p>
                                    <p className="font-bold text-black truncate">{tool.serialNumber}</p>
                                </div>
                            </div>

                            {tool.assignedEmployees.length > 0 && (
                                <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm">
                                    <div className="p-2 bg-white rounded-lg border shadow-sm text-slate-400">
                                        <User className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Osoba Odpowiedzialna</p>
                                        <p className="font-bold text-black truncate">
                                            {tool.assignedEmployees.map((e: any) => `${e.firstName} ${e.lastName}`).join(', ')}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Transferred To */}
                            {(tool as any).transferredTo && (
                                <div className="flex items-center gap-4 bg-blue-50 p-4 rounded-xl border border-blue-200 shadow-sm">
                                    <div className="p-2 bg-blue-500 rounded-lg shadow-sm text-white">
                                        <ArrowRightLeft className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[9px] text-blue-600 font-black uppercase tracking-widest mb-0.5">Przekazano do</p>
                                        <p className="font-bold text-blue-900 truncate">
                                            {(tool as any).transferredTo.firstName} {(tool as any).transferredTo.lastName}
                                        </p>
                                        {(tool as any).transferredAt && (
                                            <p className="text-[10px] text-blue-500">
                                                {format(new Date((tool as any).transferredAt), 'dd.MM.yyyy HH:mm', { locale: pl })}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {tool.protocolNumber && (
                                <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm">
                                    <div className="p-2 bg-white rounded-lg border shadow-sm text-slate-400">
                                        <Calendar className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Nr Protokołu</p>
                                        <p className="font-bold text-black truncate">{tool.protocolNumber}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Transfer Section */}
                        <TransferSection
                            toolId={toolId}
                            currentAssignee={currentAssignee}
                            currentTransferredTo={(tool as any).transferredTo}
                        />

                        {/* Recent History */}
                        {tool.protocols && tool.protocols.length > 0 && (
                            <div className="pt-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 px-1">Pełna Historia Przeglądów</p>
                                <div className="space-y-2">
                                    {tool.protocols.map((protocol: any) => (
                                        <Link
                                            key={protocol.id}
                                            href={`/tools/${id}/protocols/${protocol.id}`}
                                            className="flex items-center justify-between p-4 bg-white hover:bg-slate-50 active:scale-[0.98] transition-all rounded-2xl border border-slate-100 shadow-sm group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm border",
                                                    protocol.result === 'POZYTYWNA'
                                                        ? "bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:bg-emerald-500 group-hover:text-white"
                                                        : "bg-rose-50 text-rose-600 border-rose-100 group-hover:bg-rose-500 group-hover:text-white"
                                                )}>
                                                    {protocol.result === 'POZYTYWNA' ? <ShieldCheck className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-900 leading-none mb-1 text-base">
                                                        {format(new Date(protocol.date), 'dd MMMM yyyy', { locale: pl })}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                                        Inspektor: {protocol.inspectorName}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex">
                                                Szczegóły
                                                <ChevronLeft className="w-4 h-4 rotate-180" />
                                            </div>
                                            <div className="text-slate-300 md:hidden">
                                                <ChevronLeft className="w-5 h-5 rotate-180" />
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="mt-8 text-center space-y-3 opacity-50">
                    <div className="flex items-center justify-center gap-2">
                        <div className="w-8 h-px bg-slate-300" />
                        <ShieldCheck className="w-4 h-4 text-slate-400" />
                        <div className="w-8 h-px bg-slate-300" />
                    </div>
                    <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-[0.4em]">
                        CERTYFIKOWANY SYSTEM INWENTARYZACJI
                    </p>
                    <p className="text-[8px] text-slate-300 font-medium">Wygenerowano automatycznie | ID: {id}</p>
                </div>
            </div>
        </div>
    );
}
