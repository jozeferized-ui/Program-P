import { Sidebar } from "@/components/Sidebar";
import { MobileHeader, MobileBottomNav } from "@/components/MobileNav";

export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen w-full bg-background overflow-hidden">
            {/* Desktop Sidebar */}
            <Sidebar />

            {/* Mobile Header */}
            <MobileHeader />

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-auto p-2 pt-16 pb-16 lg:p-3 lg:pt-3 lg:pb-3 compact-text">
                <div className="flex-1 flex flex-col min-h-0 overflow-auto">
                    {children}
                </div>
            </main>

            {/* Mobile Bottom Nav */}
            <MobileBottomNav />
        </div>
    );
}
