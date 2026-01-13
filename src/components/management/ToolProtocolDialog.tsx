
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tool, Employee, ProtocolData } from "@/types";
import { format, addMonths } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ToolProtocolDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tool: Tool | null;
    inspector?: Employee;
    onSubmit: (data: ProtocolData) => void;
    initialProtocolData?: ProtocolData;
}

const DEFAULT_RESULT = "POZYTYWNY";

export function ToolProtocolDialog({ open, onOpenChange, tool, inspector, onSubmit, initialProtocolData }: ToolProtocolDialogProps) {
    const [formData, setFormData] = useState<ProtocolData>({
        general: { a: DEFAULT_RESULT, b: DEFAULT_RESULT, c: DEFAULT_RESULT, d: DEFAULT_RESULT },
        disassembly: { a: DEFAULT_RESULT, b: DEFAULT_RESULT, c: DEFAULT_RESULT, d: DEFAULT_RESULT },
        protection: { a: DEFAULT_RESULT, b: DEFAULT_RESULT },
        result: "POZYTYWNA",
        comments: "",
        date: new Date(),
        place: "Tęgoborze",
        inspectorName: "",
        validityMonths: 6,
        nextInspectionDate: addMonths(new Date(), 6)
    });

    useEffect(() => {
        if (open && tool) {
            if (initialProtocolData) {
                setFormData({
                    ...initialProtocolData,
                    date: new Date(initialProtocolData.date)
                });
            } else {
                setFormData({
                    general: { a: DEFAULT_RESULT, b: DEFAULT_RESULT, c: DEFAULT_RESULT, d: DEFAULT_RESULT },
                    disassembly: { a: DEFAULT_RESULT, b: DEFAULT_RESULT, c: DEFAULT_RESULT, d: DEFAULT_RESULT },
                    protection: { a: DEFAULT_RESULT, b: DEFAULT_RESULT },
                    result: "POZYTYWNA",
                    comments: "",
                    date: new Date(),
                    place: "Tęgoborze",
                    inspectorName: inspector ? `${inspector.firstName} ${inspector.lastName}` : (tool.assignedEmployees?.[0] ? `${tool.assignedEmployees[0].firstName} ${tool.assignedEmployees[0].lastName}` : ""),
                    validityMonths: 6,
                    nextInspectionDate: addMonths(new Date(), 6)
                });
            }
        }
    }, [open, tool, inspector, initialProtocolData]);

    // Auto-calculate next inspection date
    useEffect(() => {
        const nextDate = addMonths(new Date(formData.date), formData.validityMonths || 6);
        setFormData(prev => ({ ...prev, nextInspectionDate: nextDate }));
    }, [formData.date, formData.validityMonths]);

    // Auto-calculate result whenever checklists change
    useEffect(() => {
        const checkGroups = [formData.general, formData.disassembly, formData.protection];
        let hasNegative = false;

        for (const group of checkGroups) {
            if (Object.values(group).some(val => val === "NEGATYWNY")) {
                hasNegative = true;
                break;
            }
        }

        const newResult = hasNegative ? "NEGATYWNA" : "POZYTYWNA";
        if (formData.result !== newResult) {
            setFormData(prev => ({ ...prev, result: newResult }));
        }
    }, [formData.general, formData.disassembly, formData.protection]);


    const handleGeneralChange = (key: keyof ProtocolData['general'], value: string) => {
        setFormData(prev => ({ ...prev, general: { ...prev.general, [key]: value } }));
    };

    const handleDisassemblyChange = (key: keyof ProtocolData['disassembly'], value: string) => {
        setFormData(prev => ({ ...prev, disassembly: { ...prev.disassembly, [key]: value } }));
    };

    const handleProtectionChange = (key: keyof ProtocolData['protection'], value: string) => {
        setFormData(prev => ({ ...prev, protection: { ...prev.protection, [key]: value } }));
    };

    const handleSubmit = () => {
        onSubmit(formData);
        onOpenChange(false);
    };

    const CheckItem = ({
        label,
        value,
        onChange,
        prefix
    }: {
        label: string,
        value: string,
        onChange: (val: string) => void,
        prefix: string
    }) => (
        <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50/50 hover:bg-gray-50 transition-colors gap-4">
            <div className="flex items-start gap-3 flex-1">
                <span className="font-bold text-muted-foreground min-w-[24px]">{prefix}</span>
                <span className="text-sm font-medium leading-tight">{label}</span>
            </div>
            <div className="w-[150px] shrink-0">
                <Select value={value} onValueChange={onChange}>
                    <SelectTrigger className={value === "NEGATYWNY" ? "border-red-500 bg-red-50 text-red-700" : (value === "POZYTYWNY" ? "border-green-500 bg-green-50 text-green-700" : "")}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="POZYTYWNY" className="text-green-700 font-medium">POZYTYWNY</SelectItem>
                        <SelectItem value="NEGATYWNY" className="text-red-700 font-medium">NEGATYWNY</SelectItem>
                        <SelectItem value="N/A" className="text-muted-foreground">N/A</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );

    if (!tool) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>Protokół badania: {tool.name} {tool.model ? `(${tool.model}) ` : ""}({tool.serialNumber})</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto pr-2 p-1">
                    <div className="space-y-6 p-1">

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Data badania</Label>
                                <Input
                                    type="date"
                                    value={format(formData.date, 'yyyy-MM-dd')}
                                    onChange={(e) => setFormData(p => ({ ...p, date: new Date(e.target.value) }))}
                                />
                            </div>
                            <div>
                                <Label>Miejsce</Label>
                                <Input
                                    value={formData.place}
                                    onChange={(e) => setFormData(p => ({ ...p, place: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div>
                            <Label>Osoba sprawdzająca (Pomiar wykonał)</Label>
                            <Input
                                value={formData.inspectorName}
                                placeholder="Imię i Nazwisko"
                                onChange={(e) => setFormData(p => ({ ...p, inspectorName: e.target.value }))}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4 border p-4 rounded-md bg-blue-50/30">
                            <div>
                                <Label>Ważność przeglądu (miesięcy)</Label>
                                <Select
                                    value={formData.validityMonths?.toString()}
                                    onValueChange={(v) => setFormData(p => ({ ...p, validityMonths: parseInt(v) }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 24].map(m => (
                                            <SelectItem key={m} value={m.toString()}>
                                                {m} {m === 1 ? 'miesiąc' : (m < 5 ? 'miesiące' : 'miesięcy')}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Data następnego badania</Label>
                                <div className="h-10 flex items-center px-3 bg-white border rounded-md font-bold text-blue-700">
                                    {formData.nextInspectionDate ? format(formData.nextInspectionDate, 'dd.MM.yyyy') : '-'}
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-1 italic">
                                    * Obliczana automatycznie na podstawie wybranego okresu.
                                </p>
                            </div>
                        </div>

                        {/* Section 1 */}
                        <div className="border p-4 rounded-md space-y-4">
                            <h3 className="font-semibold border-b pb-2">1. Sprawdzono Stan Ogólny</h3>
                            <div className="grid gap-4">
                                <CheckItem prefix="a." label="Czy obudowa, przewód przyłączeniowy, wtyczka są nieuszkodzone" value={formData.general.a} onChange={v => handleGeneralChange('a', v)} />
                                <CheckItem prefix="b." label="Uchwyty, zaciski części roboczych są kompletne" value={formData.general.b} onChange={v => handleGeneralChange('b', v)} />
                                <CheckItem prefix="c." label="Kontrola wycieku smaru" value={formData.general.c} onChange={v => handleGeneralChange('c', v)} />
                                <CheckItem prefix="d." label="Sprawdzenie biegu jałowego" value={formData.general.d} onChange={v => handleGeneralChange('d', v)} />
                            </div>
                        </div>

                        {/* Section 2 */}
                        <div className="border p-4 rounded-md space-y-4">
                            <h3 className="font-semibold border-b pb-2">2. Demontaż i Oględziny</h3>
                            <div className="grid gap-4">
                                <CheckItem prefix="a." label="Przewód przyłączeniowy jest dobrze przymocowany i podłączony" value={formData.disassembly.a} onChange={v => handleDisassemblyChange('a', v)} />
                                <CheckItem prefix="b." label="Połączenia wewnętrzne są nieuszkodzone" value={formData.disassembly.b} onChange={v => handleDisassemblyChange('b', v)} />
                                <CheckItem prefix="c." label="Komutator i szczotki nie są zużyte" value={formData.disassembly.c} onChange={v => handleDisassemblyChange('c', v)} />
                                <CheckItem prefix="d." label="Pozostałe elementy mechaniczne nasmarowane" value={formData.disassembly.d} onChange={v => handleDisassemblyChange('d', v)} />
                            </div>
                        </div>

                        {/* Section 3 */}
                        <div className="border p-4 rounded-md space-y-4">
                            <h3 className="font-semibold border-b pb-2">3. Obwód Ochronny</h3>
                            <div className="grid gap-4">
                                <CheckItem prefix="a." label="Przewód PE jest dobrze i pewnie podpięty" value={formData.protection.a} onChange={v => handleProtectionChange('a', v)} />
                                <CheckItem prefix="b." label="Pomiar spadku napięcia (styk ochronny - obudowa)" value={formData.protection.b} onChange={v => handleProtectionChange('b', v)} />
                            </div>
                        </div>

                        {/* Footer Section */}
                        <div className="border p-4 rounded-md space-y-4">
                            <h3 className="font-semibold border-b pb-2">Podsumowanie</h3>
                            <div>
                                <Label>Ocena Końcowa (Automatyczna)</Label>
                                <Select value={formData.result} onValueChange={(val) => setFormData(p => ({ ...p, result: val }))} disabled>
                                    <SelectTrigger className="bg-muted">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="POZYTYWNA">POZYTYWNA</SelectItem>
                                        <SelectItem value="NEGATYWNA">NEGATYWNA</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground mt-1 text-red-500">
                                    * Ocena zmienia się na NEGATYWNA, jeśli którykolwiek punkt jest NEGATYWNY.
                                </p>
                            </div>
                            <div>
                                <Label>Uwagi / Warunki pomiarów</Label>
                                <Textarea
                                    value={formData.comments}
                                    onChange={(e) => setFormData(p => ({ ...p, comments: e.target.value }))}
                                    placeholder="Wpisz dodatkowe uwagi..."
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="mt-4 border-t pt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Anuluj</Button>
                    <Button onClick={handleSubmit}>Generuj Protokół</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog >
    );
}
