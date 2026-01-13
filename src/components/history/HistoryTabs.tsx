import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PriceHistory } from "./PriceHistory";
import { ActivityLogs } from "./ActivityLogs";
import { ProjectArchive } from "./ProjectArchive";
import { TaskArchive } from "./TaskArchive";
import { Reports } from "./Reports";
import { EmptyPage1 } from "./EmptyPage1";
import { EmptyPage2 } from "./EmptyPage2";
import { EmptyPage3 } from "./EmptyPage3";
import { EmptyPage4 } from "./EmptyPage4";

export function HistoryTabs() {
    return (
        <Tabs defaultValue="price-history" className="space-y-4">
            <TabsList>
                <TabsTrigger value="price-history">Historia cen</TabsTrigger>
                <TabsTrigger value="activity-logs">Logi aktywności</TabsTrigger>
                <TabsTrigger value="project-archive">Archiwum projektów</TabsTrigger>
                <TabsTrigger value="task-archive">Archiwum zadań</TabsTrigger>
                <TabsTrigger value="reports">Raporty</TabsTrigger>
                <TabsTrigger value="empty-1">Strona 1</TabsTrigger>
                <TabsTrigger value="empty-2">Strona 2</TabsTrigger>
                <TabsTrigger value="empty-3">Strona 3</TabsTrigger>
                <TabsTrigger value="empty-4">Strona 4</TabsTrigger>
            </TabsList>
            <TabsContent value="price-history">
                <PriceHistory />
            </TabsContent>
            <TabsContent value="activity-logs">
                <ActivityLogs />
            </TabsContent>
            <TabsContent value="project-archive">
                <ProjectArchive />
            </TabsContent>
            <TabsContent value="task-archive">
                <TaskArchive />
            </TabsContent>
            <TabsContent value="reports">
                <Reports />
            </TabsContent>
            <TabsContent value="empty-1">
                <EmptyPage1 />
            </TabsContent>
            <TabsContent value="empty-2">
                <EmptyPage2 />
            </TabsContent>
            <TabsContent value="empty-3">
                <EmptyPage3 />
            </TabsContent>
            <TabsContent value="empty-4">
                <EmptyPage4 />
            </TabsContent>
        </Tabs>
    );
}
