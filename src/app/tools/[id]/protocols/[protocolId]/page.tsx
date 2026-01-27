import { getProtocolById } from '@/actions/protocols';
import { notFound } from 'next/navigation';
import { ToolProtocolPdf } from '@/components/management/ToolProtocolPdf';
import { PrintStyles } from '@/components/management/PrintStyles';
import { ProtocolActionButtons } from '@/components/management/ProtocolActionButtons';

export const dynamic = 'force-dynamic';

export default async function ProtocolDetailPage({
    params
}: {
    params: Promise<{ id: string, protocolId: string }>
}) {
    const { id, protocolId } = await params;
    const protocol = await getProtocolById(parseInt(protocolId));

    if (!protocol) {
        notFound();
    }

    let protocolData;
    try {
        protocolData = JSON.parse(protocol.content as string);
    } catch (e) {
        console.error("Failed to parse protocol content:", e);
        protocolData = { general: {}, disassembly: {}, protection: {}, place: 'Błąd danych' };
    }
    const _result = protocol.result as 'POZYTYWNA' | 'NEGATYWNA';

    return (
        <div className="min-h-screen overflow-y-auto touch-pan-y bg-slate-100 font-sans antialiased text-slate-900 flex flex-col items-center">
            <PrintStyles />
            <ProtocolActionButtons toolId={id} />

            {/* Document Container */}
            <div className="w-full pb-12 overflow-x-auto px-4 doc-scale-container">
                <div className="bg-white shadow-2xl origin-top sm:scale-100 scale-[0.7] md:scale-100 min-w-fit">
                    <ToolProtocolPdf
                        tool={protocol.tool as any}
                        protocolData={protocolData}
                    />
                </div>
            </div>
        </div>
    );
}
