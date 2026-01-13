"use client";

import { Tool, Employee } from "@/types";
import { EmployeesManager } from "./EmployeesManager";
import { ToolsManager } from "./ToolsManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ManagementTabsProps {
    initialEmployees: Employee[];
    initialTools: Tool[];
}

export function ManagementTabs({ initialEmployees, initialTools }: ManagementTabsProps) {
    return (
        <Tabs defaultValue="employees" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
                <TabsTrigger value="employees">Pracownicy</TabsTrigger>
                <TabsTrigger value="tools">Narzędzia</TabsTrigger>
            </TabsList>
            <TabsContent value="employees">
                <EmployeesManager initialEmployees={initialEmployees} />
            </TabsContent>
            <TabsContent value="tools">
                <ToolsManager initialTools={initialTools} initialEmployees={initialEmployees} />
            </TabsContent>
        </Tabs>
    );
}
