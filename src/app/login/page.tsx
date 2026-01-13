'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginUser } from '@/actions/users';
import { Lock, Mail, KeyRound, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isPending, setIsPending] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isPending) return;

        setIsPending(true);
        setError('');

        const result = await loginUser(email, password);

        if (result.success) {
            toast.success(`Witaj, ${result.user?.firstName}!`);
            router.push('/');
            router.refresh();
        } else {
            setError(result.error || 'Błąd logowania');
            toast.error(result.error || 'Nieprawidłowe dane logowania');
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
                    <h1 className="text-4xl font-black tracking-tighter uppercase mb-2">Logowanie</h1>
                    <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px]">Wprowadź dane aby kontynuować</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Email Field */}
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isPending}
                            required
                            className="w-full h-14 pl-12 pr-4 rounded-2xl bg-slate-800/50 border border-slate-700/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-white placeholder:text-slate-500 disabled:opacity-50"
                        />
                    </div>

                    {/* Password Field */}
                    <div className="relative">
                        <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Hasło"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isPending}
                            required
                            className="w-full h-14 pl-12 pr-12 rounded-2xl bg-slate-800/50 border border-slate-700/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-white placeholder:text-slate-500 disabled:opacity-50"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                        >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="flex items-center justify-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider animate-pulse">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isPending || !email || !password}
                        className={cn(
                            "w-full h-14 rounded-2xl font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2",
                            isPending || !email || !password
                                ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                                : "bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 hover:shadow-primary/40"
                        )}
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Logowanie...
                            </>
                        ) : (
                            'Zaloguj się'
                        )}
                    </button>
                </form>

                <div className="mt-16 text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600">
                        System Zarządzania Zasobami v3.0
                    </p>
                </div>
            </div>
        </div>
    );
}
