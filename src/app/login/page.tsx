'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { verifyPin } from '@/actions/auth';
import { ShieldCheck, Delete, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function LoginPage() {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [isPending, setIsPending] = useState(false);
    const router = useRouter();

    const handleNumberClick = (num: string) => {
        if (pin.length < 6) {
            setPin(prev => prev + num);
            setError('');
        }
    };

    const handleDelete = () => {
        setPin(prev => prev.slice(0, -1));
        setError('');
    };

    useEffect(() => {
        if (pin.length >= 4) {
            handleVerify();
        }
    }, [pin]);

    const handleVerify = async () => {
        if (isPending) return;

        setIsPending(true);
        const result = await verifyPin(pin);

        if (result.success) {
            toast.success('Zalogowano pomyślnie');
            router.push('/');
            router.refresh();
        } else {
            setError(result.error || 'Błąd logowania');
            setPin('');
            toast.error(result.error || 'Nieprawidłowy PIN');
        }
        setIsPending(false);
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans antialiased text-white selection:bg-primary/30">
            {/* Background elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
            </div>

            <div className="max-w-md w-full relative z-10">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-slate-800/80 border border-slate-700 mb-6 shadow-2xl relative group">
                        <Lock className="w-8 h-8 text-primary transition-transform group-hover:scale-110" />
                        {isPending && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Loader2 className="w-10 h-10 text-primary animate-spin opacity-50" />
                            </div>
                        )}
                    </div>
                    <h1 className="text-4xl font-black tracking-tighter uppercase mb-2">Panel Dostępu</h1>
                    <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px]">Wprowadź kod PIN aby kontynuować</p>
                </div>

                {/* PIN Display */}
                <div className="flex justify-center gap-4 mb-12">
                    {[0, 1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className={cn(
                                "w-4 h-4 rounded-full transition-all duration-300",
                                pin.length > i ? "bg-primary scale-125 shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]" : "bg-slate-700 scale-100"
                            )}
                        />
                    ))}
                </div>

                {/* Keyboard Grid */}
                <div className="grid grid-cols-3 gap-4 max-w-[320px] mx-auto">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                        <button
                            key={num}
                            onClick={() => handleNumberClick(num)}
                            disabled={isPending}
                            className="h-20 rounded-3xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700/50 hover:border-slate-600 active:scale-90 transition-all text-2xl font-black disabled:opacity-50"
                        >
                            {num}
                        </button>
                    ))}
                    <div className="h-20" />
                    <button
                        onClick={() => handleNumberClick('0')}
                        disabled={isPending}
                        className="h-20 rounded-3xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700/50 active:scale-90 transition-all text-2xl font-black disabled:opacity-50"
                    >
                        0
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={isPending}
                        className="h-20 rounded-3xl bg-slate-800/50 border border-slate-700/50 hover:bg-rose-500/20 hover:border-rose-500/50 active:scale-90 transition-all flex items-center justify-center disabled:opacity-50"
                    >
                        <Delete className="w-6 h-6 text-rose-400" />
                    </button>
                </div>

                {error && (
                    <div className="mt-8 flex items-center justify-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider animate-bounce">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </div>
                )}

                <div className="mt-16 text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600">
                        System Zarządzania Zasobami v2.0
                    </p>
                </div>
            </div>
        </div>
    );
}
