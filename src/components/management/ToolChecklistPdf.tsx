import { Tool, Employee } from "@/types";
import { format } from "date-fns";

interface ToolChecklistPdfProps {
    tools: Tool[]; // Can be one or many
    employee?: Employee; // The person responsible
    date?: Date;
}

export function ToolChecklistPdf({ tools, employee, date = new Date() }: ToolChecklistPdfProps) {
    return (
        <div className="w-full max-w-[210mm] mx-auto p-8 font-sans text-black bg-white">
            <div className="mb-8 border-b pb-4">
                <h1 className="text-2xl font-bold uppercase mb-2">Protokół Przekazania / Inwentaryzacja Narzędzi</h1>
                <div className="flex justify-between text-sm mt-4">
                    <div>
                        <p className="font-semibold">Pracownik (Odpowiedzialny):</p>
                        <p className="text-lg">{employee ? `${employee.firstName} ${employee.lastName}` : "________________________"}</p>
                    </div>
                    <div className="text-right">
                        <p className="font-semibold">Data:</p>
                        <p>{format(date, "dd.MM.yyyy")}</p>
                    </div>
                </div>
            </div>

            <table className="w-full text-left border-collapse mb-8">
                <thead>
                    <tr className="border-b-2 border-black">
                        <th className="py-2 px-1 w-10 text-center">Lp.</th>
                        <th className="py-2 px-2">Nazwa Narzędzia</th>
                        <th className="py-2 px-2">Marka / Model</th>
                        <th className="py-2 px-2">Nr Seryjny</th>
                        <th className="py-2 px-2">Status Przeglądu</th>
                        <th className="py-2 px-2 text-center w-24">Stan [ ]</th>
                    </tr>
                </thead>
                <tbody>
                    {tools.map((tool, index) => {
                        const expiry = tool.inspectionExpiryDate ? new Date(tool.inspectionExpiryDate) : null;
                        const isExpired = expiry && expiry < new Date();

                        return (
                            <tr key={index} className="border-b border-gray-300">
                                <td className="py-3 px-1 text-center">{index + 1}</td>
                                <td className="py-3 px-2 font-semibold">{tool.name}</td>
                                <td className="py-3 px-2">{tool.brand}{tool.model ? ` / ${tool.model}` : ""}</td>
                                <td className="py-3 px-2 font-mono text-sm">{tool.serialNumber}</td>
                                <td className="py-3 px-2 text-sm">
                                    {expiry ? (
                                        <span className={isExpired ? "font-bold text-red-600" : ""}>
                                            {format(expiry, "dd.MM.yyyy")}
                                            {isExpired ? " (!)" : ""}
                                        </span>
                                    ) : "-"}
                                </td>
                                <td className="py-3 px-2 text-center">
                                    <div className="w-6 h-6 border-2 border-black mx-auto"></div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            <div className="mt-12 grid grid-cols-2 gap-16">
                <div>
                    <p className="text-sm font-semibold mb-8 border-t pt-2">Podpis Przekazującego (Kierownik)</p>
                </div>
                <div>
                    <p className="text-sm font-semibold mb-8 border-t pt-2">Podpis Odbierającego (Pracownik)</p>
                    <p className="text-xs text-gray-500">
                        Potwierdzam odbiór w/w narzędzi i przyjmuję za nie odpowiedzialność materialną.
                        Zobowiązuję się do dbania o powierzony sprzęt.
                    </p>
                </div>
            </div>

            <div className="fixed bottom-4 right-4 print:hidden">
                <p className="text-sm text-gray-500">Naciśnij Ctrl+P / Cmd+P aby wydrukować</p>
            </div>
        </div>
    );
}
