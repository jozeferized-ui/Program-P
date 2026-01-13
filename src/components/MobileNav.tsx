'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    LayoutDashboard, Users, Briefcase, Settings, Calendar, Truck,
    PieChart, PackageOpen, History, Trash2, FileText, Warehouse,
    Menu, X
} from 'lucide-react';
import { ModeToggle } from '@/components/mode-toggle';
import { NotificationBell } from '@/components/NotificationBell';

const sidebarItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
    { icon: PieChart, label: 'Finanse', href: '/finances' },
    { icon: Users, label: 'Klienci', href: '/clients' },
    { icon: Briefcase, label: 'Projekty', href: '/projects' },
    { icon: PackageOpen, label: 'Produkcja', href: '/production' },
    { icon: LayoutDashboard, label: 'Zarządzanie', href: '/management' },
    { icon: History, label: 'Historia', href: '/history' },
    { icon: Truck, label: 'Dostawcy', href: '/suppliers' },
    { icon: Warehouse, label: 'Magazyn', href: '/warehouse' },
    { icon: FileText, label: 'Dokumenty', href: '/documents' },
    { icon: Calendar, label: 'Kalendarz', href: '/calendar' },
    { icon: Trash2, label: 'Kosz', href: '/trash' },
    { icon: Settings, label: 'Ustawienia', href: '/settings' },
];

// Bottom nav items (subset of most used)
const bottomNavItems = [
    { icon: LayoutDashboard, label: 'Home', href: '/' },
    { icon: Briefcase, label: 'Projekty', href: '/projects' },
    { icon: PieChart, label: 'Finanse', href: '/finances' },
    { icon: Calendar, label: 'Kalendarz', href: '/calendar' },
];

export function MobileHeader() {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    return (
        <header className="lg:hidden fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
            {/* Hamburger Menu */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                    <button className="p-2 -ml-2 hover:bg-accent rounded-lg transition-colors">
                        <Menu className="h-6 w-6" />
                    </button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] p-0">
                    <SheetHeader className="p-4 border-b">
                        <SheetTitle className="flex items-center gap-2">
                            <Briefcase className="h-6 w-6" />
                            Project Manager
                        </SheetTitle>
                    </SheetHeader>
                    <ScrollArea className="h-[calc(100vh-120px)]">
                        <nav className="grid gap-1 p-4">
                            {sidebarItems.map((item, index) => {
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={index}
                                        href={item.href}
                                        onClick={() => setIsOpen(false)}
                                        className={cn(
                                            "flex items-center gap-3 rounded-lg px-3 py-3 transition-all",
                                            isActive
                                                ? "bg-primary/10 text-primary font-medium"
                                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                        )}
                                    >
                                        {isActive && (
                                            <span className="absolute left-0 h-8 w-1 rounded-r-full bg-primary" />
                                        )}
                                        <item.icon className="h-5 w-5" />
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </nav>
                    </ScrollArea>
                    <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Motyw</span>
                            <ModeToggle />
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 font-semibold">
                <Briefcase className="h-5 w-5" />
                <span>Project Manager</span>
            </Link>

            {/* Notifications */}
            <NotificationBell />
        </header>
    );
}

export function MobileBottomNav() {
    const pathname = usePathname();

    return (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-2 pb-safe">
            {bottomNavItems.map((item, index) => {
                const isActive = pathname === item.href;
                return (
                    <Link
                        key={index}
                        href={item.href}
                        className={cn(
                            "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all min-w-[60px]",
                            isActive
                                ? "text-primary"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <item.icon className={cn(
                            "h-5 w-5 transition-transform",
                            isActive && "scale-110"
                        )} />
                        <span className={cn(
                            "text-[10px] font-medium",
                            isActive && "font-semibold"
                        )}>
                            {item.label}
                        </span>
                        {isActive && (
                            <span className="absolute bottom-1 h-1 w-8 rounded-full bg-primary" />
                        )}
                    </Link>
                );
            })}

            {/* More menu trigger */}
            <Sheet>
                <SheetTrigger asChild>
                    <button className="flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground transition-all min-w-[60px]">
                        <Menu className="h-5 w-5" />
                        <span className="text-[10px] font-medium">Więcej</span>
                    </button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[60vh] rounded-t-xl">
                    <SheetHeader className="pb-4">
                        <SheetTitle>Menu</SheetTitle>
                    </SheetHeader>
                    <ScrollArea className="h-full">
                        <nav className="grid grid-cols-3 gap-3 p-2">
                            {sidebarItems.map((item, index) => {
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={index}
                                        href={item.href}
                                        className={cn(
                                            "flex flex-col items-center justify-center gap-2 p-4 rounded-xl transition-all",
                                            isActive
                                                ? "bg-primary/10 text-primary"
                                                : "bg-muted/50 text-muted-foreground hover:bg-accent"
                                        )}
                                    >
                                        <item.icon className="h-6 w-6" />
                                        <span className="text-xs font-medium text-center">{item.label}</span>
                                    </Link>
                                );
                            })}
                        </nav>
                    </ScrollArea>
                </SheetContent>
            </Sheet>
        </nav>
    );
}
