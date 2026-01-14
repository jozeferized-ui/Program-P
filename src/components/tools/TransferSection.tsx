'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, LogIn, ArrowRight, Check, LogOut, User } from 'lucide-react';
import { authenticateForToolTransfer, transferTool, getEmployeesForTransfer, logoutToolTransfer } from '@/actions/toolTransfer';
import { toast } from 'sonner';

interface TransferSectionProps {
    toolId: number;
    currentAssignee?: string;
    currentTransferredTo?: { firstName: string; lastName: string } | null;
}

interface Employee {
    id: number;
    firstName: string;
    lastName: string;
}

export function TransferSection({ toolId, currentAssignee, currentTransferredTo }: TransferSectionProps) {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [user, setUser] = useState<{ firstName: string; lastName: string } | null>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
    const [notes, setNotes] = useState('');
    const [transferSuccess, setTransferSuccess] = useState(false);

    // Load employees on mount
    useEffect(() => {
        async function loadEmployees() {
            const result = await getEmployeesForTransfer();
            if (result.success && result.employees) {
                setEmployees(result.employees);
            }
        }
        loadEmployees();
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const result = await authenticateForToolTransfer(email, password, toolId);

        if (result.success && result.user) {
            setIsLoggedIn(true);
            setUser(result.user);
            toast.success('Zalogowano pomyślnie');
        } else {
            toast.error(result.error || 'Błąd logowania');
        }

        setIsLoading(false);
    };

    const handleTransfer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEmployeeId) {
            toast.error('Wybierz osobę');
            return;
        }

        setIsLoading(true);

        const result = await transferTool(toolId, parseInt(selectedEmployeeId), notes || undefined);

        if (result.success) {
            setTransferSuccess(true);
            toast.success('Narzędzie przekazane!');
            // Refresh page after short delay
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } else {
            toast.error(result.error || 'Błąd przekazania');
        }

        setIsLoading(false);
    };

    const handleLogout = async () => {
        await logoutToolTransfer();
        setIsLoggedIn(false);
        setUser(null);
        setEmail('');
        setPassword('');
    };

    // Success state
    if (transferSuccess) {
        return (
            <Card className="bg-emerald-50 border-emerald-200 shadow-lg rounded-2xl">
                <CardContent className="p-6 text-center">
                    <div className="mx-auto bg-emerald-500 text-white p-4 rounded-full w-fit mb-4">
                        <Check className="w-8 h-8" />
                    </div>
                    <p className="text-lg font-bold text-emerald-900">Narzędzie przekazane!</p>
                    <p className="text-sm text-emerald-700 mt-1">Strona zostanie odświeżona...</p>
                </CardContent>
            </Card>
        );
    }

    // Logged in - show transfer form
    if (isLoggedIn && user) {
        return (
            <Card className="bg-blue-50 border-blue-200 shadow-lg rounded-2xl">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-blue-800">
                            <User className="w-5 h-5" />
                            <span className="font-bold">{user.firstName} {user.lastName}</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-blue-600 hover:text-blue-800">
                            <LogOut className="w-4 h-4 mr-1" /> Wyloguj
                        </Button>
                    </div>
                    <CardTitle className="text-lg font-bold text-blue-900">Przekaż narzędzie</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleTransfer} className="space-y-4">
                        <div>
                            <Label htmlFor="employee" className="text-blue-800 font-semibold">Przekaż do:</Label>
                            <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                                <SelectTrigger className="bg-white border-blue-200 mt-1">
                                    <SelectValue placeholder="Wybierz pracownika" />
                                </SelectTrigger>
                                <SelectContent>
                                    {employees.map(emp => (
                                        <SelectItem key={emp.id} value={emp.id.toString()}>
                                            {emp.firstName} {emp.lastName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="notes" className="text-blue-800 font-semibold">Notatka (opcjonalna)</Label>
                            <Textarea
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="np. Na budowę przy ul. Lipowej"
                                className="bg-white border-blue-200 mt-1"
                                rows={2}
                            />
                        </div>
                        <Button
                            type="submit"
                            disabled={isLoading || !selectedEmployeeId}
                            className="w-full bg-blue-600 hover:bg-blue-700 font-bold py-6 rounded-xl"
                        >
                            {isLoading ? 'Przekazywanie...' : (
                                <>
                                    <ArrowRight className="w-5 h-5 mr-2" />
                                    Przekaż narzędzie
                                </>
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        );
    }

    // Not logged in - show login form
    return (
        <Card className="bg-slate-100 border-slate-200 shadow-lg rounded-2xl">
            <CardHeader className="pb-2">
                <div className="flex items-center gap-2 text-slate-600">
                    <Lock className="w-5 h-5" />
                    <CardTitle className="text-lg font-bold">Zaloguj się aby przekazać</CardTitle>
                </div>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <Label htmlFor="email" className="text-slate-700 font-semibold">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="twoj@email.pl"
                            className="bg-white mt-1"
                            required
                        />
                    </div>
                    <div>
                        <Label htmlFor="password" className="text-slate-700 font-semibold">Hasło</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••"
                            className="bg-white mt-1"
                            required
                        />
                    </div>
                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-primary hover:bg-primary/90 font-bold py-6 rounded-xl"
                    >
                        {isLoading ? 'Logowanie...' : (
                            <>
                                <LogIn className="w-5 h-5 mr-2" />
                                Zaloguj się
                            </>
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
