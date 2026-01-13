'use client';

import React from 'react';
import { Tool, Employee, ProtocolData } from '@/types';
import { format } from 'date-fns';

interface ToolProtocolPdfProps {
    tool: Tool;
    inspector?: Employee; // Kept for interface compatibility but main source is protocolData
    protocolData: ProtocolData;
}

export function ToolProtocolPdf({ tool, inspector, protocolData }: ToolProtocolPdfProps) {
    const formatDate = (date?: Date | string | null) => {
        if (!date) return "....................";
        return format(new Date(date), "dd/MM/yyyy");
    };

    return (
        <>
            <style jsx global>{`
                @media print {
                    @page {
                        size: A4;
                        margin: 10mm;
                    }
                    body {
                        print-color-adjust: exact;
                        -webkit-print-color-adjust: exact;
                    }
                }
            `}</style>
            <div className="w-full max-w-[210mm] mx-auto bg-white text-black text-[12px] leading-tight font-sans print:w-full">
                {/* Main Table Border */}
                <div className="border-2 border-black">

                    {/* Header Section */}
                    <div className="grid grid-cols-2 border-b border-black">
                        <div className="p-2 border-r border-black font-bold bg-gray-200">
                            PROTOKÓŁ NR {tool.protocolNumber ? `${tool.protocolNumber}/${format(protocolData.date, 'yyyy')}` : "...................."} GOTOWY<br />
                            NR DO NASTĘPNEGO PRZEGLĄDU
                        </div>
                        <div className="p-2 bg-gray-200">
                            {/* Empty space */}
                        </div>
                    </div>

                    {/* Title */}
                    <div className="p-2 text-center font-bold border-b border-black text-sm bg-gray-200">
                        BADANIE ELEKTRONARZĘDZI O NAPĘDZIE ELEKTRYCZNYM
                    </div>

                    {/* Device Info */}
                    <div className="grid grid-cols-[150px_1fr] border-b border-black">
                        <div className="p-2 border-r border-black font-bold bg-gray-100 uppercase flex items-center">
                            Rodzaj Pomiarów
                        </div>
                        <div className="p-2 font-bold flex items-center justify-center uppercase">
                            OKRESOWY PRZEGLĄD
                        </div>
                    </div>

                    {/* Device Details Row */}
                    <div className="grid grid-cols-[150px_1fr_1fr_1fr] border-b border-black">
                        <div className="p-2 border-r border-black font-bold bg-gray-100 flex items-center">
                            RODZAJ PRZYRZĄDU
                        </div>
                        <div className="p-2 border-r border-black flex items-center justify-center uppercase font-bold">
                            {tool.name}
                        </div>
                        <div className="p-2 border-r border-black flex items-center justify-center font-bold">
                            {tool.brand}{tool.model ? ` ${tool.model}` : ""}
                        </div>
                        <div className="p-2 flex items-center justify-center font-bold">
                            NR {tool.serialNumber}
                        </div>
                    </div>

                    {/* Dates Row */}
                    <div className="grid grid-cols-[150px_1fr_1fr] border-b border-black">
                        <div className="p-2 border-r border-black font-bold bg-gray-100 flex items-center">
                            DATA
                        </div>
                        <div className="p-0 border-r border-black">
                            <div className="border-b border-black p-1 text-xs font-bold bg-gray-100">DATA BIEŻĄCYCH BADAŃ</div>
                            <div className="p-2 text-center font-mono text-lg font-bold">
                                {format(protocolData.date, "dd/MM/yyyy")}
                            </div>
                        </div>
                        <div className="p-0">
                            <div className="border-b border-black p-1 text-xs font-bold bg-gray-100">DATA NASTĘPNYCH BADAŃ</div>
                            <div className="p-2 text-center font-mono text-lg">
                                {formatDate(protocolData.nextInspectionDate || tool.inspectionExpiryDate)}
                            </div>
                        </div>
                    </div>

                    {/* Inspector Row */}
                    <div className="grid grid-cols-[150px_1fr] border-b border-black">
                        <div className="p-2 border-r border-black font-bold bg-gray-100 flex items-center">
                            POMIAR WYKONAŁ
                        </div>
                        <div className="p-2 font-bold flex items-center ml-2">
                            {protocolData.inspectorName || (inspector ? `${inspector.firstName} ${inspector.lastName}` : "....................")}
                        </div>
                    </div>

                    {/* Conditions Row */}
                    <div className="grid grid-cols-[150px_1fr] border-b border-black">
                        <div className="p-2 border-r border-black font-bold bg-gray-100 flex items-center">
                            WARUNKI Z POMIARÓW
                        </div>
                        <div className="p-2 font-mono">
                            {protocolData.comments}
                        </div>
                    </div>

                    {/* Checklist Section 1: Stan Ogólny */}
                    <div className="grid grid-cols-[150px_30px_1fr_100px] border-b border-black">
                        <div className="p-2 border-r border-black font-bold bg-gray-100 flex items-center justify-center text-center row-span-4 self-stretch" style={{ gridRow: "span 4" }}>
                            SPRAWDZONO STAN OGÓLNY
                        </div>

                        <div className="p-2 border-r border-black border-b border-black">a.</div>
                        <div className="p-2 border-r border-black border-b border-black">Czy obudowa, przewód przyłączeniowy, wtyczka są nieuszkodzone</div>
                        <div className="border-b border-black p-2 text-center font-bold flex items-center justify-center">{protocolData.general.a}</div>

                        <div className="p-2 border-r border-black border-b border-black">b.</div>
                        <div className="p-2 border-r border-black border-b border-black">Uchwyty, zaciski części roboczych są kompletne</div>
                        <div className="border-b border-black p-2 text-center font-bold flex items-center justify-center">{protocolData.general.b}</div>

                        <div className="p-2 border-r border-black border-b border-black">c.</div>
                        <div className="p-2 border-r border-black border-b border-black">Kontrola wycieku smaru</div>
                        <div className="border-b border-black p-2 text-center font-bold flex items-center justify-center">{protocolData.general.c}</div>

                        <div className="p-2 border-r border-black">d.</div>
                        <div className="p-2 border-r border-black">Sprawdzenie biegu jałowego</div>
                        <div className="p-2 text-center font-bold flex items-center justify-center">{protocolData.general.d}</div>
                    </div>

                    {/* Checklist Section 2: Demontaż */}
                    <div className="grid grid-cols-[150px_30px_1fr_100px] border-b border-black border-t border-black">
                        <div className="p-2 border-r border-black font-bold bg-gray-100 flex items-center justify-center text-center text-xs" style={{ gridRow: "span 4" }}>
                            PRZEPROWADZONO DEMONTAŻ I OGLĘDZINY ZEWNĘTRZNE, SPRAWDZONO CZY:
                        </div>

                        <div className="p-2 border-r border-black border-b border-black">a.</div>
                        <div className="p-2 border-r border-black border-b border-black">Przewód przyłączeniowy jest dobrze przymocowany i podłączony</div>
                        <div className="border-b border-black p-2 text-center font-bold flex items-center justify-center">{protocolData.disassembly.a}</div>

                        <div className="p-2 border-r border-black border-b border-black">b.</div>
                        <div className="p-2 border-r border-black border-b border-black">Połączenia wewnętrzne są nieuszkodzone i nie ma możliwości uszkodzenia</div>
                        <div className="border-b border-black p-2 text-center font-bold flex items-center justify-center">{protocolData.disassembly.b}</div>

                        <div className="p-2 border-r border-black border-b border-black">c.</div>
                        <div className="p-2 border-r border-black border-b border-black">Komutator i szczotki nie są zużyte mechanicznie lub elektrycznie oraz poprawnie współpracują</div>
                        <div className="border-b border-black p-2 text-center font-bold flex items-center justify-center">{protocolData.disassembly.c}</div>

                        <div className="p-2 border-r border-black">d.</div>
                        <div className="p-2 border-r border-black">Pozostałe elementy mechaniczne są odpowiednio nasmarowane i nie użyte</div>
                        <div className="p-2 text-center font-bold flex items-center justify-center">{protocolData.disassembly.d}</div>
                    </div>

                    {/* Checklist Section 3: Obwód Ochronny */}
                    <div className="grid grid-cols-[150px_30px_1fr_100px] border-b border-black border-t border-black">
                        <div className="p-2 border-r border-black font-bold bg-gray-100 flex items-center justify-center text-center" style={{ gridRow: "span 2" }}>
                            SPRAWDZENIE OBWODU OCHRONNEGO
                        </div>

                        <div className="p-2 border-r border-black border-b border-black">a.</div>
                        <div className="p-2 border-r border-black border-b border-black">Sprawdzono czy przewód PE jest dobrze i pewnie podpięty</div>
                        <div className="border-b border-black p-2 text-center font-bold flex items-center justify-center">{protocolData.protection.a}</div>

                        <div className="p-2 border-r border-black">b.</div>
                        <div className="p-2 border-r border-black">Pomierzono spadek napięcia pomiędzy stykiem ochronnym wtyczki a obudową elektryczną</div>
                        <div className="p-2 text-center font-bold flex items-center justify-center">{protocolData.protection.b}</div>
                    </div>

                    {/* Final Result */}
                    <div className="grid grid-cols-[150px_1fr] border-b border-black border-t border-black">
                        <div className="p-2 border-r border-black font-bold bg-gray-100 flex items-center uppercase">
                            OCENA KOŃCOWA
                        </div>
                        <div className="p-2 font-bold text-center text-xl bg-gray-50 flex items-center justify-center">
                            {protocolData.result}
                        </div>
                    </div>

                    {/* Footer / Signature */}
                    <div className="grid grid-cols-[150px_1fr_150px_1fr] border-black">
                        <div className="p-2 border-r border-black font-bold bg-gray-100 flex items-center uppercase text-sm">
                            MIEJSCE I DATA
                        </div>
                        <div className="p-2 border-r border-black font-bold flex items-center justify-center uppercase">
                            {protocolData.place} {format(protocolData.date, "dd/MM/yyyy")}
                        </div>
                        <div className="p-2 border-r border-black font-bold bg-gray-100 flex items-center uppercase">
                            PODPIS
                        </div>
                        <div className="p-2">
                            {/* Sign */}
                        </div>
                    </div>

                </div>
            </div>
        </>
    );
}
